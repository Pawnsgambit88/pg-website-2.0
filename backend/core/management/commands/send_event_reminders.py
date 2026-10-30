"""Manual entry point for the send_event_triggers job (also run by the scheduler/worker). Prints counts only."""
from django.core.management.base import BaseCommand

from core.jobs import send_event_triggers


class Command(BaseCommand):
    help = 'Queue reminder, check-in-open and post-event email for the worker to deliver.'

    def handle(self, *args, **options):
        result = send_event_triggers()
        self.stdout.write(' '.join(f'{k}={v}' for k, v in result.items()))
