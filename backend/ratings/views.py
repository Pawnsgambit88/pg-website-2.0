"""Ratings API M10-M12. Authenticated players only, always the caller's own data, never cached."""
from rest_framework.permissions import IsAuthenticated
from rest_framework.views import APIView

from core.errors import NotFound, ValidationFailed
from core.pagination import PagePagination
from core.responses import ok

from . import selectors, serializers as ser
from .models import POOLS

NO_STORE = {'Cache-Control': 'no-store'}
MIN_DAYS, MAX_DAYS = 7, 365  # the frontend schema allows 7..365


class OwnerView(APIView):
    permission_classes = [IsAuthenticated]  # the user always comes from the verified bearer token, never from the URL


def _pool(value: str) -> str:
    if value not in POOLS:
        raise NotFound()
    return value


class RatingsView(OwnerView):  # M10
    def get(self, request):
        return ok(selectors.ratings_summary_for(request.user), headers=NO_STORE)


class LedgerView(OwnerView):  # M11
    def get(self, request, pool):
        pool = _pool(pool)
        paginator = PagePagination()
        page = paginator.paginate_queryset(selectors.ledger_for(request.user, pool), request, view=self)
        identities = selectors.opponent_identities(page)
        response = paginator.get_paginated_response([ser.ledger_dto(e, identities) for e in page])
        response['Cache-Control'] = 'no-store'
        return response


class TrendView(OwnerView):  # M12
    def get(self, request, pool):
        pool = _pool(pool)
        raw = request.query_params.get('days')
        days = selectors.TREND_DEFAULT_DAYS
        if raw not in (None, ''):
            if not raw.isascii() or not raw.isdigit() or not MIN_DAYS <= int(raw) <= MAX_DAYS:
                raise ValidationFailed(fields={'days': [f'Use a whole number from {MIN_DAYS} to {MAX_DAYS}.']})
            days = int(raw)
        return ok(ser.trend_dto(selectors.trend_for(request.user, pool, days)), headers=NO_STORE)
