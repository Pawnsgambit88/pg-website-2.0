from rest_framework.views import APIView

from core.responses import now_iso, ok

from .permissions import IsAdmin


class AdminView(APIView):
    """Base for every /api/admin view: default deny, admin only."""

    permission_classes = [IsAdmin]


class PingView(AdminView):
    def get(self, request):
        return ok({'status': 'ok', 'serverNow': now_iso()})
