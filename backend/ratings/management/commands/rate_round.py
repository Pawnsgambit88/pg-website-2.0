"""Dev/ops entry point for process_round: rate_round --round-id UUID --json file.json (idempotent per round)."""
import json
import uuid

from django.core.management.base import BaseCommand, CommandError

from ratings.services import InvalidRound, process_round


class Command(BaseCommand):
    help = 'Rate one round from a JSON file (see ratings.services for the shape). Re-running is a no-op.'

    def add_arguments(self, parser):
        parser.add_argument('--json', required=True, help='Path to the round JSON file.')
        parser.add_argument('--round-id', help='Round UUID (overrides "round_id" in the file).')

    def handle(self, *args, **options):
        try:
            with open(options['json'], encoding='utf-8') as fh:
                payload = json.load(fh)
        except (OSError, ValueError) as exc:
            raise CommandError(f'Cannot read the round file ({type(exc).__name__}).') from None
        if not isinstance(payload, dict):
            raise CommandError('The round file must contain a JSON object.')
        round_id = options['round_id'] or payload.get('round_id') or str(uuid.uuid4())
        try:
            outcome = process_round(round_id, payload)
        except InvalidRound as exc:
            raise CommandError(str(exc)) from None
        state = 'already processed (no change)' if outcome.already_processed else 'processed'
        self.stdout.write(f'round {outcome.round_id} {state}: rated={outcome.rated} '
                          f'players={outcome.players} ledger_rows={outcome.ledger_rows}')
