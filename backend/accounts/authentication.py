"""Bearer access-token authentication.

The token proves WHO (user id) and WHICH SESSION (family id). It never carries the role: user, role, status and the
session family are read from the database on every request, so a demotion, suspension, logout or password reset takes
effect immediately (NCT-L3, NCT-L4, NCT-L8).
"""
from django.utils import timezone
from rest_framework.authentication import BaseAuthentication, get_authorization_header

from core.errors import AuthRequired

from . import tokens
from .models import AuthFamily, User


def bearer_token(request) -> str | None:
    header = get_authorization_header(request).split()
    if len(header) != 2 or header[0].lower() != b'bearer':
        return None
    try:
        return header[1].decode('ascii')
    except UnicodeDecodeError:
        return None


class BearerAuthentication(BaseAuthentication):
    def authenticate_header(self, request):
        return 'Bearer'

    def authenticate(self, request):
        raw = bearer_token(request)
        if raw is None:
            return None  # anonymous; the permission class decides
        payload = tokens.read_signed(raw)
        if payload is None or payload.get('t') != tokens.ACCESS:
            raise AuthRequired()
        user = User.objects.filter(pk=payload.get('u')).first()
        if user is None:
            raise AuthRequired()
        if user.status == 'suspended':
            raise AuthRequired(reason='ACCOUNT_SUSPENDED')
        family = AuthFamily.objects.filter(pk=payload.get('f'), user=user).first()
        if family is None or family.revoked_at is not None or family.expires_at <= timezone.now():
            raise AuthRequired()
        if family.role != user.role:
            raise AuthRequired(reason='ROLE_CHANGED')
        request._request.pg_actor = str(user.pk)  # for the access log line only
        return user, family
