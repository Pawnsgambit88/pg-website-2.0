"""Manual entry point for the retry_pending_refunds job (also run by the scheduler/worker). Prints counts only."""
from django.core.management.base import BaseCommand

from payments.jobs import retry_pending_refunds


class Command(BaseCommand):
    help = 'Send pending refunds the provider has not accepted yet.'

    def handle(self, *args, **options):
        result = retry_pending_refunds()
        self.stdout.write(' '.join(f'{k}={v}' for k, v in result.items()))
