"""Tunable policy numbers. Read from Django settings if defined, else the environment, else the default.

(settings.py belongs to another slice; these names can be added there later without changing this module.)
"""
import os

from django.conf import settings


def _int(name: str, default: int, low: int, high: int) -> int:
    value = getattr(settings, name, None)
    if value is None:
        raw = os.environ.get(name, '').strip()
        value = int(raw) if raw.isdigit() else default
    return max(low, min(high, int(value)))


def default_hold_minutes() -> int:
    """Env/default hold, ignoring the admin override (what the settings screen shows as the fallback)."""
    return _int('REGISTRATION_HOLD_MINUTES', 10, 1, 60)


def hold_minutes() -> int:
    """Capacity hold for a paid reservation (contract 5.3; open question FEAT-000 OQ-08). The admin setting
    `payments.holdMinutes` (G08) wins when saved; otherwise REGISTRATION_HOLD_MINUTES, otherwise 10."""
    from content import runtime_settings
    return runtime_settings.hold_minutes(default_hold_minutes())


def offer_hours() -> int:
    """Waitlist offer window (OQ-08, default 2 h)."""
    return _int('WAITLIST_OFFER_HOURS', 2, 1, 48)


def cancel_cutoff_hours() -> int:
    """A confirmed registration cannot be cancelled inside this many hours before the start."""
    return _int('REGISTRATION_CANCEL_CUTOFF_HOURS', 24, 0, 24 * 14)


def checkin_opens_minutes_before() -> int:
    return _int('CHECKIN_OPENS_MINUTES_BEFORE', 30, 0, 24 * 60)


def checkin_closes_minutes_after() -> int:
    return _int('CHECKIN_CLOSES_MINUTES_AFTER', 15, 0, 24 * 60)
