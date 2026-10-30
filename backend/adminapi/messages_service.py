"""Event messages and communication toggles (contract 3.6: C14, C15).

C14 stores the message and its audience first and returns 202; the worker (comms.delivery) resolves recipients and
delivers, writing one delivery row per registration so a partial failure is visible per recipient. This module never
sends mail. Message bodies are plain text and are not copied into the audit log (only ids, audience, subject length and
recipient count), and recipient addresses are never returned or logged.
"""
from __future__ import annotations

import re
import uuid

from django.db import transaction
from django.db.models import Count, F, Q
from django.utils import timezone

import audit
from comms import conf as comms_conf
from comms.adapters import get_adapter
from comms.delivery import audience_registrations
from comms.models import EventMessage, MessageDelivery
from content.models import Event
from core import ratelimit
from core.errors import NotFound, ValidationFailed, VersionConflict
from core.responses import iso, now_iso
from core.validation import Collector, require_object

from . import control_service as cs
from . import event_builder as eb
from . import event_service as svc

AUDIENCES = ('confirmed', 'waitlist', 'checked_in', 'first_timers')
LOG_MAX = 100
DETAIL_RECIPIENTS_MAX = 500
SEND_LIMIT = ratelimit.Limit(20, ratelimit.HOUR)  # per admin
_CTRL = re.compile(r'[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]')  # newline and tab are fine in a body
_SUBJECT_CTRL = re.compile(r'[\x00-\x1f\x7f]')


# ---------------------------------------------------------------- DTOs

def _status(message, n: int, queued: int, sent: int, failed: int) -> str:
    if message.resolved_at is None:
        return 'queued'
    if n == 0:
        return 'delivered'
    if failed == n:
        return 'failed'
    if queued:
        return 'sending' if (sent or failed) else 'queued'
    return 'partial_failure' if failed else 'delivered'


def _entry(message, n, queued, sent, failed) -> dict:
    if message.resolved_at is None:
        n = queued = message.recipient_count
    by = message.created_by
    return {
        'id': str(message.pk), 'audience': message.audience, 'channel': message.channel, 'subject': message.subject,
        'body': message.body, 'trigger': message.trigger or None,
        'sentBy': None if by is None else {'id': str(by.pk), 'name': (by.name or 'Admin')[:80]},
        'createdAt': iso(message.created_at), 'status': _status(message, n, queued, sent, failed),
        # Providers accept mail without confirming inbox delivery, so `delivered` stays 0 until webhooks exist (Later).
        'counts': {'recipients': n, 'queued': queued, 'sent': sent, 'delivered': 0, 'failed': failed},
    }


def _annotated(event):
    return (EventMessage.objects.filter(event=event).select_related('created_by').annotate(
        n=Count('deliveries'), n_queued=Count('deliveries', filter=Q(deliveries__state='queued')),
        n_sent=Count('deliveries', filter=Q(deliveries__state='sent')),
        n_failed=Count('deliveries', filter=Q(deliveries__state='failed'))))


def _row(m) -> dict:
    return _entry(m, m.n, m.n_queued, m.n_sent, m.n_failed)


def list_messages(event: Event) -> dict:
    rows = _annotated(event).order_by('-created_at', 'id')[:LOG_MAX]
    return {'messages': [_row(m) for m in rows],
            'channels': [{'channel': 'email', 'connected': get_adapter().connected()}], 'serverNow': now_iso()}


def get_message(event: Event, message_id) -> dict:
    try:
        pk = uuid.UUID(str(message_id))
    except ValueError:
        raise NotFound() from None
    message = _annotated(event).filter(pk=pk).first()
    if message is None:
        raise NotFound()
    deliveries = (MessageDelivery.objects.filter(message=message).select_related('registration__user')
                  .order_by('registration__user__name', 'pk')[:DETAIL_RECIPIENTS_MAX])
    recipients = []
    for d in deliveries:
        base = {'registrationId': str(d.registration_id), 'name': (d.registration.user.name or 'Player')[:80]}
        if d.state == 'sent':
            recipients.append({**base, 'state': 'sent', 'at': iso(d.sent_at)})
        elif d.state == 'failed':
            recipients.append({**base, 'state': 'failed', 'reason': _reason(d.last_error), 'at': iso(d.updated_at)})
        else:
            recipients.append({**base, 'state': 'queued'})
    return {**_row(message), 'recipients': recipients}


_REASONS = {'recipient_rejected': 'The address was rejected by the email provider.',
            'recipient_unavailable': 'This player has no usable email address.',
            'send_failed': 'The email provider could not send this message.',
            'adapter_error': 'The email provider could not send this message.'}


def _reason(code: str) -> str:
    return _REASONS.get(code) or ('The email provider refused this message.' if code.startswith('provider_')
                                  else 'Delivery failed.')


# ---------------------------------------------------------------- C14 POST

def _parse_send(data) -> dict:
    c = Collector(require_object(data))
    c.reject_unknown({'audience', 'channel', 'subject', 'body'})
    audience = c.choice('audience', AUDIENCES, required=True)
    channel = c.choice('channel', eb.CHANNELS, required=True)
    subject = c.text('subject', max_len=150)
    body = c.text('body', max_len=5000)
    if isinstance(subject, str) and _SUBJECT_CTRL.search(subject):
        c.add('subject', 'Use plain text on one line.')
    if isinstance(body, str) and _CTRL.search(body):
        c.add('body', 'Use plain text only.')
    c.done()
    return {'audience': audience, 'channel': channel, 'subject': subject, 'body': body}


def send(request, event_id, data) -> dict:
    """Validate, store, audit. Returns the 202 body. Idempotency is applied by the view."""
    parsed = _parse_send(data)
    event = cs.control_event(event_id)
    ratelimit.check_and_hit('admin-message', str(request.user.pk), SEND_LIMIT)
    with transaction.atomic():
        locked = Event.objects.select_for_update(of=('self',)).get(pk=event.pk)
        count = audience_registrations(locked.pk, parsed['audience']).count()
        if count == 0:
            raise ValidationFailed(fields={'audience': ['No one is in this audience yet.']})
        message = EventMessage.objects.create(
            event=locked, audience=parsed['audience'], channel=parsed['channel'], subject=parsed['subject'],
            body=parsed['body'], recipient_count=count, created_by=request.user)
        audit.write(request, action='event.message_send', object_type='event', object_id=locked.pk,
                    after={'messageId': str(message.pk), 'audience': parsed['audience'], 'channel': parsed['channel'],
                           'subjectLength': len(parsed['subject']), 'recipients': count})
    return {'id': str(message.pk), 'status': 'queued', 'recipients': count, 'acceptedAt': iso(message.created_at)}


# ---------------------------------------------------------------- C15

def communications_dto(event: Event) -> dict:
    return {'triggers': eb._triggers(event), 'channels': list(eb.CHANNELS), 'version': event.version}


def _parse_comms_patch(data) -> tuple[int, dict]:
    c = Collector(require_object(data))
    c.reject_unknown({'version', 'triggers', 'channels'})
    version = data.get('version')
    if isinstance(version, bool) or not isinstance(version, int) or version < 0:
        c.add('version', 'Send the version you loaded.')
        version = 0
    triggers: dict = {}
    raw = data.get('triggers')
    if 'triggers' in data:
        if not isinstance(raw, dict):
            c.add('triggers', 'Send an object of triggers.')
        else:
            for key, flag in raw.items():
                if key not in eb.TRIGGERS:
                    c.add(f'triggers.{str(key)[:40]}', 'This trigger does not exist.')
                elif not isinstance(flag, bool):
                    c.add(f'triggers.{key}', 'Choose true or false.')
                else:
                    triggers[key] = flag
    if 'channels' in data and data['channels'] != list(eb.CHANNELS):
        c.add('channels', 'Email is the only channel at launch.')
    if 'triggers' not in data and 'channels' not in data:
        c.add('form', 'Send at least one setting to change.')
    c.done()
    return version, triggers


def update_communications(request, event_id, data) -> Event:
    """Toggle state-triggered messages. A targeted write: it bumps the editor version (so a concurrent builder save
    conflicts instead of overwriting) but, being non-public data, does not emit a revalidation row."""
    version, triggers = _parse_comms_patch(data)
    with transaction.atomic():
        event = svc._locked_event(event_id)
        if event.version != version:
            raise VersionConflict()
        if event.status in ('cancelled', 'completed'):
            raise ValidationFailed(fields={'form': [f'A {event.status} event can no longer be edited.']})
        current = eb._triggers(event)
        changed = {k: v for k, v in triggers.items() if current[k] != v}
        if not changed:
            return event
        merged = {**current, **changed}
        Event.objects.filter(pk=event.pk).update(
            communications={'triggers': merged, 'channels': list(eb.CHANNELS)}, version=F('version') + 1,
            updated_by=request.user, last_change_summary='Updated communications', updated_at=timezone.now())
        audit.write(request, action='event.update', object_type='event', object_id=event.pk,
                    before={f'communications.triggers.{k}': current[k] for k in changed},
                    after={f'communications.triggers.{k}': v for k, v in changed.items()})
    return svc.get_event(event_id)


def communications_enabled(event: Event, trigger: str) -> bool:
    """For the scheduler (BE-12): is this state-triggered message on for the event (toggle AND global email switch)."""
    return comms_conf.trigger_enabled(event, trigger)
