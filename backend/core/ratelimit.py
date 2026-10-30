"""Database-backed sliding-window rate limits (contract 2.10), correct across worker processes.

Subjects are hashed before storage. The same function is used for known and unknown accounts so a limit can never
reveal whether an account exists, and the 429 text never names the subject.

Usage:
    check('login', email, Limit(5, 60))   # raises RateLimited when the window is already full
    hit('login', email, Limit(5, 60))     # count one event
    clear('login', email)
"""
import hashlib
import secrets
from dataclasses import dataclass
from datetime import timedelta

from django.db import transaction
from django.utils import timezone

from .errors import RateLimited
from .models import RateLimitHit

MINUTE = 60
HOUR = 3600


@dataclass(frozen=True)
class Limit:
    max: int
    window_seconds: int


# Launch starting points (contract 2.10), tunable here in one place.
LOGIN_FAILURES_PER_EMAIL = Limit(5, MINUTE)
LOGIN_PER_IP = Limit(10, MINUTE)
REGISTER_PER_EMAIL = Limit(5, MINUTE)
REGISTER_PER_IP = Limit(10, MINUTE)
RESET_PER_EMAIL = Limit(3, HOUR)
RESET_PER_IP = Limit(10, HOUR)
RESET_CONFIRM_PER_IP = Limit(20, HOUR)
STEP_UP_FAILURES_PER_USER = Limit(5, MINUTE)
REFRESH_PER_FAMILY = Limit(30, MINUTE)
REFRESH_PER_IP = Limit(120, MINUTE)
CONTACT_PER_IP = Limit(3, HOUR)  # used by the content app


def _key(subject: str) -> str:
    return hashlib.sha256(subject.strip().lower().encode()).hexdigest()


def _recent(scope: str, key: str, limit: Limit):
    since = timezone.now() - timedelta(seconds=limit.window_seconds)
    return RateLimitHit.objects.filter(scope=scope, key=key, at__gt=since)


def check(scope: str, subject: str, limit: Limit) -> None:
    key = _key(subject)
    times = list(_recent(scope, key, limit).order_by('at').values_list('at', flat=True)[: limit.max])
    if len(times) < limit.max:
        return
    wait = (times[0] + timedelta(seconds=limit.window_seconds) - timezone.now()).total_seconds()
    raise RateLimited(max(1, int(wait) + 1))


def hit(scope: str, subject: str, limit: Limit) -> None:
    if secrets.randbelow(50) == 0:
        prune()  # opportunistic cleanup keeps the table small without a scheduler
    RateLimitHit.objects.create(scope=scope, key=_key(subject), at=timezone.now())


def check_and_hit(scope: str, subject: str, limit: Limit) -> None:
    """Counts the event, then raises if it exceeded the limit (an attempt is counted even when refused)."""
    with transaction.atomic():
        check(scope, subject, limit)
        hit(scope, subject, limit)


def clear(scope: str, subject: str) -> None:
    RateLimitHit.objects.filter(scope=scope, key=_key(subject)).delete()


def prune(max_age_seconds: int = 2 * HOUR) -> None:
    RateLimitHit.objects.filter(at__lt=timezone.now() - timedelta(seconds=max_age_seconds)).delete()
