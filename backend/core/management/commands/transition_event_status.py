"""Manual entry point for the transition_event_status job (also run by the scheduler/worker). Prints counts only."""
from django.core.management.base import BaseCommand

from core.jobs import transition_event_status


class Command(BaseCommand):
    help = 'Move events published -> registration_open -> ongoing by the clock.'

    def handle(self, *args, **options):
        result = transition_event_status()
        self.stdout.write(' '.join(f'{k}={v}' for k, v in result.items()))
