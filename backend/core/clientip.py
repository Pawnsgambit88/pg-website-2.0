"""Client IP derivation from the trusted proxy chain only (contract 2.10)."""
from django.conf import settings


def client_ip(request) -> str:
    remote = request.META.get('REMOTE_ADDR', '') or 'unknown'
    count = getattr(settings, 'TRUSTED_PROXY_COUNT', 0)
    if count <= 0:
        return remote
    forwarded = [part.strip() for part in request.META.get('HTTP_X_FORWARDED_FOR', '').split(',') if part.strip()]
    # Each trusted proxy appends the address it saw; the client is the entry `count` from the right.
    if len(forwarded) >= count:
        return forwarded[-count]
    return remote
