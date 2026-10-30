"""Admin preview link (contract 3.7 PV01). Default deny: AdminView."""
from __future__ import annotations

from core.responses import ok

from . import media_service as ms
from . import preview_service as ps
from .views import AdminView


class PreviewLinkView(AdminView):  # PV01
    def post(self, request):
        return ok(ps.create_preview_link(request, ms.object_body(request)), headers={'Cache-Control': 'no-store'})
