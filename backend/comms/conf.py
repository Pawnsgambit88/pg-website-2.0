"""Resolved communications configuration: admin settings (G08) first, then env, then defaults."""
from __future__ import annotations

from django.conf import settings

from content import runtime_settings
from content.models import PublicSettings

TRIGGER_KEYS = ('confirmation', 'reminder_24h', 'checkin_open', 'pairing_published', 'post_event')


def contact_destination() -> str | None:
    """P11 destination: admin `notifications.contactDestinationEmail`, else CONTACT_DESTINATION_EMAIL, else the public
    support email. None when nothing is configured."""
    override = runtime_settings.contact_destination_override()
    if override:
        return override
    if settings.CONTACT_DESTINATION_EMAIL:
        return settings.CONTACT_DESTINATION_EMAIL
    public = PublicSettings.load()
    return public.support_email if public is not None and public.support_email else None


def reply_to() -> str:
    public = PublicSettings.load()
    return public.support_email if public is not None else ''


def sender_name() -> str:
    return runtime_settings.sender_name()


def site_name() -> str:
    return runtime_settings.site_name()


def email_enabled() -> bool:
    return runtime_settings.email_enabled()


def trigger_enabled(event, trigger: str) -> bool:
    """Per-event toggle for a state-triggered message (C15). Enforced at the point each trigger fires: BE-11 enforces
    `confirmation`; the scheduler (BE-12) must call this for the others. Missing key means on."""
    stored = ((event.communications or {}).get('triggers') or {})
    return trigger in TRIGGER_KEYS and bool(stored.get(trigger, True)) and email_enabled()


def reminder_hours_before() -> int:
    """Lead time for the `reminder_24h` trigger (`notifications.reminderHoursBefore`, default 24). For BE-12."""
    return runtime_settings.reminder_hours_before()
