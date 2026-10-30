"""Scheduler backstop: deliver due revalidation outbox rows (no-op when REVALIDATE_URL/SECRET are unset).

Safe to run concurrently with itself and with the on-commit delivery path (rows are locked with skip_locked)."""
import logging

from django.core.management.base import BaseCommand

from content.revalidation import DEFAULT_BATCH, dispatch_pending

logger = logging.getLogger('pg.revalidate')


class Command(BaseCommand):
    help = 'Deliver due revalidation outbox rows.'

    def add_arguments(self, parser):
        parser.add_argument('--limit', type=int, default=DEFAULT_BATCH, help='Max rows claimed per run.')

    def handle(self, *args, limit=DEFAULT_BATCH, **options):
        delivered = dispatch_pending(limit=max(1, limit))
        logger.info('job=dispatch_revalidation delivered=%d', delivered)
        self.stdout.write(f'delivered={delivered}')
