"""Read side of the admin settings (G07/G08) for the code that enforces them.

`AdminSettings.values` holds only the overrides an admin has saved, keyed `group.field`. Every accessor here returns
the stored override when it is present and valid, else the env/Django-settings default, so an empty or damaged row
can never change behaviour. One primary-key read per call (no process cache: another worker may have changed it).
"""
from __future__ import annotations

from django.conf import settings

from .models import AdminSettings


def _values() -> dict:
    values = AdminSettings.objects.filter(pk=1).values_list('values', flat=True).first()
    return values if isinstance(values, dict) else {}


def _int(path: str, default: int, low: int, high: int) -> int:
    value = _values().get(path)
    if isinstance(value, int) and not isinstance(value, bool) and low <= value <= high:
        return value
    return default


def _bool(path: str, default: bool) -> bool:
    value = _values().get(path)
    return value if isinstance(value, bool) else default


def _text(path: str):
    value = _values().get(path)
    return value.strip() if isinstance(value, str) and value.strip() else None


def provisional_games() -> int:
    """`ratings.provisionalGames`: games before a rating stops being provisional."""
    return _int('ratings.provisionalGames', int(settings.RATING_PROVISIONAL_GAMES), 0, 100)


def signup_open() -> bool:
    """`auth.signupOpen`: whether new player accounts may be created (default open)."""
    return _bool('auth.signupOpen', True)


def hold_minutes(default: int) -> int:
    """`payments.holdMinutes` (1-60); `default` is the env/default value supplied by the caller."""
    return _int('payments.holdMinutes', default, 1, 60)


def email_enabled() -> bool:
    """`notifications.emailEnabled`: master switch for event messages and state-triggered email."""
    return _bool('notifications.emailEnabled', True)


def reminder_hours_before() -> int:
    """`notifications.reminderHoursBefore` (1-168): lead time of the reminder trigger, default 24."""
    return _int('notifications.reminderHoursBefore', 24, 1, 168)


def sender_name() -> str:
    return _text('notifications.senderName') or "Pawn's Gambit"


def site_name() -> str:
    return _text('brand.siteName') or "Pawn's Gambit"


def contact_destination_override() -> str | None:
    return _text('notifications.contactDestinationEmail')
