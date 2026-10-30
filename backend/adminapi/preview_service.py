"""Admin preview link (contract 3.7 PV01). The link is `FRONTEND_URL` + `/api/draft?token=...` (the web type requires an
absolute https URL on the web origin, so the backend prefixes it); the web app exchanges the token server to server (`POST /api/preview/exchange`)."""
from __future__ import annotations

from urllib.parse import quote

from django.conf import settings
from django.db import transaction

import audit
from content import preview as pv
from core.errors import NotFound, ValidationFailed
from core.responses import iso

from . import editorial_service as ed
from . import event_service as es
from . import media_service as ms

KINDS = ('event', 'story', 'site')


def create_preview_link(request, data: dict) -> dict:
    ms._unknown(data, {'kind', 'id'})
    kind, raw = data.get('kind'), data.get('id')
    errors = {}
    if kind not in KINDS:
        errors['kind'] = ['Choose event, story or site.']
    if not isinstance(raw, str) or not raw or len(raw) > 64:
        errors['id'] = ['Send the id of the item to preview.']
    if errors:
        raise ValidationFailed(fields=errors)

    if kind == 'event':
        event = es.get_event(raw)  # NotFound semantics: EVENT_NOT_FOUND
        if not event.slug:
            raise ValidationFailed(fields={'id': ['Give the event a slug before previewing it.']})
        grant_kind, ref, path = 'event', str(event.pk), pv.path_for('event', event.slug)
    elif kind == 'story':
        story = ed.get_story(raw)
        grant_kind, ref, path = 'story', str(story.pk), pv.path_for('story', story.slug)
    else:
        if not pv.valid_site_id(raw):
            raise NotFound('Section not found.')
        grant_kind = 'site' if raw in ('home', 'community', 'nav', 'footer', 'meta') else 'legal'
        ref, path = raw, pv.path_for(grant_kind, raw)

    if not pv.path_allowed(path):  # defence in depth: slugs are validated, but the allow-list is the final gate
        raise ValidationFailed(fields={'id': ['This item cannot be previewed.']})

    with transaction.atomic():
        secret, grant = pv.create_link(request.user, grant_kind, ref, path)
        audit.write(request, action='preview.link', object_type=grant_kind, object_id=ref, after={'path': path})
    # Web `previewLinkSchema`: an absolute https URL on the web origin whose path is /api/draft (FRONTEND_URL is https in
    # production; a local http origin is a dev-only mismatch).
    url = f'{settings.FRONTEND_URL}/api/draft?token={quote(secret, safe="")}'
    return {'url': url, 'expiresAt': iso(grant.expires_at)}
