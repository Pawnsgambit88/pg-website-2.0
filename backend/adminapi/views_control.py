"""Event control room views (contract 3.6: C01-C05, C13, C16, C17). Default deny: every view is an AdminView."""
from __future__ import annotations

import re

from django.http import HttpResponse

from core.errors import ValidationFailed
from core.idempotency import run_idempotent
from core.responses import ok

from . import control_service as cs
from . import event_service as svc
from . import messages_service as ms
from .views import AdminView
from .views_events import AdminPagePagination


def _event(event_id):
    return cs.control_event(event_id)


class OverviewView(AdminView):
    def get(self, request, event_id):
        return ok(cs.overview(_event(event_id)))


class RegistrationsView(AdminView):
    def get(self, request, event_id):
        paginator, items = cs.list_registrations(request, _event(event_id), AdminPagePagination)
        return paginator.get_paginated_response(items)


class RegistrationActionView(AdminView):
    def post(self, request, event_id, reg_id):
        def work():
            dto, refunds = cs.act(request, event_id, reg_id, request.data)
            cs.execute_refunds(refunds)  # after commit; a provider outage leaves them pending for the retry job
            return ok(dto)
        return run_idempotent(request, work)  # Idempotency-Key honoured when sent


class CheckInView(AdminView):
    def get(self, request, event_id):
        return ok(cs.desk(request, _event(event_id), AdminPagePagination))

    def post(self, request, event_id):
        return ok(cs.set_check_in(request, event_id, request.data))


class CheckInAllView(AdminView):
    def post(self, request, event_id):
        return ok(cs.set_check_in_all(request, event_id))


class PaymentsView(AdminView):
    def get(self, request, event_id):
        paginator, items = cs.list_payments(request, _event(event_id), AdminPagePagination)
        return paginator.get_paginated_response(items)


class RecapView(AdminView):
    def get(self, request, event_id):
        return ok(cs.recap_dto(_event(event_id)))

    def patch(self, request, event_id):
        return ok(cs.recap_dto(cs.update_recap(request, event_id, request.data)))


class MessagesView(AdminView):
    """C14. GET: message log with per-recipient delivery counts. POST (IK required): store, 202, the worker delivers."""

    def get(self, request, event_id):
        return ok(ms.list_messages(_event(event_id)))

    def post(self, request, event_id):
        return run_idempotent(request, lambda: ok(ms.send(request, event_id, request.data), status=202),
                              required=True)


class MessageDetailView(AdminView):
    def get(self, request, event_id, message_id):
        return ok(ms.get_message(_event(event_id), message_id))


class CommunicationsView(AdminView):
    """C15. Per-event toggles for state-triggered messages (also part of the builder step 7 via E04)."""

    def get(self, request, event_id):
        return ok(ms.communications_dto(svc.get_event(event_id)))

    def patch(self, request, event_id):
        return ok(ms.communications_dto(ms.update_communications(request, event_id, request.data)))


class AuditView(AdminView):
    def get(self, request, event_id):
        event = _event(event_id)
        fmt = request.query_params.get('format')
        if fmt is not None and fmt != 'csv':
            raise ValidationFailed(fields={'format': ['Choose csv.']})
        if fmt == 'csv':
            body = cs.export_audit_csv(request, event)
            name = re.sub(r'[^A-Za-z0-9-]', '', f'audit-{event.pk}')  # the id is a UUID; never a user string
            response = HttpResponse(body, content_type='text/csv; charset=utf-8')
            response['Content-Disposition'] = f'attachment; filename="{name}.csv"'
            response['Cache-Control'] = 'private, no-store'
            response['X-Content-Type-Options'] = 'nosniff'
            return response
        paginator, items = cs.list_audit(request, event, AdminPagePagination)
        return paginator.get_paginated_response(items)
