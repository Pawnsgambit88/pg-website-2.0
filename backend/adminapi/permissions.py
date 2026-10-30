"""Admin-only permission and step-up enforcement."""
from rest_framework.permissions import BasePermission

from accounts import services
from core.errors import AdminRequired, AuthRequired

STEP_UP_HEADER = 'HTTP_X_STEP_UP_TOKEN'


class IsAdmin(BasePermission):
    """Admin only. `request.user` is loaded from the database by BearerAuthentication on every request, so the role is
    never taken from the token; a demotion ends the session family (ROLE_CHANGED)."""

    def has_permission(self, request, view):
        user = request.user
        if user is None or not getattr(user, 'is_authenticated', False):
            raise AuthRequired()
        if user.role != 'admin' or user.status == 'suspended':
            raise AdminRequired()
        return True


def require_step_up(request) -> None:
    """Call at the top of refund, role-change and export mutations (before any change). Consumes the single-use grant
    sent in `X-Step-Up-Token`; raises STEP_UP_REQUIRED if it is missing, invalid, expired or already used."""
    services.consume_step_up(request.META.get(STEP_UP_HEADER), request.user)
