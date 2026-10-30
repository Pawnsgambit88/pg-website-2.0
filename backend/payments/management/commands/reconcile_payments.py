"""Manual entry point for the reconcile_all job (also run by the scheduler/worker). Prints counts only."""
from django.core.management.base import BaseCommand

from payments.jobs import reconcile_all


class Command(BaseCommand):
    help = 'Compare a batch of payments with the provider and flag mismatches.'

    def handle(self, *args, **options):
        result = reconcile_all()
        self.stdout.write(' '.join(f'{k}={v}' for k, v in result.items()))
