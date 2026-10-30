"""Token primitives.

Access / step-up token: signed (django.core.signing, SECRET_KEY) {type, user id, family id, expiry}. It carries NO role:
the role and status are read from the database on every request (NCT-L4).

Refresh token: opaque `<familyHex>.<generation>.<hmac>`. The HMAC is derived from SECRET_KEY, so the database stores no
refresh secret at all, and a replay of the previous generation inside the grace window can be answered with the current
token without keeping raw tokens (contract 2.4). Generation numbers older than current-1, or beyond current, never match.
"""
import uuid

from django.conf import settings
from django.core import signing
from django.utils import timezone
from django.utils.crypto import constant_time_compare, salted_hmac

ACCESS_SALT = 'pg.access.v1'
REFRESH_SALT = 'pg.refresh.v1'

ACCESS = 'access'
STEP_UP = 'step_up'


def mint_access(user_id, family_id) -> str:
    exp = int((timezone.now() + settings.ACCESS_TOKEN_TTL).timestamp())
    return signing.dumps({'t': ACCESS, 'u': str(user_id), 'f': str(family_id), 'x': exp}, salt=ACCESS_SALT, compress=False)


def mint_step_up(user_id, grant_id) -> str:
    exp = int((timezone.now() + settings.STEP_UP_TTL).timestamp())
    return signing.dumps({'t': STEP_UP, 'u': str(user_id), 'j': str(grant_id), 'x': exp}, salt=ACCESS_SALT, compress=False)


def read_signed(token: str) -> dict | None:
    """Returns the payload of a genuine, unexpired signed token, else None."""
    if not token or len(token) > 4096:
        return None
    try:
        payload = signing.loads(token, salt=ACCESS_SALT)
    except signing.BadSignature:
        return None
    if not isinstance(payload, dict) or int(payload.get('x', 0)) <= int(timezone.now().timestamp()):
        return None
    return payload


def _sig(family_id, generation: int) -> str:
    return salted_hmac(REFRESH_SALT, f'{family_id}:{generation}', algorithm='sha256').hexdigest()


def make_refresh(family_id, generation: int) -> str:
    return f'{uuid.UUID(str(family_id)).hex}.{generation}.{_sig(family_id, generation)}'


def parse_refresh(token: str):
    """Returns (family uuid, generation) for a well-formed, genuinely signed refresh token, else None."""
    if not token or len(token) > 200:
        return None
    parts = token.split('.')
    if len(parts) != 3 or not parts[1].isdigit() or len(parts[1]) > 9:
        return None
    try:
        family_id = uuid.UUID(hex=parts[0])
    except ValueError:
        return None
    generation = int(parts[1])
    if not constant_time_compare(parts[2], _sig(family_id, generation)):
        return None
    return family_id, generation
