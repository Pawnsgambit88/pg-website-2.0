"""Idempotency-Key store (contract 2.5).

    def post(self, request):
        return run_idempotent(request, lambda: do_the_work(request), required=True)

Rules: the key is a UUID v4 in the `Idempotency-Key` header. Same key + same body replays the original status and
body with `Idempotent-Replay: true`; same key + different body is IDEMPOTENCY_CONFLICT; a missing required key is
VALIDATION_FAILED with fields.idempotencyKey. Scope is the user id or the hashed client IP, plus method and path.
Only successful (2xx) responses are stored, so a failed attempt can be retried with the same key.
"""
import hashlib
import json
import uuid

from django.db import IntegrityError, transaction
from rest_framework.response import Response

from .clientip import client_ip
from .errors import IdempotencyConflict, ValidationFailed
from .models import IdempotencyRecord


def _parse_key(request, required: bool):
    raw = request.META.get('HTTP_IDEMPOTENCY_KEY', '').strip()
    if not raw:
        if required:
            raise ValidationFailed(fields={'idempotencyKey': ['This is required.']})
        return None
    try:
        parsed = uuid.UUID(raw)
    except ValueError:
        raise ValidationFailed(fields={'idempotencyKey': ['Use a UUID v4.']}) from None
    if parsed.version != 4:
        raise ValidationFailed(fields={'idempotencyKey': ['Use a UUID v4.']})
    return str(parsed)


def _scope(request) -> str:
    user = getattr(request, 'user', None)
    if user is not None and getattr(user, 'is_authenticated', False):
        return f'user:{user.pk}'
    return 'anon:' + hashlib.sha256(client_ip(request).encode()).hexdigest()[:32]


def run_idempotent(request, handler, *, required: bool = False) -> Response:
    key = _parse_key(request, required)
    if key is None:
        return handler()

    body = json.dumps(request.data, sort_keys=True, default=str) if hasattr(request, 'data') else ''
    request_hash = hashlib.sha256(body.encode()).hexdigest()
    lookup = {'scope': _scope(request), 'key': key, 'method': request.method, 'path': request.path[:255]}

    # Expired records are purged by the scheduled `cleanup_expired` job (core.jobs, 48 h retention), not per call.
    try:
        with transaction.atomic():
            record = IdempotencyRecord.objects.create(request_hash=request_hash, **lookup)
    except IntegrityError:
        record = IdempotencyRecord.objects.get(**lookup)
        if record.request_hash != request_hash:
            raise IdempotencyConflict() from None
        if record.status_code is None:
            raise IdempotencyConflict('The original request is still being processed.') from None
        replay = Response(record.response_body, status=record.status_code, headers={'Idempotent-Replay': 'true'})
        return replay

    try:
        response = handler()
    except Exception:
        record.delete()  # failed attempts are not stored; the same key may be retried
        raise
    if 200 <= response.status_code < 300:
        record.status_code = response.status_code
        record.response_body = response.data
        record.save(update_fields=['status_code', 'response_body'])
    else:
        record.delete()
    return response
