"""Helpers for building success responses. Failures are raised (core.errors), never returned."""
from datetime import datetime

from django.utils import timezone
from rest_framework.response import Response


def now_iso() -> str:
    """Current time, ISO 8601 with offset (contract 2.8), in the configured display zone (+05:30)."""
    return timezone.localtime(timezone.now()).isoformat(timespec='seconds')


def iso(value: datetime | None) -> str | None:
    return None if value is None else timezone.localtime(value).isoformat(timespec='seconds')


def ok(data=None, *, message=None, status=200, headers=None) -> Response:
    response = Response(data, status=status, headers=headers)
    response.message = message
    return response
