"""Creates the three demo accounts documented by the frontend mock (web/src/lib/mock/auth/demo-accounts.ts).

Development only: refuses to run unless DEBUG is on. The password is public on purpose.
"""
from django.conf import settings
from django.core.management.base import BaseCommand, CommandError

from accounts.models import Rating, User

DEMO_PASSWORD = 'pg-demo-1234'

ACCOUNTS = [
    {
        'id': 'a5e1d000-0000-4000-8000-000000000001', 'email': 'player@example.test', 'name': 'Asha Rao', 'role': 'player',
        'onboarding_done': True, 'city': 'Bengaluru', 'area': 'Indiranagar', 'phone': '+91 90000 00001',
        'chess_com_handle': 'asha_plays',
        'ratings': [('rapid', 1286, 8), ('blitz', 1198, 19)],
    },
    {
        'id': 'a5e1d000-0000-4000-8000-000000000002', 'email': 'admin@example.test', 'name': 'Rohan Menon', 'role': 'admin',
        'onboarding_done': True, 'city': 'Bengaluru', 'phone': '+91 90000 00002', 'ratings': [],
    },
    {
        'id': 'a5e1d000-0000-4000-8000-000000000003', 'email': 'new@example.test', 'name': 'Tara Singh', 'role': 'player',
        'onboarding_done': False, 'ratings': [],
    },
]


class Command(BaseCommand):
    help = 'Create or reset the dev demo accounts (DEBUG only).'

    def handle(self, *args, **options):
        if not settings.DEBUG:
            raise CommandError('seed_dev_accounts only runs with DEBUG=True.')
        for spec in ACCOUNTS:
            spec = dict(spec)
            ratings = spec.pop('ratings')
            email = spec.pop('email')
            user, _created = User.objects.update_or_create(email=email, defaults={**spec, 'status': 'active'})
            user.set_password(DEMO_PASSWORD)
            user.save(update_fields=['password'])
            for pool, rating, games in ratings:
                Rating.objects.update_or_create(user=user, pool=pool, defaults={'rating': rating, 'games_played': games})
            self.stdout.write(f'seeded {email} ({user.role})')
        self.stdout.write('Password for all demo accounts is pg-demo-1234 (dev only).')
