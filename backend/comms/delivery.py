"""Delivery functions the worker calls (BE-12 wires them to the scheduler; nothing here schedules itself).

    from comms.delivery import run_all
    run_all(limit=50)  # -> {'messages_resolved': n, 'deliveries_sent': n, ...}

or `python manage.py deliver_messages [--limit N]`.

Every step is idempotent and safe to run from two workers at once: rows are claimed with `SELECT ... FOR UPDATE SKIP
LOCKED` and leased (`next_attempt_at` pushed forward, attempt counted) BEFORE the provider is called, so a crash
mid-send costs one retry, never a duplicate send loop. Retries use exponential backoff up to MAX_ATTEMPTS; a permanent
rejection fails at once. Logs carry job name and counts only: never addresses, names, subjects or bodies.

Steps: 1 resolve queued EventMessages into per-registration MessageDelivery rows; 2 send due deliveries; 3 send due
TransactionalEmail rows; 4 send due contact submissions to the configured destination.
"""
from __future__ import annotations

import logging
import threading
from datetime import timedelta

from django.db import connection, transaction
from django.db.models import Exists, OuterRef
from django.utils import timezone

from content.models import ContactMessage
from registrations.models import Registration

from . import conf, templates
from .adapters import EmailSendError, OutgoingEmail, get_adapter
from .models import EventMessage, MessageDelivery, TransactionalEmail

logger = logging.getLogger('pg.comms')

MAX_ATTEMPTS = 5
BACKOFF_SECONDS = (60, 300, 900, 3600)  # wait after failed attempt n (1-based) before attempt n + 1
LEASE_SECONDS = 120
DEFAULT_LIMIT = 50


# ---------------------------------------------------------------- audiences

def audience_registrations(event_id, audience: str):
    """Registrations (active accounts only) in an audience. `first_timers`: confirmed, and no confirmed registration at
    an earlier event (same rule as the check-in desk)."""
    base = Registration.objects.filter(event_id=event_id, user__status='active')
    if audience == 'confirmed':
        return base.filter(status='confirmed')
    if audience == 'waitlist':
        return base.filter(status__in=['waitlist', 'offer'])
    if audience == 'checked_in':
        return base.filter(status='confirmed', checked_in_at__isnull=False)
    if audience == 'first_timers':
        from content.models import Event
        starts = Event.objects.filter(pk=event_id).values_list('starts_at', flat=True).first()
        qs = base.filter(status='confirmed')
        if starts is None:
            return qs
        seen = Registration.objects.filter(user_id=OuterRef('user_id'), status='confirmed',
                                           event__starts_at__lt=starts).exclude(event_id=event_id)
        return qs.annotate(_seen=Exists(seen)).filter(_seen=False)
    raise ValueError('unknown audience')


# ---------------------------------------------------------------- shared

def _retry_or_fail(row, error: EmailSendError, failed_state: str = 'failed'):
    now = timezone.now()
    row.last_error = error.code[:60]
    if error.permanent or row.attempts >= MAX_ATTEMPTS:
        setattr(row, _STATE_FIELD[type(row)], failed_state)
    else:
        row.next_attempt_at = now + timedelta(seconds=BACKOFF_SECONDS[min(row.attempts, len(BACKOFF_SECONDS)) - 1])


_STATE_FIELD = {MessageDelivery: 'state', TransactionalEmail: 'state', ContactMessage: 'delivery_state'}


def _claim(model, *, state_field: str, queued_value: str, select=(), limit: int):
    """Lock due rows (skipping rows another worker holds), count the attempt and lease them."""
    now = timezone.now()
    with transaction.atomic():
        qs = model.objects.select_for_update(skip_locked=True, of=('self',)).filter(
            **{state_field: queued_value, 'next_attempt_at__lte': now})
        if select:
            qs = qs.select_related(*select)
        rows = list(qs.order_by('next_attempt_at', 'pk')[:limit])
        for row in rows:
            _bump(row, now)
        return rows


def _bump(row, now):
    attempts_field = 'delivery_attempts' if isinstance(row, ContactMessage) else 'attempts'
    setattr(row, attempts_field, getattr(row, attempts_field) + 1)
    row.next_attempt_at = now + timedelta(seconds=LEASE_SECONDS)
    row.save(update_fields=[attempts_field, 'next_attempt_at'])


def _send(adapter, row, outgoing: OutgoingEmail) -> bool:
    """Send one row and persist the outcome. Never raises."""
    try:
        provider_id = adapter.send(outgoing)
    except EmailSendError as error:
        _retry_or_fail(row, error)
        _save_outcome(row, sent=False)
        return False
    except Exception as exc:  # an adapter bug must not stop the batch
        logger.error('email_adapter_crash exc=%s', type(exc).__name__)
        _retry_or_fail(row, EmailSendError('adapter_error'))
        _save_outcome(row, sent=False)
        return False
    now = timezone.now()
    if isinstance(row, ContactMessage):
        row.delivery_state, row.delivered_at, row.delivery_error = 'sent', now, ''
        row.save(update_fields=['delivery_state', 'delivered_at', 'delivery_error'])
    else:
        row.state, row.sent_at, row.last_error, row.provider_id = 'sent', now, '', str(provider_id)[:120]
        fields = ['state', 'sent_at', 'last_error', 'provider_id']
        row.save(update_fields=fields + ['updated_at'] if isinstance(row, MessageDelivery) else fields)
    return True


def _save_outcome(row, *, sent: bool) -> None:
    if isinstance(row, ContactMessage):
        row.save(update_fields=['delivery_state', 'delivery_error', 'next_attempt_at'])
    elif isinstance(row, MessageDelivery):
        row.save(update_fields=['state', 'last_error', 'next_attempt_at', 'updated_at'])
    else:
        row.save(update_fields=['state', 'last_error', 'next_attempt_at'])


# ---------------------------------------------------------------- step 1: resolve messages

def resolve_messages(limit: int = DEFAULT_LIMIT) -> int:
    """Write one MessageDelivery per audience registration for each unresolved message. Returns messages resolved."""
    if not conf.email_enabled():
        return 0
    resolved = 0
    with transaction.atomic():
        pending = list(EventMessage.objects.select_for_update(skip_locked=True, of=('self',))
                       .filter(resolved_at__isnull=True).order_by('created_at')[:limit])
        now = timezone.now()
        for message in pending:
            ids = list(audience_registrations(message.event_id, message.audience).values_list('pk', flat=True))
            MessageDelivery.objects.bulk_create(
                [MessageDelivery(message=message, registration_id=pk, next_attempt_at=now) for pk in ids],
                ignore_conflicts=True)
            message.resolved_at = now
            message.save(update_fields=['resolved_at'])
            resolved += 1
    return resolved


# ---------------------------------------------------------------- step 2: send deliveries

def send_deliveries(limit: int = DEFAULT_LIMIT) -> dict:
    if not conf.email_enabled():
        return {'sent': 0, 'failed': 0}
    adapter = get_adapter()
    rows = _claim(MessageDelivery, state_field='state', queued_value='queued',
                  select=('message__event', 'registration__user'), limit=limit)
    site, sender, reply_to = conf.site_name(), conf.sender_name(), conf.reply_to()
    sent = failed = 0
    for row in rows:
        user = row.registration.user
        if user.status != 'active' or not user.email:
            row.state, row.last_error = 'failed', 'recipient_unavailable'
            _save_outcome(row, sent=False)
            failed += 1
            continue
        subject, body = templates.render('event_message', {
            'subject': row.message.subject, 'body': row.message.body, 'event_title': row.message.event.title,
            'site_name': site})
        ok_ = _send(adapter, row, OutgoingEmail(to=user.email, subject=subject, body=body, from_name=sender,
                                                reply_to=reply_to))
        if ok_:
            sent += 1
        elif row.state == 'failed':
            failed += 1
    return {'sent': sent, 'failed': failed}


# ---------------------------------------------------------------- step 3: transactional mail

def _tx_outgoing(row: TransactionalEmail) -> OutgoingEmail | None:
    user = row.user
    if user is None or user.status != 'active' or not user.email:
        return None
    context = {'site_name': conf.site_name(), 'name': user.name or 'there', **(row.context or {})}
    subject, body = templates.render(row.template, context)
    return OutgoingEmail(to=user.email, subject=subject, body=body, from_name=conf.sender_name(),
                         reply_to=conf.reply_to())


def send_transactional(limit: int = DEFAULT_LIMIT, only_pk=None) -> dict:
    adapter = get_adapter()
    rows = _claim(TransactionalEmail, state_field='state', queued_value='queued', select=('user',), limit=limit) \
        if only_pk is None else _claim_one(TransactionalEmail, only_pk, select=('user',))
    sent = failed = 0
    for row in rows:
        outgoing = _tx_outgoing(row)
        if outgoing is None:
            row.state, row.last_error = 'skipped', 'recipient_unavailable'
            _save_outcome(row, sent=False)
            continue
        if _send(adapter, row, outgoing):
            sent += 1
        elif row.state == 'failed':
            failed += 1
    return {'sent': sent, 'failed': failed}


def _claim_one(model, pk, *, select=()):
    now = timezone.now()
    with transaction.atomic():
        qs = model.objects.select_for_update(skip_locked=True, of=('self',)).filter(
            pk=pk, next_attempt_at__lte=now, **{'state': 'queued'})
        if select:
            qs = qs.select_related(*select)
        rows = list(qs[:1])
        for row in rows:
            _bump(row, now)
        return rows


# ---------------------------------------------------------------- step 4: contact (P11)

def send_contact(limit: int = DEFAULT_LIMIT, only_pk=None) -> dict:
    adapter = get_adapter()
    if only_pk is None:
        rows = _claim(ContactMessage, state_field='delivery_state', queued_value='pending', limit=limit)
    else:
        now = timezone.now()
        with transaction.atomic():
            rows = list(ContactMessage.objects.select_for_update(skip_locked=True)
                        .filter(pk=only_pk, delivery_state='pending', next_attempt_at__lte=now)[:1])
            for row in rows:
                _bump(row, now)
    destination = conf.contact_destination() if rows else None
    site, sender = conf.site_name(), conf.sender_name()
    sent = failed = 0
    for row in rows:
        if not destination:
            _retry_or_fail(row, EmailSendError('no_destination'), failed_state='failed')
            _save_outcome(row, sent=False)
            failed += row.delivery_state == 'failed'
            continue
        subject, body = templates.render('contact_notification', {
            'topic': row.topic, 'from_name': row.name, 'from_email': row.email, 'message': row.message,
            'site_name': site})
        if _send(adapter, row, OutgoingEmail(to=destination, subject=subject, body=body, from_name=sender,
                                             reply_to=row.email)):
            sent += 1
        elif row.delivery_state == 'failed':
            failed += 1
    return {'sent': sent, 'failed': failed}


# ---------------------------------------------------------------- entry points

def run_all(limit: int = DEFAULT_LIMIT) -> dict:
    """One worker pass over everything. Returns counts (also logged, counts only)."""
    resolved = resolve_messages(limit)
    deliveries = send_deliveries(limit)
    tx = send_transactional(limit)
    contact = send_contact(limit)
    result = {'messages_resolved': resolved, 'deliveries_sent': deliveries['sent'],
              'deliveries_failed': deliveries['failed'], 'transactional_sent': tx['sent'],
              'transactional_failed': tx['failed'], 'contact_sent': contact['sent'],
              'contact_failed': contact['failed']}
    logger.info('job=deliver_messages %s', ' '.join(f'{k}={v}' for k, v in result.items()))
    return result


def _in_thread(fn, *args) -> None:
    """Best-effort immediate attempt after the request; the worker is the guaranteed path. Own DB connection."""
    def run():
        try:
            fn(*args)
        except Exception as exc:
            logger.error('comms_background_failed exc=%s', type(exc).__name__)
        finally:
            connection.close()
    threading.Thread(target=run, daemon=True).start()


def kick_contact(pk) -> None:
    transaction.on_commit(lambda: _in_thread(send_contact, 1, pk))


def kick_transactional(pk) -> None:
    transaction.on_commit(lambda: _in_thread(send_transactional, 1, pk))
