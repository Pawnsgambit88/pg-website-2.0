"""Transactional email: registration confirmation, waitlist offer, password reset (contract 5.5).

Confirmation and offer mail is queued (`TransactionalEmail`) inside the transaction that caused it, so it exists only if
the change committed, and a repeated trigger is a no-op (`dedupe_key`). One delivery attempt is made right after commit;
the worker retries failures. Password reset is sent directly (its link holds a one-time secret, which is never stored in
the queue), on a background thread so the response time does not reveal whether the account exists.

Call the `queue_*` functions inside `transaction.atomic()` with a registration whose `event` and `user` are loadable.
They never raise for a delivery problem: a failure to queue is logged and the business change still succeeds.
"""
from __future__ import annotations

import logging
import threading

from django.conf import settings
from django.db import IntegrityError, connection, transaction
from django.utils import timezone

from . import conf, templates
from .adapters import EmailSendError, OutgoingEmail, get_adapter
from .delivery import kick_transactional
from .models import TransactionalEmail

logger = logging.getLogger('pg.comms')


def _when(value) -> str:
    return timezone.localtime(value).strftime('%a %d %b %Y, %I:%M %p') if value else ''


def _event_context(event) -> dict:
    return {'event_title': event.title, 'event_start': _when(event.starts_at),
            'event_venue': ', '.join(p for p in (event.venue_name, event.area) if p) or 'To be confirmed',
            'event_url': f'{settings.FRONTEND_URL}/events/{event.slug}'}


def _queue(template: str, dedupe_key: str, user, context: dict) -> None:
    try:
        with transaction.atomic():  # savepoint: a duplicate trigger must not poison the caller's transaction
            row = TransactionalEmail.objects.create(
                template=template, dedupe_key=dedupe_key[:120], user=user, context=context,
                next_attempt_at=timezone.now())
    except IntegrityError:
        return  # already queued for this trigger
    except Exception as exc:
        logger.error('txmail_queue_failed template=%s exc=%s', template, type(exc).__name__)
        return
    kick_transactional(row.pk)


def queue_registration_confirmation(registration) -> None:
    """The place is confirmed (free reserve, accepted free offer, or captured payment). Honours the event's
    `confirmation` trigger (C15) and the global email switch."""
    event = registration.event
    if not conf.trigger_enabled(event, 'confirmation'):
        return
    _queue('registration_confirmation', str(registration.pk), registration.user, _event_context(event))


def queue_waitlist_offer(registration) -> None:
    """A waitlisted player was offered a place. Not a C15 trigger: it is the transactional offer notice."""
    if not conf.email_enabled():
        return
    event = registration.event
    context = {**_event_context(event), 'offer_expires': _when(registration.offer_expires_at)}
    key = f'{registration.pk}:{int(registration.offer_expires_at.timestamp()) if registration.offer_expires_at else 0}'
    _queue('waitlist_offer', key, registration.user, context)


TRIGGER_TEMPLATES = {'reminder_24h': 'event_reminder', 'checkin_open': 'checkin_open', 'post_event': 'post_event'}


def queue_event_trigger(event, trigger: str, registrations) -> int:
    """Scheduler entry (BE-12): queue one `trigger` mail per registration. Honours the event's C15 toggle and the global
    email switch. Idempotent: `(template, dedupe_key=registration id)` is unique, so a repeat creates nothing. Rows are
    delivered by the worker (no immediate send). Returns the number of NEW rows."""
    if trigger not in TRIGGER_TEMPLATES or not conf.trigger_enabled(event, trigger):
        return 0
    template = TRIGGER_TEMPLATES[trigger]
    context = _event_context(event)
    now = timezone.now()
    keys = [str(r.pk) for r in registrations]
    if not keys:
        return 0
    existing = set(TransactionalEmail.objects.filter(template=template, dedupe_key__in=keys)
                   .values_list('dedupe_key', flat=True))
    rows = [TransactionalEmail(template=template, dedupe_key=str(r.pk), user=r.user, context=context,
                               next_attempt_at=now)
            for r in registrations if str(r.pk) not in existing]
    TransactionalEmail.objects.bulk_create(rows, ignore_conflicts=True)  # a racing scheduler loses harmlessly
    return len(rows)


def queue_pairing_notices(event, round_no: int, round_id, pairing_version: int, notices, *, correction: bool) -> int:
    """`pairing_published` (PLAN-004 TASK-001): one row per affected player of a published round, or of a correction to
    a published or live round. `notices` is a list of (user, registration id, seat text). The dedupe key is round,
    pairing version and registration, so each pairing version notifies once and a repeat is a no-op. Honours the
    event's `pairing_published` toggle and the global email switch. Rows are delivered by the worker (no immediate
    send), so the insert must happen inside the transaction that changed the pairing. Returns rows offered to insert."""
    if not notices or not conf.trigger_enabled(event, 'pairing_published'):
        return 0
    headline = f'Round {round_no} pairing updated' if correction else f'Round {round_no} pairing'
    base = {**_event_context(event), 'round_no': round_no, 'headline': headline}
    now = timezone.now()
    rows = [TransactionalEmail(template='pairing_published', dedupe_key=f'{round_id}:{pairing_version}:{reg_id}'[:120],
                               user=user, context={**base, 'seat': seat}, next_attempt_at=now)
            for user, reg_id, seat in notices]
    TransactionalEmail.objects.bulk_create(rows, ignore_conflicts=True)
    return len(rows)


def send_password_reset(email: str, name: str, link: str) -> None:
    """Direct send (no queue: the link is a secret). Raises nothing; logs the failure class only."""
    try:
        subject, body = templates.render('password_reset', {
            'name': name or 'there', 'reset_link': link, 'site_name': conf.site_name()})
        get_adapter().send(OutgoingEmail(to=email, subject=subject, body=body, from_name=conf.sender_name()))
    except EmailSendError as exc:
        logger.error('reset_email_failed code=%s', exc.code)
    except Exception as exc:
        logger.error('reset_email_failed type=%s', type(exc).__name__)


def send_password_reset_async(email: str, name: str, link: str) -> None:
    def run():
        try:
            send_password_reset(email, name, link)
        finally:
            connection.close()
    threading.Thread(target=run, daemon=True).start()
