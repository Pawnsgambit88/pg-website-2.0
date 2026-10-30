"""Scheduler jobs for payments (BE-12): hourly reconcile and the pending-refund retry.

Both are safe to repeat and to run from two schedulers at once. Logs carry the job name and counts only.
"""
from __future__ import annotations

import logging
from datetime import timedelta

from django.db import transaction
from django.db.models import Sum
from django.utils import timezone

from . import reconcile as reconcile_module
from . import services
from .models import Payment, PaymentRefund

logger = logging.getLogger('pg.payments')

RETRY_BATCH = 50
RETRY_MIN_AGE = timedelta(minutes=2)  # the request that created the refund makes its own first attempt


def reconcile_all() -> dict:
    """One bounded sweep (the least recently checked payments first). Never changes money state, only flags."""
    result = reconcile_module.reconcile()
    logger.info('job=reconcile_payments checked=%d new_mismatches=%d open_mismatches=%d',
                result.checked, result.new_mismatches, result.mismatches)
    return {'checked': result.checked, 'new_mismatches': result.new_mismatches, 'open_mismatches': result.mismatches}


def _over_refund_guard(refund: PaymentRefund) -> bool:
    """True when sending this refund could refund more than was paid. Checked under the payment row lock, so two
    schedulers cannot both pass it for the same payment."""
    with transaction.atomic():
        payment = Payment.objects.select_for_update().get(pk=refund.payment_id)
        if payment.status != 'captured':  # same rule as refund_payment: only a captured payment can be refunded
            return True
        in_flight = PaymentRefund.objects.filter(payment=payment, state='pending').aggregate(
            t=Sum('amount_paise'))['t'] or 0
        return payment.refunded_paise + in_flight > payment.amount_paise


def retry_pending_refunds(limit: int = RETRY_BATCH) -> dict:
    """Send pending refunds the provider has not accepted yet (`sent_to_provider=False`).

    No double refund: (1) `execute_refund` re-reads the row under `FOR UPDATE` and skips anything already sent or no
    longer pending; (2) the provider call carries the refund row id as its reference; (3) a refund whose payment is no
    longer `captured` or whose pending total would exceed the amount paid is failed, not sent. Refunds already sent and
    awaiting the provider's verdict are never re-sent (the webhook or reconcile settles them)."""
    cutoff = timezone.now() - RETRY_MIN_AGE
    rows = list(PaymentRefund.objects.filter(state='pending', sent_to_provider=False, created_at__lte=cutoff)
                .order_by('created_at', 'pk')[:limit])
    sent = failed = deferred = 0
    for row in rows:
        if _over_refund_guard(row):
            services.finish_refund(row.pk, 'failed')
            logger.warning('refund_blocked_over_limit')
            failed += 1
            continue
        after = services.execute_refund(row)
        if after.state == 'pending' and not after.sent_to_provider:
            deferred += 1  # provider outage: stays pending for the next run
        elif after.state == 'failed':
            failed += 1
        else:
            sent += 1
    logger.info('job=retry_refunds sent=%d failed=%d deferred=%d', sent, failed, deferred)
    return {'sent': sent, 'failed': failed, 'deferred': deferred}
