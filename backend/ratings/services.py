"""Rating processing (contract 5.4).

process_round(round_id, payload) is the only path that moves ratings:
  * one database transaction;
  * the RatingRun row (unique round_id) is the idempotency gate: a second call finds it and returns the stored
    outcome without touching anything, so a processed round can never change twice;
  * every player is computed from the SAME pre-round snapshot (no one sees another's new rating);
  * ledger rows are inserted first, PoolRating is updated after, both inside the transaction, so a half-written round
    is impossible;
  * unrated or social rounds write ledger rows with rated=False and NULL before/after/delta and leave PoolRating alone.

payload (plain dict, validated here; JSON friendly so a management command can feed it):
    {
      "event": {"id": uuid, "slug": str, "title": str},
      "pool": "blitz" | "rapid" | "classical",
      "rated": bool,
      "played_at": ISO datetime (optional, default now),
      "pairings": [{"player1_id": uuid, "player2_id": uuid, "score": 1 | 0.5 | 0}]   # score is player1's
    }
Players who sit out (byes) are not in `pairings` and are not changed. A player appears at most once per round.
"""
from __future__ import annotations

import logging
import uuid
from dataclasses import dataclass
from datetime import datetime

from django.db import IntegrityError, transaction
from django.utils import timezone
from django.utils.dateparse import parse_datetime

from accounts.models import User

from . import glicko2
from .models import (DEFAULT_RATING, DEFAULT_RD, DEFAULT_VOLATILITY, POOLS, RATING_MAX, RATING_MIN, RD_CEILING,
                     PoolRating, RatingLedgerEntry, RatingRun)

logger = logging.getLogger('pg.ratings')

SLUG_RE = __import__('re').compile(r'^[a-z0-9]+(?:-[a-z0-9]+)*$')
SCORES = (0.0, 0.5, 1.0)


class InvalidRound(ValueError):
    """The round payload is malformed. The message is safe to show to an operator (no user data)."""


@dataclass(frozen=True)
class RoundOutcome:
    round_id: uuid.UUID
    already_processed: bool
    rated: bool
    players: int
    ledger_rows: int


def _uuid(value, name) -> uuid.UUID:
    try:
        return value if isinstance(value, uuid.UUID) else uuid.UUID(str(value))
    except (ValueError, AttributeError, TypeError):
        raise InvalidRound(f'{name} must be a UUID.') from None


def _parse(payload: dict):
    if not isinstance(payload, dict):
        raise InvalidRound('The round must be an object.')
    pool = payload.get('pool')
    if pool not in POOLS:
        raise InvalidRound('pool must be blitz, rapid or classical.')
    rated = payload.get('rated')
    if not isinstance(rated, bool):
        raise InvalidRound('rated must be true or false.')
    event = payload.get('event')
    if not isinstance(event, dict):
        raise InvalidRound('event is required.')
    event_id = _uuid(event.get('id'), 'event.id')
    slug, title = event.get('slug'), event.get('title')
    if not isinstance(slug, str) or not SLUG_RE.match(slug) or len(slug) > 100:
        raise InvalidRound('event.slug is invalid.')
    if not isinstance(title, str) or not 1 <= len(title.strip()) <= 120:
        raise InvalidRound('event.title is invalid.')
    played_at = payload.get('played_at')
    if played_at is None:
        played_at = timezone.now()
    else:
        if isinstance(played_at, str):
            played_at = parse_datetime(played_at)
        if not isinstance(played_at, datetime):
            raise InvalidRound('played_at must be an ISO datetime.')
        if timezone.is_naive(played_at):
            played_at = timezone.make_aware(played_at)
    raw_pairings = payload.get('pairings')
    if not isinstance(raw_pairings, list) or not raw_pairings or len(raw_pairings) > 5000:
        raise InvalidRound('pairings must be a non-empty list.')
    pairs, seen = [], set()
    for item in raw_pairings:
        if not isinstance(item, dict):
            raise InvalidRound('Each pairing must be an object.')
        p1, p2 = _uuid(item.get('player1_id'), 'player1_id'), _uuid(item.get('player2_id'), 'player2_id')
        score = item.get('score')
        if isinstance(score, bool) or not isinstance(score, (int, float)) or float(score) not in SCORES:
            raise InvalidRound('score must be 1, 0.5 or 0.')
        if p1 == p2:
            raise InvalidRound('A player cannot play themselves.')
        if p1 in seen or p2 in seen:
            raise InvalidRound('A player can appear only once per round.')
        seen.update((p1, p2))
        pairs.append((p1, p2, float(score)))
    return pool, rated, (event_id, slug, title.strip()), played_at, pairs


def _clamp_rating(value: float) -> float:
    return min(float(RATING_MAX), max(float(RATING_MIN), value))


def _outcome(score: float) -> str:
    return 'win' if score == 1 else 'draw' if score == 0.5 else 'loss'


def _stored_outcome(run: RatingRun) -> RoundOutcome:
    data = run.outcome or {}
    return RoundOutcome(run.round_id, True, run.rated, data.get('players', 0), data.get('ledger_rows', 0))


def process_round(round_id, payload: dict) -> RoundOutcome:
    """Rate one round exactly once. A repeat call (any payload) returns the first outcome and changes nothing."""
    round_id = _uuid(round_id, 'round_id')
    pool, rated, (event_id, slug, title), played_at, pairs = _parse(payload)

    existing = RatingRun.objects.filter(round_id=round_id).first()
    if existing is not None:
        return _stored_outcome(existing)

    player_ids = sorted({pid for p1, p2, _ in pairs for pid in (p1, p2)}, key=str)
    try:
        with transaction.atomic():
            # The unique round_id is the gate: a concurrent twin blocks here, then fails with IntegrityError.
            run = RatingRun.objects.create(
                round_id=round_id, event_id=event_id, pool=pool, rated=rated, status='done', processed_at=timezone.now())

            known = set(User.objects.filter(pk__in=player_ids).values_list('pk', flat=True))
            if len(known) != len(player_ids):
                raise InvalidRound('Every player must be an existing account.')

            rows = []
            if rated:
                # Lock the pool rows in a stable order, create the missing ones, take ONE snapshot.
                for pid in player_ids:
                    PoolRating.objects.get_or_create(user_id=pid, pool=pool)
                locked = {
                    pr.user_id: pr
                    for pr in PoolRating.objects.select_for_update().filter(user_id__in=player_ids, pool=pool).order_by('user_id')
                }
                snapshot = {pid: glicko2.Rating(pr.rating, pr.rd, pr.volatility) for pid, pr in locked.items()}
                games = glicko2.games_from_pairs(snapshot, pairs)
                new = glicko2.compute_period(snapshot, games)
                new_values = {}
                for pid, value in new.items():
                    rating = _clamp_rating(value.rating)
                    rd = min(float(RD_CEILING), value.rd)
                    new_values[pid] = (rating, rd, value.volatility)
                for p1, p2, score in pairs:
                    for me, other, my_score in ((p1, p2, score), (p2, p1, 1 - score)):
                        before = round(_clamp_rating(snapshot[me].rating))
                        after = round(new_values[me][0])
                        rows.append(RatingLedgerEntry(
                            user_id=me, pool=pool, event_id=event_id, event_slug=slug, event_title=title,
                            round_id=round_id, opponent_id=other, outcome=_outcome(my_score), rated=True,
                            before=before, after=after, delta=after - before, created=played_at))
                RatingLedgerEntry.objects.bulk_create(rows)  # insert path only
                # Ledger first, ratings second (same transaction).
                for pid, (rating, rd, vol) in new_values.items():
                    pr = locked[pid]
                    pr.rating, pr.rd, pr.volatility = rating, rd, vol
                    pr.games += 1
                    pr.last_updated = played_at
                    pr.save(update_fields=['rating', 'rd', 'volatility', 'games', 'last_updated'])
            else:
                for p1, p2, score in pairs:
                    for me, other, my_score in ((p1, p2, score), (p2, p1, 1 - score)):
                        rows.append(RatingLedgerEntry(
                            user_id=me, pool=pool, event_id=event_id, event_slug=slug, event_title=title,
                            round_id=round_id, opponent_id=other, outcome=_outcome(my_score), rated=False,
                            before=None, after=None, delta=None, created=played_at))
                RatingLedgerEntry.objects.bulk_create(rows)

            run.outcome = {'players': len(player_ids), 'ledger_rows': len(rows)}
            run.save(update_fields=['outcome'])
    except IntegrityError:
        # Lost a race with an identical call: report the winner's outcome, change nothing.
        existing = RatingRun.objects.filter(round_id=round_id).first()
        if existing is None:
            raise
        return _stored_outcome(existing)

    logger.info('round_rated round=%s pool=%s rated=%s players=%s', round_id, pool, rated, len(player_ids))
    return RoundOutcome(round_id, False, rated, len(player_ids), len(rows))


def append_ledger_entry(**fields) -> RatingLedgerEntry:
    """Insert one ledger row (seed and data-repair path). Never updates; the model and the database reject changes."""
    entry = RatingLedgerEntry(**fields)
    entry.full_clean(exclude=['id'], validate_unique=False)
    entry.save()
    return entry


__all__ = ['process_round', 'append_ledger_entry', 'RoundOutcome', 'InvalidRound',
           'DEFAULT_RATING', 'DEFAULT_RD', 'DEFAULT_VOLATILITY']
