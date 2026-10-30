"""Worker entry point (BE-12 schedules it): resolve queued event messages and deliver due email.

Safe to run concurrently with itself and with the after-request attempts (rows are claimed with skip_locked).
Prints counts only."""
from django.core.management.base import BaseCommand

from comms.delivery import DEFAULT_LIMIT, run_all


class Command(BaseCommand):
    help = 'Resolve event messages and deliver due messages, transactional email and contact submissions.'

    def add_arguments(self, parser):
        parser.add_argument('--limit', type=int, default=DEFAULT_LIMIT, help='Max rows claimed per step per run.')

    def handle(self, *args, limit=DEFAULT_LIMIT, **options):
        result = run_all(limit=max(1, limit))
        self.stdout.write(' '.join(f'{k}={v}' for k, v in result.items()))
