"""Template store: built-in defaults, overridable per key by an `EmailTemplate` row.

Plain text only. `{{variable}}` placeholders are replaced in ONE pass, so a value that itself contains `{{...}}` (for
example an authored message body) is never expanded again. Unknown placeholders become empty text. Values are plain
strings; subjects have CR/LF stripped when rendered.

Variables per key:
  registration_confirmation  name, event_title, event_start, event_venue, event_url, site_name
  waitlist_offer             name, event_title, event_start, event_url, offer_expires, site_name
  event_reminder, checkin_open, post_event   name, event_title, event_start, event_venue, event_url, site_name
  password_reset             name, reset_link, site_name
  contact_notification       topic, from_name, from_email, message, site_name
  event_message              subject, body, event_title, site_name
  pairing_published          headline, seat, round_no, name, event_title, event_start, event_venue, event_url, site_name
"""
from __future__ import annotations

import re

from .adapters import clean_header
from .models import EmailTemplate

_PLACEHOLDER = re.compile(r'\{\{\s*([a-z_]{1,30})\s*\}\}')

DEFAULTS = {
    'registration_confirmation': (
        "You're in: {{event_title}}",
        "Hi {{name}},\n\nYour place at {{event_title}} is confirmed.\n\nWhen: {{event_start}}\nWhere: {{event_venue}}\n"
        "Details: {{event_url}}\n\nSee you there,\n{{site_name}}\n"),
    'waitlist_offer': (
        'A place opened up: {{event_title}}',
        "Hi {{name}},\n\nA place is now held for you at {{event_title}} ({{event_start}}).\n"
        "Claim it before {{offer_expires}}: {{event_url}}\n\nIf you no longer want it, you can ignore this email and the "
        "place passes to the next player.\n\n{{site_name}}\n"),
    'password_reset': (
        'Reset your {{site_name}} password',
        "Someone asked to reset the password for your {{site_name}} account.\n\n"
        "Choose a new password here (valid for 1 hour, single use):\n{{reset_link}}\n\n"
        "If this was not you, ignore this email; your password has not changed.\n"),
    'contact_notification': (
        '[Contact: {{topic}}] {{from_name}}',
        "New message from the website contact form.\n\nFrom: {{from_name}} <{{from_email}}>\nTopic: {{topic}}\n\n"
        "{{message}}\n\nReply to this email to answer the sender.\n"),
    'event_reminder': (
        'Reminder: {{event_title}}',
        "Hi {{name}},\n\nA reminder that {{event_title}} starts on {{event_start}}.\n\nWhere: {{event_venue}}\n"
        "Details: {{event_url}}\n\nSee you there,\n{{site_name}}\n"),
    'checkin_open': (
        'Check-in is open: {{event_title}}',
        "Hi {{name}},\n\nCheck-in for {{event_title}} is now open. Tell the host you are here.\n\n"
        "Where: {{event_venue}}\nDetails: {{event_url}}\n\n{{site_name}}\n"),
    'post_event': (
        'Thanks for playing: {{event_title}}',
        "Hi {{name}},\n\nThanks for joining us at {{event_title}}. We hope you enjoyed it.\n\n"
        "Results and photos: {{event_url}}\n\nSee you at the next one,\n{{site_name}}\n"),
    'event_message': ('{{subject}}', "{{body}}\n\n--\n{{event_title}} | {{site_name}}\n"),
    'pairing_published': (
        '{{headline}}: {{event_title}}',
        "Hi {{name}},\n\n{{seat}}\n\nEvent: {{event_title}} ({{event_start}})\nWhere: {{event_venue}}\n"
        "Details: {{event_url}}\n\n{{site_name}}\n"),
}
KEYS = tuple(DEFAULTS)


def _fill(text: str, context: dict) -> str:
    return _PLACEHOLDER.sub(lambda m: str(context.get(m.group(1), '')), text)


def render(key: str, context: dict) -> tuple[str, str]:
    """-> (subject, body). Raises KeyError for an unknown key."""
    default_subject, default_body = DEFAULTS[key]
    row = EmailTemplate.objects.filter(pk=key).first()
    subject, body = (row.subject, row.body) if row else (default_subject, default_body)
    return clean_header(_fill(subject, context), 200), _fill(body, context)
