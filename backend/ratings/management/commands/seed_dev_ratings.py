"""Demo rating data for player@example.test, mirroring web/src/lib/mock/seeds/player-ratings.ts. DEBUG only.

Blitz established 1198 (19 games), Rapid provisional 1286 (8 games), Classical unrated. Ledger rows go through
ratings.services.append_ledger_entry (insert only). Idempotent: rows have fixed ids and are skipped when present;
timestamps are fixed at the first run (re-seed from an empty ledger to refresh them). Run seed_dev_accounts first.
"""
import uuid
from datetime import timedelta

from django.conf import settings
from django.core.management.base import BaseCommand, CommandError
from django.db import transaction
from django.utils import timezone

from accounts.models import User
from ratings.models import PoolRating, RatingLedgerEntry
from ratings.services import append_ledger_entry

COFFEE = ('coffeehouse-rapid-sep', 'Coffeehouse Rapid')
SOCIAL = ('saturday-social', 'Saturday Social')
BLITZ = ('after-work-blitz', 'After Work Blitz')
MONSOON = ('monsoon-open', 'Monsoon Open')
NS = uuid.UUID('c5e1d000-0000-4000-8000-00000000ffff')

# (n, pool, days ago, HH:MM, opponent, outcome, delta, event) - newest first like the mock.
ROWS = [
    (1, 'rapid', 6, '16:40', 'Ananya Shah', 'win', 18, SOCIAL),
    (2, 'blitz', 9, '21:10', 'Raghav Iyer', 'loss', -11, BLITZ),
    (3, 'rapid', 17, '18:30', 'Arjun Varma', 'draw', 2, COFFEE),
    (4, 'rapid', 21, '15:20', 'Meera Joshi', 'loss', -8, MONSOON),
    (5, 'rapid', 21, '13:05', 'Aarav Menon', 'win', 14, MONSOON),
    (6, 'blitz', 30, '20:50', 'Kabir Nair', 'win', 22, BLITZ),
    (7, 'rapid', 38, '17:15', 'Ira Kapoor', 'loss', -6, COFFEE),
    (8, 'rapid', 52, '16:00', 'Neha Reddy', 'win', 9, SOCIAL),
    (9, 'rapid', 66, '17:45', 'Aarav Menon', 'win', 12, MONSOON),
    (10, 'rapid', 80, '16:30', 'Ananya Shah', 'draw', 1, COFFEE),
    (11, 'blitz', 45, '20:30', 'Raghav Iyer', 'win', 15, BLITZ),
    (12, 'blitz', 60, '20:10', 'Kabir Nair', 'loss', -9, BLITZ),
    (13, 'blitz', 75, '20:40', 'Neha Reddy', 'draw', 3, BLITZ),
]
FINALS = {'rapid': (1286, 142, 8), 'blitz': (1198, 88, 19)}


def _when(days_ago, hhmm):
    hour, minute = map(int, hhmm.split(':'))
    day = timezone.localtime(timezone.now()).replace(hour=hour, minute=minute, second=0, microsecond=0)
    return day - timedelta(days=days_ago)


class Command(BaseCommand):
    help = 'Seed demo ratings and ledger for player@example.test (DEBUG only, idempotent).'

    def handle(self, *args, **options):
        if not settings.DEBUG:
            raise CommandError('seed_dev_ratings only runs with DEBUG=True.')
        user = User.objects.filter(email='player@example.test').first()
        if user is None:
            raise CommandError('Run seed_dev_accounts first.')
        ordered = sorted(ROWS, key=lambda r: (_when(r[2], r[3])), reverse=True)
        after = {pool: final[0] for pool, final in FINALS.items()}
        added = 0
        with transaction.atomic():
            for n, pool, days, hhmm, opponent, outcome, delta, (slug, title) in ordered:
                row_after = after[pool]
                before = row_after - delta
                after[pool] = before
                row_id = uuid.UUID(f'c5e1d000-0000-4000-8000-0000000001{n:02d}')
                if RatingLedgerEntry.objects.filter(pk=row_id).exists():
                    continue
                append_ledger_entry(
                    id=row_id, user=user, pool=pool, event_id=uuid.uuid5(NS, slug), event_slug=slug, event_title=title,
                    round_id=uuid.uuid5(NS, f'round-{n}'), opponent_label=opponent, outcome=outcome, rated=True,
                    before=before, after=row_after, delta=delta, created=_when(days, hhmm))
                added += 1
            # One unrated (social) game: no delta, never listed in the rating ledger.
            social_id = uuid.UUID('c5e1d000-0000-4000-8000-000000000199')
            if not RatingLedgerEntry.objects.filter(pk=social_id).exists():
                append_ledger_entry(
                    id=social_id, user=user, pool='rapid', event_id=uuid.uuid5(NS, SOCIAL[0]), event_slug=SOCIAL[0],
                    event_title=SOCIAL[1], round_id=uuid.uuid5(NS, 'round-199'), opponent_label='Dev Menon',
                    outcome='win', rated=False, before=None, after=None, delta=None, created=_when(13, '17:30'))
                added += 1
            for pool, (rating, rd, games) in FINALS.items():
                PoolRating.objects.update_or_create(
                    user=user, pool=pool, defaults={'rating': rating, 'rd': rd, 'volatility': 0.06, 'games': games})
        self.stdout.write(f'seeded ratings for player@example.test ({added} new ledger rows)')
