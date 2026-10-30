"""Rating data (contract 3.4 M10-M12, 5.4).

PoolRating   current Glicko-2 state per (user, pool). Only ratings.services writes it.
RatingLedgerEntry  APPEND-ONLY history, one row per (user, pool, round). Guarded in three places:
    1. the model (save() on an existing row and delete() raise),
    2. the queryset (bulk update()/delete() raise),
    3. the database (a trigger rejects UPDATE, DELETE and TRUNCATE; see migration 0001).
RatingRun    idempotency marker: one row per processed round (unique round_id). A round already in this table is never
             rated again.
"""
import uuid

from django.db import models
from django.utils import timezone

from accounts.models import User

POOLS = ('blitz', 'rapid', 'classical')
POOL_CHOICES = [(p, p) for p in POOLS]
OUTCOMES = ('win', 'draw', 'loss')

# Defaults for a player with no history (legacy defaults, Glickman's recommended start).
DEFAULT_RATING = 1500
DEFAULT_RD = 350
DEFAULT_VOLATILITY = 0.06
RD_CEILING = 700  # matches the DTO (rd max 700) and the legacy cap
RATING_MIN, RATING_MAX = 0, 4000  # matches the DTO


class AppendOnlyError(Exception):
    """Raised on any attempt to change or remove a ledger row."""


class PoolRating(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(User, on_delete=models.PROTECT, related_name='pool_ratings')
    pool = models.CharField(max_length=10, choices=POOL_CHOICES)
    rating = models.FloatField(default=DEFAULT_RATING)  # full precision; the API shows the rounded value
    rd = models.FloatField(default=DEFAULT_RD)
    volatility = models.FloatField(default=DEFAULT_VOLATILITY)  # never exposed
    games = models.PositiveIntegerField(default=0)  # rated games only
    last_updated = models.DateTimeField(default=timezone.now)

    class Meta:
        db_table = 'rating_pool_ratings'
        constraints = [
            models.UniqueConstraint(fields=['user', 'pool'], name='rating_pool_user_pool_unique'),
            models.CheckConstraint(condition=models.Q(pool__in=POOLS), name='rating_pool_pool_valid'),
        ]


class _LedgerQuerySet(models.QuerySet):
    def update(self, **kwargs):
        raise AppendOnlyError('The rating ledger is append-only.')

    def delete(self):
        raise AppendOnlyError('The rating ledger is append-only.')

    def bulk_update(self, *args, **kwargs):
        raise AppendOnlyError('The rating ledger is append-only.')


class RatingLedgerEntry(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(User, on_delete=models.PROTECT, related_name='rating_ledger')
    pool = models.CharField(max_length=10, choices=POOL_CHOICES)
    event_id = models.UUIDField()
    # Event link snapshot (the ledger must stay readable if the event is later renamed or unpublished).
    event_slug = models.CharField(max_length=100)
    event_title = models.CharField(max_length=120)
    round_id = models.UUIDField(null=True, blank=True)
    opponent_id = models.UUIDField(null=True, blank=True)
    # Display name for an opponent without an account (dev seed, guests). Never used when opponent_id resolves.
    opponent_label = models.CharField(max_length=80, blank=True)
    outcome = models.CharField(max_length=5, choices=[(o, o) for o in OUTCOMES])
    rated = models.BooleanField()
    # Unrated and social games: rated=False and before/after/delta are all NULL (no rating movement to show).
    before = models.IntegerField(null=True, blank=True)
    after = models.IntegerField(null=True, blank=True)
    delta = models.IntegerField(null=True, blank=True)
    created = models.DateTimeField(default=timezone.now, db_index=True)

    objects = _LedgerQuerySet.as_manager()

    class Meta:
        db_table = 'rating_ledger'
        indexes = [models.Index(fields=['user', 'pool', '-created'], name='rating_ledger_user_pool_time')]
        constraints = [
            # A round is rated once per player and pool (NULL round ids, used by manual entries, are distinct).
            models.UniqueConstraint(fields=['user', 'pool', 'round_id'], name='rating_ledger_round_once'),
            models.CheckConstraint(condition=models.Q(pool__in=POOLS), name='rating_ledger_pool_valid'),
            models.CheckConstraint(condition=models.Q(outcome__in=OUTCOMES), name='rating_ledger_outcome_valid'),
            models.CheckConstraint(
                condition=(
                    models.Q(rated=True, before__isnull=False, after__isnull=False, delta__isnull=False,
                             after=models.F('before') + models.F('delta'))
                    | models.Q(rated=False, before__isnull=True, after__isnull=True, delta__isnull=True)
                ),
                name='rating_ledger_arithmetic',
            ),
        ]

    def save(self, *args, **kwargs):
        if not self._state.adding:
            raise AppendOnlyError('The rating ledger is append-only.')
        kwargs['force_insert'] = True
        super().save(*args, **kwargs)

    def delete(self, *args, **kwargs):
        raise AppendOnlyError('The rating ledger is append-only.')


class RatingRun(models.Model):
    """One row per processed round. The unique round_id is the idempotency key."""

    STATUS_CHOICES = [('processing', 'processing'), ('done', 'done')]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    round_id = models.UUIDField(unique=True)
    event_id = models.UUIDField()
    pool = models.CharField(max_length=10, choices=POOL_CHOICES)
    rated = models.BooleanField()
    status = models.CharField(max_length=12, choices=STATUS_CHOICES, default='done')
    processed_at = models.DateTimeField(default=timezone.now)
    outcome = models.JSONField(default=dict)  # {"players": n, "ledger_rows": n}

    class Meta:
        db_table = 'rating_runs'
        constraints = [models.CheckConstraint(condition=models.Q(pool__in=POOLS), name='rating_run_pool_valid')]
