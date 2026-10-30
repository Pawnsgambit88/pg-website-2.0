"""Scheduler job (contract 5.2): release expired capacity holds and unclaimed waitlist offers, then promote the next
waitlisted players. Idempotent and safe to run concurrently (each event is processed under its row lock).

    python manage.py expire_holds_and_offers
"""
from django.core.management.base import BaseCommand

from registrations import services


class Command(BaseCommand):
    help = 'Release expired holds and offers and promote the waitlist (run every minute by the scheduler).'

    def handle(self, *args, **options):
        totals = services.expire_holds_and_offers()
        self.stdout.write(
            f"expire_holds_and_offers: events={totals['events']} released={totals['released']} promoted={totals['promoted']}")
