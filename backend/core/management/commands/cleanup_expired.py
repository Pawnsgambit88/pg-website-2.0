"""Manual entry point for the cleanup_expired job (also run by the scheduler/worker). Prints counts only."""
from django.core.management.base import BaseCommand

from core.jobs import cleanup_expired


class Command(BaseCommand):
    help = 'Delete expired tokens, idempotency keys, preview grants and stale uploads.'

    def handle(self, *args, **options):
        result = cleanup_expired()
        self.stdout.write(' '.join(f'{k}={v}' for k, v in result.items()))
