"""Background worker loop (Procfile `worker`): outbound email delivery and rating processing. Jobs are idempotent and
claim rows with SKIP LOCKED, so several workers may run side by side. `--once` runs every job once; `--job NAME`
limits the run to one job."""
import logging

from django.core.management.base import BaseCommand, CommandError

from core.jobs import run_loop

logger = logging.getLogger('pg.worker')

# (management command, interval seconds)
JOBS = [
    ('deliver_messages', 30),   # comms.delivery.run_all: event messages, transactional mail, contact
    ('process_ratings', 60),    # backstop for completed rounds whose ratings were not processed
]


class Command(BaseCommand):
    help = 'Run the background worker loop.'

    def add_arguments(self, parser):
        parser.add_argument('--once', action='store_true', help='Run every job once and exit.')
        parser.add_argument('--job', choices=[name for name, _ in JOBS], help='Run only this job.')

    def handle(self, *args, once=False, job=None, **options):
        try:
            run_loop(JOBS, once=once or job is not None, only=job, log=logger)
        except ValueError as exc:
            raise CommandError(str(exc)) from None
