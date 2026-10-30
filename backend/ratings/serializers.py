"""Ratings DTOs: keys exactly per web/src/lib/api/types/rating.ts (camelCase)."""
from core.responses import iso


def ledger_dto(entry, identities: dict) -> dict:
    from .selectors import public_identity
    name, initials = identities.get(entry.opponent_id) or public_identity(entry.opponent_label, bool(entry.opponent_label))
    return {
        'id': str(entry.pk),
        'pool': entry.pool,
        'at': iso(entry.created),
        'outcome': entry.outcome,
        'opponent': {'displayName': name, 'initials': initials},
        'before': entry.before,
        'after': entry.after,
        'delta': entry.delta,
        'event': {'slug': entry.event_slug, 'title': entry.event_title},
    }


def trend_dto(series: list[dict]) -> list[dict]:
    return [{'at': iso(point['at']), 'rating': point['rating']} for point in series]
