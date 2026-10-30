"""Email provider adapter (contract 5.5): `send(message) -> provider id`, or raise EmailSendError.

The provider is chosen by settings.EMAIL_ADAPTER (OQ-05 is open, so it stays swappable):
  'django' (default)  Django's mail framework through settings.EMAIL_BACKEND. Production default is SendGrid via
                      django-anymail; with DEBUG on it is the console backend, so local runs print instead of sending.
  'fake'              in-memory outbox, DEBUG only (settings refuses it otherwise).
  dotted.path.Class   any EmailAdapter subclass.
"""
from __future__ import annotations

import logging
from dataclasses import dataclass
from email.utils import formataddr, parseaddr

from django.conf import settings
from django.core.mail import EmailMessage
from django.utils.module_loading import import_string

logger = logging.getLogger('pg.comms')

_BAD_HEADER = str.maketrans({'\r': ' ', '\n': ' ', '\x00': ' '})


def clean_header(value: str, limit: int = 200) -> str:
    """Header values never carry CR/LF (header injection)."""
    return str(value).translate(_BAD_HEADER).strip()[:limit]


class EmailSendError(Exception):
    """`code` is a short reason code safe to store and show (never provider text or an address).
    `permanent` True means retrying cannot help (rejected address)."""

    def __init__(self, code: str, permanent: bool = False):
        super().__init__(code)
        self.code = code
        self.permanent = permanent


@dataclass(frozen=True)
class OutgoingEmail:
    to: str
    subject: str
    body: str
    from_name: str = ''
    reply_to: str = ''


def from_header(from_name: str) -> str:
    """`Name <address>`: the display name is configurable, the address always comes from DEFAULT_FROM_EMAIL."""
    _, address = parseaddr(settings.DEFAULT_FROM_EMAIL)
    name = clean_header(from_name or parseaddr(settings.DEFAULT_FROM_EMAIL)[0], 60).replace('<', '').replace('>', '')
    return formataddr((name, address)) if name else address


class EmailAdapter:
    name = 'base'

    def send(self, message: OutgoingEmail) -> str:  # pragma: no cover - interface
        raise NotImplementedError

    def connected(self) -> bool:  # pragma: no cover - interface
        """Whether the provider is configured (a boolean for channel health, never the configuration)."""
        raise NotImplementedError


class DjangoMailAdapter(EmailAdapter):
    name = 'django'

    def send(self, message: OutgoingEmail) -> str:
        email = EmailMessage(
            subject=clean_header(message.subject, 200), body=message.body, from_email=from_header(message.from_name),
            to=[clean_header(message.to, 254)],
            reply_to=[clean_header(message.reply_to, 254)] if message.reply_to else None,
        )
        try:
            email.send(fail_silently=False)
        except Exception as exc:
            raise _classify(exc) from None
        status = getattr(email, 'anymail_status', None)
        provider_id = getattr(status, 'message_id', None) if status is not None else None
        if isinstance(provider_id, (set, frozenset, list, tuple)):
            provider_id = next(iter(provider_id), None)
        return str(provider_id or 'sent')[:120]

    def connected(self) -> bool:
        backend = settings.EMAIL_BACKEND
        if backend == 'anymail.backends.sendgrid.EmailBackend':
            return bool(settings.ANYMAIL.get('SENDGRID_API_KEY'))
        return bool(settings.DEBUG) and 'console' in backend


def _classify(exc: Exception) -> EmailSendError:
    name = type(exc).__name__
    try:
        from anymail import exceptions as ax
        if isinstance(exc, (ax.AnymailRecipientsRefused, ax.AnymailInvalidAddress)):
            return EmailSendError('recipient_rejected', permanent=True)
        if isinstance(exc, ax.AnymailAPIError):
            status = getattr(getattr(exc, 'response', None), 'status_code', None)
            if status in (400, 403, 413):  # the request itself (or our credentials) is refused: retrying will not help
                return EmailSendError(f'provider_{status}', permanent=status != 403)
            return EmailSendError(f'provider_{status or "error"}')
    except ImportError:  # pragma: no cover
        pass
    logger.warning('email_send_error exc=%s', name)
    return EmailSendError('send_failed')


class FakeAdapter(EmailAdapter):
    """In-memory provider for development: `FakeAdapter.sent` lists what would have gone out."""
    name = 'fake'
    sent: list = []

    def send(self, message: OutgoingEmail) -> str:
        FakeAdapter.sent.append(message)
        return f'fake-{len(FakeAdapter.sent)}'

    def connected(self) -> bool:
        return True


def get_adapter() -> EmailAdapter:
    choice = settings.EMAIL_ADAPTER
    if choice == 'django':
        return DjangoMailAdapter()
    if choice == 'fake':
        return FakeAdapter()
    adapter = import_string(choice)()
    if not isinstance(adapter, EmailAdapter):
        raise TypeError('EMAIL_ADAPTER must name an EmailAdapter subclass.')
    return adapter
