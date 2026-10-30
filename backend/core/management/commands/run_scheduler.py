"""Long-running scheduler loop (Procfile `scheduler`). Each job is idempotent, row-locked and safe to repeat, and is
also a management command for manual runs. `--once` runs every job once; `--job NAME` limits the run to one job."""
import logging

from django.core.management.base import BaseCommand, CommandError

from core.jobs import run_loop

logger = logging.getLogger('pg.scheduler')

# (management command, interval seconds)
JOBS = [
    ('expire_holds_and_offers', 60),   # release expired holds/offers, promote the waitlist
    ('dispatch_revalidation', 30),     # revalidation outbox retry
    ('transition_event_status', 60),   # published -> registration_open -> ongoing by the clock
    ('send_event_reminders', 300),     # reminder_24h, checkin_open, post_event (queued; the worker delivers)
    ('retry_refunds', 120),            # pending refunds the provider has not accepted yet
    ('reconcile_payments', 3600),      # hourly provider comparison (flags only)
    ('cleanup_expired', 86400),        # daily: tokens, idempotency keys, preview grants, stale uploads
]


class Command(BaseCommand):
    help = 'Run scheduled jobs in a loop.'

    def add_arguments(self, parser):
        parser.add_argument('--once', action='store_true', help='Run every job once and exit.')
        parser.add_argument('--job', choices=[name for name, _ in JOBS], help='Run only this job.')

    def handle(self, *args, once=False, job=None, **options):
        try:
            run_loop(JOBS, once=once or job is not None, only=job, log=logger)
        except ValueError as exc:
            raise CommandError(str(exc)) from None
