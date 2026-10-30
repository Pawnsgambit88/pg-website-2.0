"""DEBUG-only: play the customer's part of a Razorpay Checkout against the FAKE provider.

    python manage.py razorpay_fake_pay <razorpay_order_id> [--status captured|authorized|failed]
                                      [--amount-paise N] [--currency XXX] [--webhook]

Creates the fake payment and prints what Checkout would hand the browser (razorpay_order_id, razorpay_payment_id,
razorpay_signature) for POST /api/payments/verify. With --webhook it also prints a signed `payment.captured` /
`payment.failed` body plus headers for `curl` against POST /api/webhooks/razorpay. Refuses to run unless DEBUG is on
and RAZORPAY_MODE is 'fake'. The amount/currency/status overrides exist to exercise PAYMENT_MISMATCH paths.
"""
import json
import time

from django.conf import settings
from django.core.management.base import BaseCommand, CommandError

from payments import razorpay_client


class Command(BaseCommand):
    help = 'DEBUG only: simulate a customer paying a fake-provider order (prints signature and payment id).'

    def add_arguments(self, parser):
        parser.add_argument('order_id')
        parser.add_argument('--status', choices=['captured', 'authorized', 'failed'], default='captured')
        parser.add_argument('--amount-paise', type=int, default=None)
        parser.add_argument('--currency', default=None)
        parser.add_argument('--webhook', action='store_true', help='also print a signed webhook body and headers')

    def handle(self, *args, **opts):
        if not settings.DEBUG or not razorpay_client.is_fake():
            raise CommandError("razorpay_fake_pay only runs with DEBUG=True and RAZORPAY_MODE='fake'.")
        try:
            payment = razorpay_client.fake_make_payment(
                opts['order_id'], amount_paise=opts['amount_paise'], currency=opts['currency'], status=opts['status'])
        except razorpay_client.ProviderError:
            raise CommandError('Unknown fake order id (create it first with POST /api/payments/orders).') from None

        signature = razorpay_client.checkout_signature(payment['order_id'], payment['id'])
        self.stdout.write(json.dumps({
            'razorpay_order_id': payment['order_id'],
            'razorpay_payment_id': payment['id'],
            'razorpay_signature': signature,
        }, indent=2))
        if opts['webhook']:
            event = {'captured': 'payment.captured', 'authorized': 'payment.authorized',
                     'failed': 'payment.failed'}[opts['status']]
            body = json.dumps({'entity': 'event', 'event': event, 'contains': ['payment'],
                               'payload': {'payment': {'entity': payment}}, 'created_at': int(time.time())},
                              separators=(',', ':'))
            self.stdout.write('\n# POST /api/webhooks/razorpay with this exact body and these headers')
            self.stdout.write(f'X-Razorpay-Event-Id: evt_fake_{payment["id"][-10:]}_{opts["status"]}')
            self.stdout.write(f'X-Razorpay-Signature: {razorpay_client.webhook_signature(body.encode())}')
            self.stdout.write(body)
