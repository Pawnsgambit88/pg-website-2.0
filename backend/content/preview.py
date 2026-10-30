"""Draft preview (contract 3.7 PV01, 3.10 preview exchange, F-06).

Flow: an admin calls PV01 -> single-use link token (5 min, stored hashed) -> the web server exchanges it with the shared
`PREVIEW_SECRET` -> gets a `previewKey` (5 min, scoped to one entity) -> sends it as `X-Preview-Key` on public reads.
An invalid, expired or out-of-scope key is ignored (the caller gets the normal published response), so the header is
not an oracle. Draft responses are `private, no-store` and `noindex`.
"""
from __future__ import annotations

import datetime
import hashlib
import hmac
import re
import secrets
from datetime import timedelta

from django.conf import settings
from django.db import transaction
from django.utils import timezone

from . import validation as v
from .models import ContentDraft, LegalPage, PreviewGrant, SiteSection

TTL = timedelta(minutes=5)
MAX_SECRET_LEN = 200
DRAFT_HEADERS = {'Cache-Control': 'private, no-store', 'X-Robots-Tag': 'noindex'}

# Relative, slug-based paths only (F-06 d).
PATH_ALLOW = re.compile(
    r'^/(?:|community|privacy|terms|refund-policy|(?:events|stories)/[a-z0-9]+(?:-[a-z0-9]+)*)$')


def path_allowed(path) -> bool:
    return (isinstance(path, str) and len(path) <= 200 and path.startswith('/') and not path.startswith('//')
            and PATH_ALLOW.match(path) is not None)


def hash_secret(value: str) -> str:
    return hashlib.sha256(value.encode()).hexdigest()


def secret_matches(presented: str) -> bool:
    """Constant-time compare against PREVIEW_SECRET (digests, so length is not leaked). Unset secret never matches."""
    expected = getattr(settings, 'PREVIEW_SECRET', '')
    if not expected or not presented or len(presented) > 512:
        return False
    return hmac.compare_digest(hashlib.sha256(presented.encode()).digest(), hashlib.sha256(expected.encode()).digest())


def _mint(*, purpose, kind, ref, path, user=None) -> tuple[str, PreviewGrant]:
    secret = secrets.token_urlsafe(32)
    now = timezone.now()
    grant = PreviewGrant.objects.create(token_hash=hash_secret(secret), purpose=purpose, kind=kind, ref=ref, path=path,
                                        created_by=user, created_at=now, expires_at=now + TTL)
    return secret, grant


def create_link(user, kind: str, ref: str, path: str) -> tuple[str, PreviewGrant]:
    """Caller holds the transaction (audit row). Also prunes grants that expired over an hour ago."""
    PreviewGrant.objects.filter(expires_at__lt=timezone.now() - timedelta(hours=1)).delete()
    return _mint(purpose='link', kind=kind, ref=ref, path=path, user=user)


def exchange(token: str) -> tuple[str, PreviewGrant] | None:
    """Consume the link token (atomic UPDATE: of two concurrent calls only one wins) and mint the read key."""
    if not isinstance(token, str) or not 20 <= len(token) <= MAX_SECRET_LEN:
        return None
    now = timezone.now()
    with transaction.atomic():
        claimed = PreviewGrant.objects.filter(token_hash=hash_secret(token), purpose='link', used_at__isnull=True,
                                              expires_at__gt=now).update(used_at=now)
        if claimed != 1:
            return None
        link = PreviewGrant.objects.get(token_hash=hash_secret(token))
        if not path_allowed(link.path):
            return None
        return _mint(purpose='key', kind=link.kind, ref=link.ref, path=link.path, user=link.created_by)


def grant_from_request(request) -> PreviewGrant | None:
    key = request.headers.get('X-Preview-Key')
    if not key or len(key) > MAX_SECRET_LEN:
        return None
    return PreviewGrant.objects.filter(token_hash=hash_secret(key), purpose='key',
                                       expires_at__gt=timezone.now()).first()


def in_scope(grant, kind: str, ref: str) -> bool:
    return grant is not None and grant.kind == kind and grant.ref == str(ref)


# ---------------------------------------------------------------- draft reads (ContentDraft, BE-08)

def draft_section(key: str) -> SiteSection | None:
    """Unsaved SiteSection carrying the working copy, or None when there is no draft (serve the live row)."""
    draft = ContentDraft.objects.filter(kind='site', key=key, version__gt=0).first()
    if draft is None:
        return None
    return SiteSection(key=key, status='draft', content=draft.content, version=draft.version,
                       updated_at=draft.updated_at)


def draft_legal(page: str) -> LegalPage | None:
    draft = ContentDraft.objects.filter(kind='legal', key=page, version__gt=0).first()
    if draft is None:
        return None
    c = draft.content
    try:
        effective = datetime.date.fromisoformat(c['effectiveDate'])
    except (KeyError, TypeError, ValueError):
        return None
    return LegalPage(page=page, title=c.get('title', ''), blocks=c.get('blocks', []), effective_date=effective,
                     version=draft.version)


def path_for(kind: str, slug_or_key: str) -> str:
    if kind in ('event', 'story'):
        return f'/{"events" if kind == "event" else "stories"}/{slug_or_key}'
    if kind == 'legal':
        return f'/{slug_or_key}'
    return '/community' if slug_or_key == 'community' else '/'


def valid_site_id(raw) -> bool:
    return isinstance(raw, str) and (raw in v.SITE_KEYS or raw in v.LEGAL_PAGES)
