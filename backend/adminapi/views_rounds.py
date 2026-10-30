"""Admin rounds and pairings (contract 3.6: C06-C12). Default deny: every view is an AdminView."""
from __future__ import annotations

from core.idempotency import run_idempotent
from core.responses import ok

from . import round_service as svc
from .views import AdminView


class RoundsView(AdminView):
    """C06"""

    def get(self, request, event_id):
        return ok(svc.list_rounds(event_id))


class GenerateRoundView(AdminView):
    """C07: Idempotency-Key optional."""

    def post(self, request, event_id):
        round_no, method = svc.parse_generate(request.data)

        def work():
            event, rnd, created = svc.generate_round(request, event_id, round_no, method)
            return ok(svc.round_dto(event, rnd), status=201 if created else 200)
        return run_idempotent(request, work)


class PairingsView(AdminView):
    """C08"""

    def patch(self, request, event_id, round_id):
        parsed = svc.parse_edit(request.data)
        event, rnd = svc.edit_pairings(request, event_id, round_id, parsed)
        return ok(svc.round_dto(event, rnd))


class PublishRoundView(AdminView):
    """C09: Idempotency-Key required."""

    def post(self, request, event_id, round_id):
        version = svc.parse_version_body(request.data)

        def work():
            event, rnd = svc.publish_round(request, event_id, round_id, version)
            return ok(svc.round_dto(event, rnd))
        return run_idempotent(request, work, required=True)


class StartRoundView(AdminView):
    """C10"""

    def post(self, request, event_id, round_id):
        version = svc.parse_version_body(request.data)
        event, rnd = svc.start_round(request, event_id, round_id, version)
        return ok(svc.round_dto(event, rnd))


class ResultView(AdminView):
    """C11"""

    def put(self, request, event_id, round_id, pairing_id):
        parsed = svc.parse_result(request.data)
        return ok(svc.record_result(request, event_id, round_id, pairing_id, parsed))


class FinaliseRoundView(AdminView):
    """C12: Idempotency-Key required."""

    def post(self, request, event_id, round_id):
        version = svc.parse_version_body(request.data)

        def work():
            return ok(svc.finalise_round(request, event_id, round_id, version))
        return run_idempotent(request, work, required=True)
