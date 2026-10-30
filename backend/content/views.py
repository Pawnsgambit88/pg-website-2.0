"""Public, unauthenticated content API (contract 3.1, 3.9). GET only except POST /contact.

Cache-Control (contract 2.12): public reads `public, s-maxage=60, stale-while-revalidate=300`; availability and
contact `no-store`. Errors are raised as core ApiError subclasses; the envelope is applied by core.
"""
from __future__ import annotations

import hashlib
import hmac
import json
import logging
import uuid
from datetime import timedelta

from django.conf import settings
from django.db import IntegrityError, transaction
from django.utils import timezone
from rest_framework.permissions import AllowAny
from rest_framework.views import APIView

from comms import delivery
from core import ratelimit
from core.errors import (AuthRequired, EventNotFound, IdempotencyConflict, NotFound, RateLimited, ValidationFailed)
from core.pagination import PagePagination
from core.responses import iso, ok

from . import preview, selectors, serializers as ser, validation as v
from .models import ContactMessage, PublicSettings

logger = logging.getLogger('pg.content')

PUBLIC_CACHE = 'public, s-maxage=60, stale-while-revalidate=300'
CONTACT_LIMIT_PER_HOUR = 5


class SitemapPagination(PagePagination):
    page_size = 100
    max_page_size = 1000  # contract P10


class PublicView(APIView):
    authentication_classes = []  # public: never reads cookies or tokens
    permission_classes = [AllowAny]
    cache_control = PUBLIC_CACHE

    def finalize_response(self, request, response, *args, **kwargs):
        response = super().finalize_response(request, response, *args, **kwargs)
        if response.status_code < 400 and 'Cache-Control' not in response:
            response['Cache-Control'] = self.cache_control
        return response


def _flag(request, name):
    raw = request.query_params.get(name)
    if raw in (None, ''):
        return None
    if raw.lower() in ('true', '1'):
        return True
    if raw.lower() in ('false', '0'):
        return False
    raise ValidationFailed(fields={name: ['Must be true or false.']})


def _choice(request, name, options):
    raw = request.query_params.get(name)
    if raw in (None, ''):
        return None
    if raw not in options:
        raise ValidationFailed(fields={name: ['Not a valid choice.']})
    return raw


def _text(request, name, max_len=100):
    raw = (request.query_params.get(name) or '').strip()
    if len(raw) > max_len:
        raise ValidationFailed(fields={name: [f'At most {max_len} characters.']})
    return raw or None


def _page(view, request, queryset, to_dto, paginator_class=PagePagination):
    paginator = paginator_class()
    page = paginator.paginate_queryset(queryset, request, view=view)
    response = paginator.get_paginated_response([to_dto(item) for item in page])
    return response


def _previewing(request, kind, ref):
    """True when a valid X-Preview-Key scoped to this exact entity is present. Anything else is ignored."""
    return preview.in_scope(preview.grant_from_request(request), kind, ref)


class SiteSectionView(PublicView):
    def get(self, request, section):
        if section in v.SITE_KEYS and _previewing(request, 'site', section):
            row = preview.draft_section(section) or selectors.published_section(section)
            if row is None:
                raise NotFound(headers=preview.DRAFT_HEADERS)
            return ok(ser.site_section_dto(row, selectors.collections_for(row.content)),
                      headers=preview.DRAFT_HEADERS)
        row = selectors.published_section(section)
        if row is None:
            raise NotFound()
        return ok(ser.site_section_dto(row, selectors.collections_for(row.content)))


class EventListView(PublicView):
    def get(self, request):
        qs = selectors.upcoming_events(
            q=_text(request, 'q'),
            type=_choice(request, 'type', v.EVENT_TYPES),
            audience=_choice(request, 'audience', v.EVENT_AUDIENCES),
            free=_flag(request, 'free'),
            city=_text(request, 'city', 80),
        )
        return _page(self, request, qs, ser.event_card_dto)


class EventDetailView(PublicView):
    def get(self, request, slug):
        grant = preview.grant_from_request(request)
        if grant is not None and grant.kind == 'event':
            event = selectors.event_by_slug(slug, include_drafts=True)
            if event is not None and preview.in_scope(grant, 'event', event.pk):
                return ok(ser.event_detail_dto(event), headers=preview.DRAFT_HEADERS)
        event = selectors.event_by_slug(slug)
        if event is None:
            raise EventNotFound()
        return ok(ser.event_detail_dto(event))


class EventAvailabilityView(PublicView):
    cache_control = 'no-store'

    def get(self, request, slug):
        event = selectors.event_for_availability(slug)
        if event is None:
            raise EventNotFound()
        return ok(ser.availability_dto(event, timezone.now()), headers={'Cache-Control': 'no-store'})


class PastEventListView(PublicView):
    def get(self, request):
        qs = selectors.past_events(q=_text(request, 'q'), type=_choice(request, 'type', v.EVENT_TYPES))
        return _page(self, request, qs, ser.event_card_dto)


class StoryListView(PublicView):
    def get(self, request):
        return _page(self, request, selectors.published_stories(), ser.story_card_dto)


class StoryDetailView(PublicView):
    def get(self, request, slug):
        grant = preview.grant_from_request(request)
        if grant is not None and grant.kind == 'story':
            story = selectors.story_by_slug(slug, include_drafts=True)
            if story is not None and preview.in_scope(grant, 'story', story.pk):
                return ok(ser.story_detail_dto(story), headers=preview.DRAFT_HEADERS)
        story = selectors.story_by_slug(slug)
        if story is None:
            raise NotFound()
        return ok(ser.story_detail_dto(story))


class TestimonialListView(PublicView):
    def get(self, request):
        return ok([ser.testimonial_dto(t) for t in selectors.published_testimonials()])


class LegalPageView(PublicView):
    def get(self, request, page):
        if page in v.LEGAL_PAGES and _previewing(request, 'legal', page):
            row = preview.draft_legal(page) or selectors.legal_page(page)
            if row is None:
                raise NotFound(headers=preview.DRAFT_HEADERS)
            return ok(ser.legal_dto(row), headers=preview.DRAFT_HEADERS)
        row = selectors.legal_page(page)
        if row is None:
            raise NotFound()
        return ok(ser.legal_dto(row))


class SitemapEntriesView(PublicView):
    def get(self, request):
        def dto(entry):
            return {**entry, 'updatedAt': iso(entry['updatedAt'])}
        return _page(self, request, selectors.sitemap_entries(), dto, SitemapPagination)


class PublicSettingsView(PublicView):
    def get(self, request):
        row = PublicSettings.load()
        if row is None:
            raise NotFound()
        return ok(ser.public_settings_dto(row))


# ---------------------------------------------------------------- contact

def _client_ip(request):
    """Rightmost X-Forwarded-For entry (appended by the trusted proxy) only when TRUST_X_FORWARDED_FOR is set."""
    if getattr(settings, 'TRUST_X_FORWARDED_FOR', False):
        forwarded = request.META.get('HTTP_X_FORWARDED_FOR', '')
        if forwarded:
            return forwarded.split(',')[-1].strip()
    return request.META.get('REMOTE_ADDR', '')


def _digest(*parts):
    key = settings.SECRET_KEY.encode()
    return hmac.new(key, '\x1f'.join(parts).encode(), hashlib.sha256).hexdigest()


class ContactView(PublicView):
    """POST /contact: 202. Honeypot `website` silently accepted and dropped. 5 stored messages/hour/IP."""
    cache_control = 'no-store'

    def post(self, request):
        key = request.headers.get('Idempotency-Key')
        key_uuid = None
        if key:
            try:
                key_uuid = uuid.UUID(key)
            except ValueError:
                raise ValidationFailed(fields={'idempotencyKey': ['Must be a UUID.']}) from None

        serializer = ser.ContactInputSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data

        if data.get('website'):  # honeypot: look successful, store nothing
            logger.info('contact_dropped reason=honeypot')
            return ok(None, status=202, headers={'Cache-Control': 'no-store'})

        request_hash = _digest(json.dumps({k: data[k] for k in ('name', 'email', 'topic', 'message')},
                                          sort_keys=True))
        if key_uuid is not None:
            existing = ContactMessage.objects.filter(idempotency_key=key_uuid).first()
            if existing is not None:
                if existing.request_hash != request_hash:
                    raise IdempotencyConflict()
                return ok(None, status=202, headers={'Cache-Control': 'no-store', 'Idempotent-Replay': 'true'})

        ip_hash = _digest('ip', _client_ip(request))
        since = timezone.now() - timedelta(hours=1)
        recent = ContactMessage.objects.filter(ip_hash=ip_hash, created_at__gte=since).order_by('created_at')
        if recent.count() >= CONTACT_LIMIT_PER_HOUR:
            oldest = recent.first().created_at
            wait = int((oldest + timedelta(hours=1) - timezone.now()).total_seconds())
            raise RateLimited(wait)

        try:
            with transaction.atomic():
                message = ContactMessage.objects.create(
                    name=data['name'], email=data['email'], topic=data['topic'], message=data['message'],
                    idempotency_key=key_uuid, request_hash=request_hash, ip_hash=ip_hash,
                )
                # Stored first (delivery_state='pending'). One best-effort attempt runs after commit; the worker
                # (`deliver_messages`) retries. Destination: admin setting, else CONTACT_DESTINATION_EMAIL, else
                # PublicSettings.support_email. Log ids only: never name, email or message text.
                delivery.kick_contact(message.pk)
        except IntegrityError:  # concurrent replay of the same key
            return ok(None, status=202, headers={'Cache-Control': 'no-store', 'Idempotent-Replay': 'true'})

        logger.info('contact_stored id=%s topic=%s', message.id, message.topic)
        return ok(None, status=202, headers={'Cache-Control': 'no-store'})


# ---------------------------------------------------------------- preview exchange (contract 3.10)

PREVIEW_EXCHANGE_LIMIT = ratelimit.Limit(30, ratelimit.MINUTE)


class PreviewExchangeView(PublicView):
    """POST /preview/exchange: server to server. Bearer PREVIEW_SECRET (constant-time), body {token} (single use).
    Returns {path, previewKey, expiresAt}; the key is scoped to the one entity named by the link."""
    cache_control = 'no-store'

    def post(self, request):
        ratelimit.check_and_hit('preview_exchange', _client_ip(request) or 'unknown', PREVIEW_EXCHANGE_LIMIT)
        scheme, _, presented = request.headers.get('Authorization', '').partition(' ')
        if scheme.lower() != 'bearer' or not preview.secret_matches(presented.strip()):
            raise AuthRequired()
        data = request.data if isinstance(request.data, dict) else {}
        result = preview.exchange(data.get('token'))
        if result is None:
            raise ValidationFailed(fields={'token': ['This preview link is invalid or has expired.']})
        key, grant = result
        return ok({'path': grant.path, 'previewKey': key, 'expiresAt': iso(grant.expires_at)},
                  headers={'Cache-Control': 'no-store'})
