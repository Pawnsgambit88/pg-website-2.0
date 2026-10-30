"""Dev demo data for player@example.test, mirroring web/src/lib/mock/seeds/player-*.ts (DEBUG only, idempotent).

    python manage.py seed_dev_player_data [--room before|checkin|pairing|live|awaiting|between|complete]

Needs `seed_dev_accounts` and `seed_public_content` to have run (events are looked up by slug, never edited by slug
rules). Creates, if missing, three player-only demo events (description starts with "[DEMO]"): coffeehouse-rapid,
lakeside-blitz, coffeehouse-rapid-sep, plus nine fictional opponents (<name>@example.test, unusable password).

`--room` rewinds the clock of Beginner Circle (start time, check-in, rounds, pairings) so the Event Room shows that
state right now. Re-run with another value to switch. Default: before.
Rows this command owns are identified by fixed ids (registrations f5e1d000-..., demo rounds uuid5) and rebuilt every run.
"""
from __future__ import annotations

import uuid
from datetime import datetime, time, timedelta
from zoneinfo import ZoneInfo

from django.conf import settings
from django.core.management.base import BaseCommand, CommandError
from django.db import transaction
from django.utils import timezone

from accounts.models import Rating, User
from content import seed_data as d
from content.models import Event
from registrations.models import Pairing, Registration, Round

IST = ZoneInfo('Asia/Kolkata')
NS = uuid.UUID('b5e1d000-0000-4000-8000-000000000000')
ROOM_CHOICES = ['before', 'checkin', 'pairing', 'live', 'awaiting', 'between', 'complete']
PLAYER_EMAIL = 'player@example.test'
DEMO = '[DEMO] '

# name, email handle, city, rapid rating, show rating
OPPONENTS = {
    'aarav': ('Aarav Menon', 'Hyderabad', 1318, True),
    'ananya': ('Ananya Shah', 'Hyderabad', 1254, True),
    'arjun': ('Arjun Varma', None, 1301, True),
    'raghav': ('Raghav Iyer', 'Hyderabad', 1180, False),
    'meera': ('Meera Joshi', 'Hyderabad', 1190, True),
    'dev': ('Dev Menon', None, 1150, False),
    'ira': ('Ira Kapoor', 'Hyderabad', 1540, True),
    'kabir': ('Kabir Nair', None, 1222, True),
    'neha': ('Neha Reddy', 'Hyderabad', 1100, False),
}

# (white, black, outcome) per round; 'me' is player@example.test. Boards are the list order.
ROUNDS = {
    1: [('ira', 'dev', 'white'), ('arjun', 'raghav', 'white'), ('aarav', 'ananya', 'draw'), ('me', 'neha', 'white'),
        ('kabir', 'meera', 'draw')],
    2: [('ira', 'raghav', 'white'), ('arjun', 'dev', 'white'), ('kabir', 'me', 'draw'), ('aarav', 'meera', 'white'),
        ('ananya', 'neha', 'white')],
    3: [('ira', 'arjun', 'white'), ('kabir', 'ananya', 'black'), ('me', 'aarav', 'draw'), ('meera', 'neha', 'white'),
        ('dev', 'raghav', 'white')],
    4: [('me', 'meera', 'white'), ('ira', 'kabir', 'draw'), ('arjun', 'aarav', 'white'), ('ananya', 'dev', 'white'),
        ('neha', 'raghav', 'white')],
}

# Played-history games for M02/M03 (event slug, round no, opponent, outcome from the player's view)
HISTORY = [
    ('monsoon-open', 1, 'aarav', 'win'), ('monsoon-open', 2, 'meera', 'loss'), ('monsoon-open', 3, 'aarav', 'win'),
    ('monsoon-open', 4, 'ananya', 'win'), ('monsoon-open', 5, 'aarav', 'draw'), ('monsoon-open', 6, 'ananya', 'draw'),
    ('coffeehouse-rapid-sep', 1, 'arjun', 'draw'), ('coffeehouse-rapid-sep', 2, 'ira', 'loss'),
    ('coffeehouse-rapid-sep', 3, 'ananya', 'draw'), ('coffeehouse-rapid-sep', 4, 'aarav', 'win'),
    ('coffeehouse-rapid-sep', 5, 'meera', 'win'),
]

EXTRA_EVENTS = [
    {'id': 'e5e1d000-0000-4000-8000-000000000011', 'slug': 'coffeehouse-rapid', 'title': 'Coffeehouse Rapid',
     'status': 'registration_open', 'starts': (9, '18:00'), 'ends': (9, '21:30'), 'opens': (-5, '10:00'),
     'closes': (9, '12:00'), 'price_paise': 30000, 'capacity': 30, 'confirmed': 12, 'waitlist': True,
     'time_control': '15+10'},
    {'id': 'e5e1d000-0000-4000-8000-000000000012', 'slug': 'lakeside-blitz', 'title': 'Lakeside Blitz',
     'status': 'registration_open', 'starts': (12, '19:00'), 'ends': (12, '22:00'), 'opens': (-3, '10:00'),
     'closes': (12, '17:00'), 'price_paise': 30000, 'capacity': 30, 'confirmed': 10, 'waitlist': False,
     'time_control': '5+2'},
    {'id': 'e5e1d000-0000-4000-8000-000000000013', 'slug': 'coffeehouse-rapid-sep', 'title': 'Coffeehouse Rapid',
     'status': 'completed', 'starts_abs': datetime(2026, 9, 5, 17, 0, tzinfo=IST),
     'ends_abs': datetime(2026, 9, 5, 21, 0, tzinfo=IST), 'opens_abs': datetime(2026, 8, 20, 10, 0, tzinfo=IST),
     'closes_abs': datetime(2026, 9, 5, 12, 0, tzinfo=IST), 'price_paise': 30000, 'capacity': 30, 'confirmed': 30,
     'waitlist': False, 'time_control': '15+10'},
]

# minutes from NOW at which Beginner Circle starts, per --room value
START_OFFSET_MIN = {'before': None, 'checkin': 20, 'pairing': -5, 'live': -60, 'awaiting': -70, 'between': -95,
                    'complete': -240}


def ist_at(days, hhmm, today):
    h, m = map(int, hhmm.split(':'))
    return datetime.combine(today + timedelta(days=days), time(h, m), tzinfo=IST)


def round_id(slug, number):
    return uuid.uuid5(NS, f'{slug}:{number}')


class Command(BaseCommand):
    help = 'Seed player@example.test demo registrations, rounds and games (DEBUG only).'

    def add_arguments(self, parser):
        parser.add_argument('--room', choices=ROOM_CHOICES, default='before',
                            help='Event Room state of Beginner Circle (default: before).')

    def handle(self, *args, **options):
        if not settings.DEBUG:
            raise CommandError('seed_dev_player_data only runs with DEBUG=True.')
        player = User.objects.filter(email=PLAYER_EMAIL).first()
        if player is None:
            raise CommandError('Run seed_dev_accounts first (player@example.test is missing).')
        slugs = ['saturday-social', 'beginner-circle', 'after-work-blitz', 'monsoon-open']
        events = {e.slug: e for e in Event.objects.filter(slug__in=slugs)}
        missing = [s for s in slugs if s not in events]
        if missing:
            raise CommandError('Run seed_public_content first (missing events: ' + ', '.join(missing) + ').')
        with transaction.atomic():
            events.update(self._extra_events())
            people = self._opponents()
            people['me'] = player
            self._registrations(player, events, people)
            self._history(player, events, people)
            self._room(player, events, people, options['room'])
        self.stdout.write(self.style.SUCCESS(f"seeded demo player data (room={options['room']})"))

    # ---------------------------------------------------------------- events and people
    def _extra_events(self):
        today = timezone.now().astimezone(IST).date()
        made = {}
        for spec in EXTRA_EVENTS:
            event = Event.objects.filter(slug=spec['slug']).first()
            if event is None:
                starts = spec.get('starts_abs') or ist_at(*spec['starts'], today)
                ends = spec.get('ends_abs') or ist_at(*spec['ends'], today)
                event = Event(
                    id=spec['id'], slug=spec['slug'], title=spec['title'],
                    promise='Demo event for the player area.', description=DEMO + 'Dev-only event created by seed_dev_player_data.',
                    type='rated_tournament', audience='all_levels', status=spec['status'], pairing_mode='swiss',
                    starts_at=starts, ends_at=ends, area='Madhapur', city='Hyderabad', venue_name='The Filter Room',
                    address='1 Demo Lane, Madhapur, Hyderabad', format='Rated play', time_control=spec['time_control'],
                    price_paise=spec['price_paise'], capacity=spec['capacity'], confirmed_count=spec['confirmed'],
                    registration_opens_at=spec.get('opens_abs') or ist_at(*spec['opens'], today),
                    registration_closes_at=spec.get('closes_abs') or ist_at(*spec['closes'], today),
                    waitlist_enabled=spec['waitlist'], rated=True, rating_pool='rapid',
                    experience=d.EXPERIENCE, faq=d.FAQ, logistics=d.LOGISTICS,
                    at_a_glance={'membershipRequired': False, 'hostedArrival': True},
                )
                event.save()
            made[spec['slug']] = event
        return made

    def _opponents(self):
        people = {}
        for i, (key, (name, city, rating, show)) in enumerate(OPPONENTS.items(), start=1):
            user = User.objects.filter(email=f'{key}@example.test').first()
            if user is None:
                user = User(id=f'a5e1d000-0000-4000-8000-0000000001{i:02d}', email=f'{key}@example.test', name=name,
                            city=city, show_ratings=show, onboarding_done=True)
                user.set_unusable_password()
                user.save()
            Rating.objects.get_or_create(user=user, pool='rapid', defaults={'rating': rating, 'games_played': 12})
            people[key] = user
        return people

    # ---------------------------------------------------------------- registrations
    def _upsert_reg(self, rid, user, event, created_at, **fields):
        reg, _ = Registration.objects.update_or_create(
            pk=rid, defaults={'user': user, 'event': event, **fields})
        Registration.objects.filter(pk=rid).update(created_at=created_at)
        return reg

    def _registrations(self, player, events, people):
        now = timezone.now()
        paid = {'payment_order_state': 'paid', 'refund_state': 'none'}
        ids = {k: f'f5e1d000-0000-4000-8000-00000000000{n}' for n, k in enumerate(
            ['beginner-circle', 'after-work-blitz', 'coffeehouse-rapid', 'lakeside-blitz', 'monsoon-open',
             'coffeehouse-rapid-sep'], start=1)}
        ago = lambda **kw: now - timedelta(**kw)  # noqa: E731
        bc = events['beginner-circle']
        self._upsert_reg(ids['beginner-circle'], player, bc, ago(days=4), status='confirmed', confirmed_at=ago(days=4),
                         amount_paise=bc.price_paise, hold_expires_at=None, offer_expires_at=None, **paid)
        # Waitlist: two others ahead of the player (position 3).
        awb = events['after-work-blitz']
        for n, key in enumerate(['dev', 'raghav']):
            self._upsert_reg(f'f5e1d000-0000-4000-8000-00000000010{n}', people[key], awb, ago(days=3), status='waitlist',
                             waitlisted_at=ago(days=3, minutes=-n), amount_paise=awb.price_paise)
        self._upsert_reg(ids['after-work-blitz'], player, awb, ago(days=2), status='waitlist', waitlisted_at=ago(days=2),
                         amount_paise=awb.price_paise, hold_expires_at=None, offer_expires_at=None)
        # Pending payment with a fresh hold (re-running the seed refreshes the clock).
        cr = events['coffeehouse-rapid']
        self._upsert_reg(ids['coffeehouse-rapid'], player, cr, ago(minutes=1), status='pending', amount_paise=cr.price_paise,
                         hold_expires_at=now + timedelta(minutes=9), payment_order_state='created', refund_state='none')
        lk = events['lakeside-blitz']
        self._upsert_reg(ids['lakeside-blitz'], player, lk, ago(days=6), status='cancelled', cancelled_at=ago(days=1),
                         amount_paise=lk.price_paise, payment_order_state='paid', refund_state='pending')
        mo = events['monsoon-open']
        self._upsert_reg(ids['monsoon-open'], player, mo, ago(days=62), status='confirmed', confirmed_at=ago(days=62),
                         amount_paise=mo.price_paise, **paid)
        cs = events['coffeehouse-rapid-sep']
        self._upsert_reg(ids['coffeehouse-rapid-sep'], player, cs, ago(days=59), status='confirmed',
                         confirmed_at=ago(days=59), amount_paise=cs.price_paise, **paid)

    # ---------------------------------------------------------------- rounds
    def _rebuild(self, event, number, state, rows, people, *, times_from, results='final', submitted=None):
        """Create one demo round with pairings. rows = [(white, black, outcome)]; results final unless overridden."""
        rid = round_id(event.slug, number)
        Round.objects.filter(pk=rid).delete()
        at = times_from + timedelta(minutes=40 * number)
        rnd = Round.objects.create(
            id=rid, event=event, number=number, state=state, time_control=event.time_control[:40],
            published_at=at - timedelta(minutes=5), started_at=at if state in ('live', 'completed') else None,
            completed_at=at + timedelta(minutes=30) if state == 'completed' else None,
            ratings_processed_at=at + timedelta(minutes=31) if state == 'completed' and event.rated else None)
        for board, (white, black, outcome) in enumerate(rows, start=1):
            fields = dict(round=rnd, board=board, white=people[white], black=people[black],
                          time_control=event.time_control[:40])
            if results == 'final':
                fields.update(result_state='final', outcome=outcome, finalised_at=rnd.completed_at or at)
            if submitted and (white, black) == submitted[0]:
                fields.update(result_state='submitted', outcome=submitted[2], submitted_by=people[submitted[1]],
                              submitted_at=timezone.now())
            Pairing.objects.create(**fields)
        return rnd

    def _history(self, player, events, people):
        for slug in ('monsoon-open', 'coffeehouse-rapid-sep'):
            event = events[slug]
            numbers = sorted({n for s, n, _o, _r in HISTORY if s == slug})
            for number in numbers:
                (_, _, opp, result), = [h for h in HISTORY if h[0] == slug and h[1] == number]
                outcome = {'win': 'white', 'loss': 'black', 'draw': 'draw'}[result]
                self._rebuild(event, number, 'completed', [('me', opp, outcome)], people,
                              times_from=event.starts_at - timedelta(minutes=30))

    def _room(self, player, events, people, mode):
        event = events['beginner-circle']
        now = timezone.now()
        today = now.astimezone(IST).date()
        offset = START_OFFSET_MIN[mode]
        if offset is None:  # restore the content seed's own schedule (day+2 11:00)
            starts = ist_at(2, '11:00', today)
            ends = ist_at(2, '14:00', today)
            closes = ist_at(2, '09:00', today)
        else:
            starts = now + timedelta(minutes=offset)
            ends = starts + timedelta(hours=3)
            closes = starts - timedelta(minutes=5)
        status = 'completed' if mode == 'complete' else 'registration_open'
        # Queryset update on purpose: demo clock changes must not bump versions or enqueue revalidation rows.
        Event.objects.filter(pk=event.pk).update(starts_at=starts, ends_at=ends, registration_closes_at=closes, status=status)
        event.refresh_from_db()

        for number in ROUNDS:  # wipe this event's demo rounds
            Round.objects.filter(pk=round_id(event.slug, number)).delete()
        checked_in = mode in ('pairing', 'live', 'awaiting', 'between', 'complete')
        Registration.objects.filter(user=player, event=event).update(
            checked_in_at=(starts - timedelta(minutes=12)) if checked_in else None,
            check_in_source='self' if checked_in else '')

        if mode in ('live', 'awaiting', 'between', 'complete'):
            for number in (1, 2):
                self._rebuild(event, number, 'completed', ROUNDS[number], people, times_from=starts - timedelta(minutes=40))
        if mode in ('live', 'awaiting'):
            submitted = (('me', 'aarav'), 'aarav', 'draw') if mode == 'awaiting' else None
            self._rebuild(event, 3, 'live', ROUNDS[3], people, times_from=starts - timedelta(minutes=40),
                          results='none', submitted=submitted)
        if mode == 'complete':
            for number in (3, 4):
                self._rebuild(event, number, 'completed', ROUNDS[number], people, times_from=starts - timedelta(minutes=40))
