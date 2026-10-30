from django.core.management.base import BaseCommand, CommandError
from django.db import connection

from core import rls


class Command(BaseCommand):
    help = ('Report Row Level Security state of every public table. Exits non-zero on Supabase when a table has RLS off. '
            '--apply enables RLS (no policies) on those tables (Supabase only).')

    def add_arguments(self, parser):
        parser.add_argument('--apply', action='store_true', help='enable RLS on tables that lack it (Supabase only)')

    def handle(self, *args, **opts):
        with connection.cursor() as cur:
            supabase = rls.is_supabase(cur)
            if opts['apply']:
                if not supabase:
                    self.stdout.write('Not a Supabase database (no anon/authenticated roles): nothing to apply.')
                else:
                    for name in rls.enable_rls(cur):
                        self.stdout.write('enabled RLS: %s' % name)
            state = rls.rls_state(cur)
        off = [name for name, enabled in state if not enabled]
        self.stdout.write('%d public table(s), %d with RLS off. Supabase: %s' % (len(state), len(off), 'yes' if supabase else 'no'))
        for name in off:
            self.stdout.write('  RLS off: %s' % name)
        if supabase and off:
            raise CommandError('RLS is off on %d public table(s); run `manage.py check_rls --apply`.' % len(off))
