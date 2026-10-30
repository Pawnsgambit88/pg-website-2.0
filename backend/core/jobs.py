"""Scheduler/worker job bodies that do not belong to one app (BE-12), plus the shared loop runner.

Every job is idempotent (running it twice changes nothing the second time), takes row locks or relies on unique
constraints for concurrency, and logs the job name and counts only (never names, addresses or tokens).
Each job is also a management command for manual runs (see `core/management/commands`).
"""
from __future__ import annotations

import logging
import time
from datetime import timedelta

from django.core.management import call_command
from django.db import close_old_connections, transaction
from django.utils import timezone

logger = logging.getLogger('pg.jobs')


# ---------------------------------------------------------------- loop runner

def run_loop(jobs, *, once=False, only=None, log=logger, sleep=time.sleep) -> None:
    """Run `(command, interval_seconds)` jobs. `once` runs each (or the `only` job) one time and exits. A failing job
    is logged and retried at its next interval; it never stops the loop."""
    names = {name for name, _ in jobs}
    if only is not None and only not in names:
        raise ValueError('unknown job')
    selected = [(n, i) for n, i in jobs if only in (None, n)]
    next_run = {name: 0.0 for name, _ in selected}
    while True:
        now = time.monotonic()
        for name, interval in selected:
            if now < next_run[name]:
                continue
            next_run[name] = now + interval
            close_old_connections()
            try:
                call_command(name)
                log.info('job=%s ok', name)
            except Exception:
                log.exception('job=%s failed', name)
        if once:
            return
        sleep(1)


# ---------------------------------------------------------------- event status transitions

AUTO_SUMMARY = 'Automatic status change'


def transition_event_status(now=None) -> dict:
    """Move events forward by the clock (replaces any write-on-GET; reads never change status).

    * `published` -> `registration_open` once `registration_opens_at` has passed (and the event has not started);
    * `published | registration_open | sold_out` -> `ongoing` once `starts_at` has passed.

    `ongoing -> completed` and `cancelled` stay admin actions (completion needs recap and standings). `sold_out` is
    not toggled here: availability is derived from capacity at read time. Each event is changed under its row lock
    through `Event.save()` so the version bump and the revalidation outbox row commit with it. One bad event never stops
    the run."""
    from content.models import Event
    from registrations.services import lock_event

    now = now or timezone.now()
    opened = started = failed = 0
    start_ids = list(Event.objects.filter(status__in=['published', 'registration_open', 'sold_out'],
                                          starts_at__lte=now).values_list('pk', flat=True))
    open_ids = list(Event.objects.filter(status='published', registration_opens_at__lte=now)
                    .exclude(pk__in=start_ids).values_list('pk', flat=True))
    for target, ids, allowed in (('ongoing', start_ids, ('published', 'registration_open', 'sold_out')),
                                 ('registration_open', open_ids, ('published',))):
        for pk in ids:
            try:
                with transaction.atomic():
                    event = lock_event(pk)
                    if event.status not in allowed:
                        continue  # another run or an admin got there first
                    if target == 'ongoing' and not (event.starts_at and event.starts_at <= now):
                        continue
                    if target == 'registration_open' and not (event.registration_opens_at
                                                               and event.registration_opens_at <= now):
                        continue
                    event.status = target
                    event.updated_by = None
                    event.last_change_summary = AUTO_SUMMARY
                    event.save()
                if target == 'ongoing':
                    started += 1
                else:
                    opened += 1
            except Exception as exc:
                failed += 1
                logger.error('event_transition_failed target=%s exc=%s', target, type(exc).__name__)
    logger.info('job=transition_event_status opened=%d started=%d failed=%d', opened, started, failed)
    return {'opened': opened, 'started': started, 'failed': failed}


# ---------------------------------------------------------------- reminders

POST_EVENT_DAYS = 3  # a post-event note is only sent this long after the event (no blast for old events on deploy)
BATCH_EVENTS = 200


def send_event_triggers(now=None) -> dict:
    """Queue state-triggered mail through comms (delivered by the worker). Each trigger honours
    `comms.conf.trigger_enabled(event, trigger)` (per-event C15 toggle and the global email switch) and is deduplicated
    by `(template, registration id)`, so re-running never mails a player twice.

    * `reminder_24h`: `comms.conf.reminder_hours_before()` hours before the start (confirmed players);
    * `checkin_open`: from `CHECKIN_OPENS_MINUTES_BEFORE` before the start until check-in closes (confirmed players);
    * `post_event`: completed events, for players who checked in, within POST_EVENT_DAYS of the end."""
    from comms import conf, transactional
    from content.models import Event
    from registrations import conf as reg_conf
    from registrations.models import Registration

    now = now or timezone.now()
    counts = {'reminder_24h': 0, 'checkin_open': 0, 'post_event': 0}

    def confirmed(event, **extra):
        return list(Registration.objects.filter(event=event, status='confirmed', user__status='active', **extra)
                    .select_related('user'))

    live = ('published', 'registration_open', 'sold_out', 'ongoing')
    lead = timedelta(hours=conf.reminder_hours_before())
    for event in Event.objects.filter(status__in=live, starts_at__gt=now, starts_at__lte=now + lead)[:BATCH_EVENTS]:
        counts['reminder_24h'] += transactional.queue_event_trigger(event, 'reminder_24h', confirmed(event))

    opens = timedelta(minutes=reg_conf.checkin_opens_minutes_before())
    closes = timedelta(minutes=reg_conf.checkin_closes_minutes_after())
    for event in Event.objects.filter(status__in=live, starts_at__lte=now + opens,
                                      starts_at__gte=now - closes)[:BATCH_EVENTS]:
        counts['checkin_open'] += transactional.queue_event_trigger(event, 'checkin_open', confirmed(event))

    since = now - timedelta(days=POST_EVENT_DAYS)
    for event in Event.objects.filter(status='completed', starts_at__gte=since - timedelta(days=1))[:BATCH_EVENTS]:
        end = event.ends_at or event.starts_at
        if end is None or not (since <= end <= now):
            continue
        counts['post_event'] += transactional.queue_event_trigger(
            event, 'post_event', confirmed(event, checked_in_at__isnull=False))

    logger.info('job=send_event_reminders reminder=%d checkin_open=%d post_event=%d',
                counts['reminder_24h'], counts['checkin_open'], counts['post_event'])
    return counts


# ---------------------------------------------------------------- daily cleanup

BATCH_DELETE = 1000
GRACE = timedelta(hours=1)
IDEMPOTENCY_RETENTION = timedelta(hours=48)  # contract 2.5: kept at least 24 h
TOKEN_RETENTION = timedelta(days=1)
RATE_LIMIT_RETENTION_SECONDS = 2 * 3600


def _purge(queryset) -> int:
    """Delete in bounded batches. Re-evaluating the queryset each pass makes it safe to repeat or interrupt."""
    total = 0
    model = queryset.model
    while True:
        ids = list(queryset.values_list('pk', flat=True)[:BATCH_DELETE])
        if not ids:
            return total
        model.objects.filter(pk__in=ids).delete()
        total += len(ids)


def cleanup_expired(now=None) -> dict:
    """Delete expired auth/step-up/reset tokens, idempotency records, rate-limit hits, preview grants and stale
    pending uploads (and their stored objects). A stored object that cannot be deleted keeps its row for the next run."""
    from accounts.models import AuthFamily, PasswordResetToken, StepUpGrant
    from content.models import MediaAsset, MediaUpload, PreviewGrant
    from content.storage import StorageError, get_storage
    from core.models import IdempotencyRecord, RateLimitHit

    now = now or timezone.now()
    counts = {
        'auth_families': _purge(AuthFamily.objects.filter(expires_at__lt=now - TOKEN_RETENTION)),
        'reset_tokens': _purge(PasswordResetToken.objects.filter(expires_at__lt=now - TOKEN_RETENTION)),
        'step_up_grants': _purge(StepUpGrant.objects.filter(expires_at__lt=now - TOKEN_RETENTION)),
        'idempotency_keys': _purge(IdempotencyRecord.objects.filter(created_at__lt=now - IDEMPOTENCY_RETENTION)),
        'rate_limit_hits': _purge(RateLimitHit.objects.filter(
            at__lt=now - timedelta(seconds=RATE_LIMIT_RETENTION_SECONDS))),
        'preview_grants': _purge(PreviewGrant.objects.filter(expires_at__lt=now - GRACE)),
    }

    removed = errors = 0
    storage = None
    for upload in MediaUpload.objects.filter(expires_at__lt=now - GRACE).order_by('expires_at')[:BATCH_DELETE]:
        in_use = MediaAsset.objects.filter(storage_key=upload.storage_key).exists() or \
            MediaAsset.objects.filter(pk=upload.pk).exists()
        if not in_use:
            try:
                storage = storage or get_storage()
                storage.delete(upload.storage_key)
            except StorageError:
                errors += 1
                continue
        MediaUpload.objects.filter(pk=upload.pk).delete()  # an asset owns the object when in_use: only drop the row
        removed += 1
    counts.update(media_uploads=removed, media_upload_errors=errors)

    logger.info('job=cleanup_expired %s', ' '.join(f'{k}={v}' for k, v in counts.items()))
    return counts
