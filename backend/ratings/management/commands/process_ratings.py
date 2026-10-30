"""Manual entry point for the rating backlog job (also run by the worker). Prints counts only."""
from django.core.management.base import BaseCommand

from adminapi.round_service import process_rating_backlog


class Command(BaseCommand):
    help = 'Rate completed rounds whose ratings were not processed (idempotent).'

    def handle(self, *args, **options):
        result = process_rating_backlog()
        self.stdout.write(' '.join(f'{k}={v}' for k, v in result.items()))
