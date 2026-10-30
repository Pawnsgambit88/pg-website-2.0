"""Admin settings (contract 3.8: G07 read, G08 partial update with `version`).

Non-secret only, by construction: every readable and writable key is declared in `FIELDS` (the server allow-list); a
key outside it is rejected, and nothing here reads or returns a credential. Integration health is booleans derived
from whether the server is configured, never the configuration itself. Brand contact fields are stored in
`PublicSettings` so the public P12 endpoint stays the single source; the rest are stored as overrides in
`AdminSettings.values`.
"""
from __future__ import annotations

import re
from datetime import datetime, timezone

from django.conf import settings as dj_settings
from django.core.exceptions import ValidationError as DjangoValidationError
from django.db import transaction

import audit
from content import validation as v
from content import revalidation
from content.models import AdminSettings, PublicSettings, SiteSection
from core.errors import ValidationFailed, VersionConflict
from core.responses import iso
from registrations import conf

DEFAULT_SUPPORT_EMAIL = 'desk@example.com'
EPOCH = datetime(1970, 1, 1, tzinfo=timezone.utc)
_EMAIL = re.compile(r'^[^@\s]{1,64}@[^@\s]{1,190}\.[^@\s]{2,}$')
_CTRL = re.compile(r'[\x00-\x1f\x7f<>]')


def _text(max_len, min_len=1):
    def check(value):
        if not isinstance(value, str):
            return 'Enter text.'
        s = value.strip()
        if len(s) < min_len or len(s) > max_len or _CTRL.search(s):
            return f'Use {min_len} to {max_len} characters, without markup.'
        return None
    return check


def _email(value):
    if not isinstance(value, str) or len(value) > 254 or not _EMAIL.match(value.strip()):
        return 'Enter a valid email address.'
    return None


def _bool(value):
    return None if isinstance(value, bool) else 'Choose true or false.'


def _int(low, high, nullable=False):
    def check(value):
        if value is None and nullable:
            return None
        if not isinstance(value, int) or isinstance(value, bool) or not low <= value <= high:
            return f'Use a whole number from {low} to {high}.'
        return None
    return check


def _enum(options):
    return lambda value: None if value in options else 'Choose one of the listed options.'


def _href(value):
    if value is None:
        return None
    return None if v.is_safe_href(value) else 'Use an http, https, mailto or tel link.'


def _social(value):
    if not isinstance(value, list) or len(value) > 8:
        return 'Use a list of at most 8 links.'
    for item in value:
        if (not isinstance(item, dict) or set(item) != {'label', 'href'} or _text(40)(item['label'])
                or not isinstance(item['href'], str) or not v.is_safe_href(item['href'])):
            return 'Each link needs a label and a safe href.'
    return None


# group -> field -> validator. `payments.currency` is read-only (INR only at launch). Brand keys other than siteName
# map to PublicSettings.
FIELDS = {
    'brand': {'siteName': _text(60), 'supportEmail': _email, 'deskContactHref': _href, 'defaultCity': _text(80),
              'social': _social},
    'auth': {'googleSignInEnabled': _bool, 'signupOpen': _bool, 'adminSessionHours': _int(1, 12)},
    'ratings': {'ratingsEnabled': _bool, 'provisionalGames': _int(0, 100), 'showRatingsByDefault': _bool},
    'payments': {'holdMinutes': _int(1, 60), 'defaultRefundWindowHours': _int(0, 24 * 60, nullable=True)},
    'notifications': {'emailEnabled': _bool, 'senderName': _text(60), 'contactDestinationEmail': _email,
                      'reminderHoursBefore': _int(1, 168)},
    'eventDefaults': {'type': _enum(v.EVENT_TYPES), 'pairingMode': _enum(v.PAIRING_MODES), 'capacity': _int(1, 100000),
                      'waitlistEnabled': _bool, 'timeControl': _text(60)},
}
PUBLIC_BRAND = {'supportEmail': 'support_email', 'deskContactHref': 'desk_contact_href', 'defaultCity': 'default_city',
                'social': 'social'}
STRIP = ('siteName', 'defaultCity', 'senderName', 'timeControl', 'supportEmail', 'contactDestinationEmail')


def _defaults() -> dict:
    hours = int(dj_settings.ADMIN_SESSION_LIFETIME.total_seconds() // 3600)
    return {
        'brand': {'siteName': "Pawn's Gambit", 'supportEmail': DEFAULT_SUPPORT_EMAIL, 'deskContactHref': None,
                  'defaultCity': 'Hyderabad', 'social': []},
        'auth': {'googleSignInEnabled': bool(dj_settings.GOOGLE_AUTH_ENABLED), 'signupOpen': True,
                 'adminSessionHours': max(1, min(12, hours))},
        'ratings': {'ratingsEnabled': True, 'provisionalGames': dj_settings.RATING_PROVISIONAL_GAMES,
                    'showRatingsByDefault': True},
        'payments': {'currency': 'INR', 'holdMinutes': conf.default_hold_minutes(), 'defaultRefundWindowHours': None},
        'notifications': {'emailEnabled': True, 'senderName': "Pawn's Gambit", 'contactDestinationEmail': None,
                          'reminderHoursBefore': 24},
        'eventDefaults': {'type': 'social', 'pairingMode': 'social_balanced', 'capacity': 24, 'waitlistEnabled': True,
                          'timeControl': '10+5'},
    }


def _integrations() -> dict:
    """Booleans only: whether the server is configured, never the configuration."""
    razorpay = (dj_settings.RAZORPAY_MODE == 'live' and bool(dj_settings.RAZORPAY_KEY_ID)
                and bool(dj_settings.RAZORPAY_KEY_SECRET))
    email = (bool(dj_settings.ANYMAIL.get('SENDGRID_API_KEY'))
             and dj_settings.EMAIL_BACKEND == 'anymail.backends.sendgrid.EmailBackend')
    return {'google': bool(dj_settings.GOOGLE_AUTH_ENABLED), 'razorpay': razorpay, 'email': email, 'whatsapp': False}


def _public_brand() -> dict:
    row = PublicSettings.load()
    if row is None:
        return {}
    return {'supportEmail': row.support_email, 'deskContactHref': row.desk_contact_href or None,
            'defaultCity': row.default_city, 'social': row.social}


def read() -> dict:
    row = AdminSettings.objects.filter(pk=1).first()
    data = _defaults()
    data['brand'].update(_public_brand())
    for key, value in ((row.values if row else None) or {}).items():
        group, _, field = key.partition('.')
        if field in FIELDS.get(group, {}) and not (group == 'brand' and field in PUBLIC_BRAND):
            data[group][field] = value
    if data['notifications']['contactDestinationEmail'] is None:
        data['notifications']['contactDestinationEmail'] = data['brand']['supportEmail']
    return {**data, 'integrations': _integrations(), 'version': row.version if row else 1,
            'updatedAt': iso(row.updated_at if row else EPOCH)}


def _parse_patch(data) -> tuple[int, dict]:
    """-> (version, {group: {field: value}}). Unknown groups/fields (including anything credential-like) are rejected."""
    if not isinstance(data, dict):
        raise ValidationFailed(fields={'form': ['Send a JSON object.']})
    errors: dict = {}
    version = data.get('version')
    if not isinstance(version, int) or isinstance(version, bool) or version < 0:
        errors['version'] = ['Send the version you loaded.']
    changes: dict = {}
    for group, body in data.items():
        if group == 'version':
            continue
        spec = FIELDS.get(group)
        if spec is None:
            errors[str(group)[:60]] = ['This setting cannot be changed here.']
            continue
        if not isinstance(body, dict) or not body:
            errors[group] = ['Send an object with at least one setting.']
            continue
        for field, value in body.items():
            path = f'{group}.{str(field)[:60]}'
            check = spec.get(field)
            if check is None:
                errors[path] = ['This setting cannot be changed here.']
                continue
            message = check(value)
            if message:
                errors[path] = [message]
                continue
            changes.setdefault(group, {})[field] = value.strip() if isinstance(value, str) and field in STRIP else value
    if not errors and not changes:
        errors['form'] = ['Send at least one setting to change.']
    if errors:
        raise ValidationFailed(fields=errors)
    return version, changes


# Site sections that render the public brand contact fields (support email, desk link, socials, city).
BRAND_SITE_SECTIONS = ('footer', 'meta')


def _emit_brand_revalidation() -> None:
    """Brand contact fields live in PublicSettings, not in a section, so no section signal fires. Write one
    `site/updated` outbox row per section that shows them, inside the settings transaction. `version` is the
    section's current counter (0 when it has no row): equal to what is already live, so the outbox's stale-replay rule
    (skip only when a strictly newer version was delivered) never drops it, and a later real publish still wins."""
    versions = dict(SiteSection.objects.filter(key__in=BRAND_SITE_SECTIONS).values_list('key', 'version'))
    for key in BRAND_SITE_SECTIONS:
        revalidation.emit('site', 'updated', entity_id=key, version=versions.get(key, 0))


def update(request, data) -> dict:
    version, changes = _parse_patch(data)
    with transaction.atomic():
        row, _ = AdminSettings.objects.select_for_update().get_or_create(pk=1, defaults={'values': {}, 'version': 1})
        if row.version != version:
            raise VersionConflict()
        current = read()
        before, after = {}, {}
        values = dict(row.values or {})
        public_changes: dict = {}
        for group, fields in changes.items():
            for field, value in fields.items():
                if current[group].get(field) == value:
                    continue
                before[f'{group}.{field}'], after[f'{group}.{field}'] = current[group].get(field), value
                if group == 'brand' and field in PUBLIC_BRAND:
                    public_changes[PUBLIC_BRAND[field]] = '' if (field == 'deskContactHref' and value is None) else value
                else:
                    values[f'{group}.{field}'] = value
        if not after:
            return current
        if public_changes:
            public = PublicSettings.load() or PublicSettings(
                support_email=DEFAULT_SUPPORT_EMAIL, default_city=current['brand']['defaultCity'], social=[])
            for attr, value in public_changes.items():
                setattr(public, attr, value)
            try:
                public.save()  # model-level href/social checks
            except DjangoValidationError:
                raise ValidationFailed(fields={'brand': ['One of the brand values is not allowed.']}) from None
            _emit_brand_revalidation()
        row.values = values
        row.version += 1
        row.updated_by = request.user
        row.save()
        audit.write(request, action='settings.update', object_type='settings', object_id='1',
                    before=before, after=after)
    return read()
