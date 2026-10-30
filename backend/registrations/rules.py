"""Pure read-side rules: effective status, capacity arithmetic, cancellation policy, the R01 resolver.

Nothing here writes (GETs must be side-effect free, contract 6.1 L4). Writes live in services.py.
"""
from __future__ import annotations

from datetime import timedelta

from django.db.models import Q

from content import validation as content_validation
from content.models import Event
from core.errors import EventNotFound

from . import conf
from .models import Registration

OVER_STATUSES = ('completed', 'cancelled')
CLOSED_EVENT_STATUSES = ('cancelled', 'completed', 'ongoing')
CANCEL_BLOCKED_TEXT = 'Cancellation closes {hours} hours before the start.'


def effective_status(reg: Registration, now) -> str:
    """The status a player should see. `expired` = an unpaid hold or an unclaimed offer past its time (the scheduler
    command rewrites the row to `cancelled`; until then it is projected, and it no longer counts toward capacity)."""
    if reg.status == 'pending':
        in_flight = reg.payment_order_state in ('attempted', 'paid')
        if not in_flight and (reg.hold_expires_at is None or reg.hold_expires_at <= now):
            return 'expired'
    elif reg.status == 'offer':
        if reg.offer_expires_at is None or reg.offer_expires_at <= now:
            return 'expired'
    return reg.status


def live_registration_q(now) -> Q:
    """Rows that are an active registration right now (expired holds and offers excluded)."""
    return (Q(status__in=['confirmed', 'confirming', 'waitlist'])
            | Q(status='pending', hold_expires_at__gt=now)
            | Q(status='pending', payment_order_state__in=['attempted', 'paid'])
            | Q(status='offer', offer_expires_at__gt=now))


def holds_count(event_id, now, exclude=None) -> int:
    """Seats held but not yet confirmed: payment in flight, unexpired holds, unexpired offers."""
    qs = Registration.objects.filter(event_id=event_id)
    if exclude is not None:
        qs = qs.exclude(pk=exclude)
    return qs.filter(
        Q(status='confirming')
        | Q(status='pending', hold_expires_at__gt=now)
        | Q(status='pending', payment_order_state__in=['attempted', 'paid'])
        | Q(status='offer', offer_expires_at__gt=now)
    ).count()


def occupied(event_id, now, exclude=None) -> int:
    """confirmed + unexpired holds (contract 5.3). Reads the counter fresh from the database."""
    confirmed = Event.objects.filter(pk=event_id).values_list('confirmed_count', flat=True).first() or 0
    return confirmed + holds_count(event_id, now, exclude)


def queue_length(event_id) -> int:
    return Registration.objects.filter(event_id=event_id, status='waitlist').count()


def find_public_event(slug) -> Event:
    if not isinstance(slug, str) or not content_validation.is_slug(slug):
        raise EventNotFound()
    event = Event.objects.exclude(status='draft').filter(slug=slug).first()
    if event is None:
        raise EventNotFound()
    return event


def cancel_policy(reg: Registration, event: Event, now) -> tuple[bool, str | None]:
    """-> (allowed, reason). Reason is text for a disabled control (AC-84); None when allowed or not applicable.

    Policy (documented, tunable in conf.py): a confirmed (or payment-in-flight) place cannot be cancelled inside
    REGISTRATION_CANCEL_CUTOFF_HOURS (24) of the start. Giving up an unpaid hold or a waitlist spot is always allowed
    while the event is still ahead, because no seat has been committed.
    """
    status = effective_status(reg, now)
    if status not in ('pending', 'confirming', 'confirmed', 'waitlist', 'offer'):
        return False, None
    if event.status in OVER_STATUSES or event.status == 'ongoing' or event.starts_at <= now:
        return False, None
    if status in ('confirmed', 'confirming'):
        hours = conf.cancel_cutoff_hours()
        if event.starts_at - now < timedelta(hours=hours):
            return False, CANCEL_BLOCKED_TEXT.format(hours=hours)
    return True, None


def missing_profile_fields(user) -> list[str]:
    missing = []
    if not user.city:
        missing.append('city')
    if not user.phone:
        missing.append('phone')
    return missing


def active_registration(user, event_id, now) -> Registration | None:
    return (Registration.objects.filter(user=user, event_id=event_id).filter(live_registration_q(now))
            .order_by('-created_at').first())


def classify(event: Event, user, now):
    """R01 resolver -> (state, existing_registration). States: open_free, open_paid, full_waitlist, sold_out, closed,
    not_yet_open, already_registered, ineligible. `event` should be the row locked by the caller when used for a write."""
    existing = active_registration(user, event.pk, now)
    if existing is not None:
        return 'already_registered', existing
    if (event.status in CLOSED_EVENT_STATUSES or event.starts_at <= now
            or (event.registration_closes_at and now >= event.registration_closes_at)):
        return 'closed', None
    # `published` = announced but not yet open. `registration_opens_at` in the future also blocks registration,
    # but only when the admin has NOT already manually transitioned to `registration_open` — a manual open overrides
    # the scheduled time.
    if event.status == 'published' or (
        event.status != 'registration_open'
        and event.registration_opens_at
        and now < event.registration_opens_at
    ):
        return 'not_yet_open', None
    if missing_profile_fields(user):
        return 'ineligible', None
    full = event.capacity is not None and (occupied(event.pk, now) >= event.capacity or queue_length(event.pk) > 0)
    if full:
        return ('full_waitlist' if event.waitlist_enabled else 'sold_out'), None
    return ('open_free' if event.price_paise == 0 else 'open_paid'), None
