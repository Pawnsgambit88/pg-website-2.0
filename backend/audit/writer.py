"""Strict audit writer: a failed audit write must fail the privileged mutation (contract 6.5).

Call `audit.write(...)` INSIDE the same `transaction.atomic()` block as the mutation. It refuses to run outside a
transaction and lets every database error propagate, so the mutation rolls back with it.
"""
import ipaddress

from django.db import transaction

from core.clientip import client_ip

from .models import AuditLog

# Keys never stored in before/after, at any depth.
_REDACT = {'password', 'token', 'accesstoken', 'refreshtoken', 'secret', 'signature', 'authorization', 'otp'}


def _scrub(value):
    if isinstance(value, dict):
        return {k: ('[redacted]' if str(k).lower() in _REDACT else _scrub(v)) for k, v in value.items()}
    if isinstance(value, (list, tuple)):
        return [_scrub(v) for v in value]
    return value


def _coarse_ip(raw: str) -> str:
    try:
        addr = ipaddress.ip_address(raw)
    except ValueError:
        return ''
    prefix = 24 if addr.version == 4 else 48
    return str(ipaddress.ip_network(f'{addr}/{prefix}', strict=False).network_address)


def write(request, *, action, object_type, object_id='', before=None, after=None, reason='') -> AuditLog:
    if not transaction.get_connection().in_atomic_block:
        raise RuntimeError('audit.write() must be called inside the mutation transaction.')
    user = getattr(request, 'user', None)
    return AuditLog.objects.create(
        actor=user,
        actor_role=user.role,
        action=action,
        object_type=object_type,
        object_id=str(object_id or ''),
        before=_scrub(before),
        after=_scrub(after),
        reason=(reason or '')[:500],
        request_id=getattr(request, 'request_id', '') or '',
        ip=_coarse_ip(client_ip(request)),
    )
