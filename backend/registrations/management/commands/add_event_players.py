"""Add fictional confirmed players to an event (DEBUG only, idempotent).

    python manage.py add_event_players <event-slug> [--count 40] [--ignore-capacity]

Players are <prefix><nn>@example.test (default prefix `bulk-player`, unusable password) with a rapid-pool rating.
Re-running tops the event up to `--count` bulk players; existing ones are reused, never duplicated.
"""
from __future__ import annotations

import random
import uuid

from django.conf import settings
from django.core.management.base import BaseCommand, CommandError
from django.db import transaction
from django.utils import timezone

from accounts.models import Rating, User
from content.models import Event
from registrations import services
from registrations.models import Registration

NS = uuid.UUID('b5e1d000-0000-4000-8000-0000000000aa')


class Command(BaseCommand):
    help = 'Add N fictional confirmed players to an event (DEBUG only).'

    def add_arguments(self, parser):
        parser.add_argument('slug', help='Event slug.')
        parser.add_argument('--count', type=int, default=40, help='Number of bulk players on the event (default: 40).')
        parser.add_argument('--prefix', default='bulk-player', help='Email handle prefix (default: bulk-player).')
        parser.add_argument('--ignore-capacity', action='store_true', help='Allow going over Event.capacity.')

    def handle(self, *args, **options):
        if not settings.DEBUG:
            raise CommandError('add_event_players only runs with DEBUG=True.')
        count, prefix = options['count'], options['prefix']
        if count < 1:
            raise CommandError('--count must be at least 1.')
        rng = random.Random(options['slug'])  # stable ratings per event
        with transaction.atomic():
            event = Event.objects.select_for_update().filter(slug=options['slug']).first()
            if event is None:
                raise CommandError(f"No event with slug '{options['slug']}'.")
            users = [self._user(prefix, n, rng) for n in range(1, count + 1)]
            already = set(Registration.objects.filter(event=event, user__in=users, status__in=Registration.ACTIVE)
                          .values_list('user_id', flat=True))
            todo = [u for u in users if u.pk not in already]
            # capacity None = unlimited
            free = None if event.capacity is None else max(event.capacity - (event.confirmed_count or 0), 0)
            if free is not None and len(todo) > free and not options['ignore_capacity']:
                raise CommandError(f'Only {free} seats free on {event.slug} (capacity {event.capacity}); '
                                   f'{len(todo)} needed. Use --ignore-capacity to override.')
            now = timezone.now()
            for user in todo:
                Registration.objects.create(
                    user=user, event=event, status='confirmed', confirmed_at=now, amount_paise=event.price_paise,
                    payment_order_state='paid', refund_state='none')
            if todo:
                services.adjust_confirmed(event.pk, len(todo))
        self.stdout.write(self.style.SUCCESS(
            f'{event.slug}: added {len(todo)} players ({len(already)} already registered).'))

    def _user(self, prefix, n, rng):
        email = f'{prefix}{n:02d}@example.test'
        user = User.objects.filter(email=email).first()
        if user is None:
            user = User(id=uuid.uuid5(NS, email), email=email, name=f'Bulk Player {n:02d}', city='Hyderabad',
                        show_ratings=True, onboarding_done=True)
            user.set_unusable_password()
            user.save()
        Rating.objects.get_or_create(user=user, pool='rapid',
                                     defaults={'rating': rng.randint(900, 1700), 'games_played': 12})
        return user
