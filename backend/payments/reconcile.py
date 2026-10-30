"""Payment reconciliation (contract G06, F-PAY-009): compare provider and PG records, flag disagreements.

It NEVER changes a payment, order or registration: a disagreement becomes an open `PaymentMismatch` row that admins see
in the ledger (G04). Provider calls run outside any transaction. Bounded: at most `BATCH` payments per run, the least
recently checked first, so repeated runs (admin or the BE-12 scheduler) sweep the whole ledger. Safe to repeat: an open
mismatch of the same kind for the same payment is not created twice.
"""
from __future__ import annotations

import logging
from dataclasses import dataclass

from django.db.models import Q
from django.utils import timezone

from . import razorpay_client
from .models import Payment, PaymentMismatch, PaymentRefund
from .services import PROVIDER_STATUS

logger = logging.getLogger('pg.payments')

BATCH = 100
SOURCE = 'reconcile'


@dataclass
class Result:
    checked: int
    mismatches: int  # open mismatches in scope after the run
    new_mismatches: int
    ran_at: object


def _open(payment: Payment, reason: str) -> bool:
    return PaymentMismatch.objects.filter(payment=payment, reason=reason, resolved_at__isnull=True).exists()


def _flag(payment, reason, *, expected=None, actual=None, expected_currency='', actual_currency='') -> int:
    if _open(payment, reason):
        return 0
    PaymentMismatch.objects.create(
        order=payment.order, payment=payment, source=SOURCE, reason=reason,
        provider_order_id=payment.order.provider_order_id, provider_payment_id=payment.provider_payment_id,
        expected_amount_paise=expected, actual_amount_paise=actual, expected_currency=expected_currency,
        actual_currency=actual_currency)
    logger.warning('payment_mismatch source=%s reason=%s', SOURCE, reason)
    return 1


def _compare(payment: Payment, entity: dict, in_flight: bool) -> int:
    """-> number of new mismatch rows for one payment."""
    order = payment.order
    new = 0
    order_id, amount, currency = entity.get('order_id'), entity.get('amount'), entity.get('currency')
    if order_id != order.provider_order_id:
        new += _flag(payment, 'ORDER')
    if isinstance(amount, int) and amount != order.amount_paise:
        new += _flag(payment, 'AMOUNT', expected=order.amount_paise, actual=amount)
    if isinstance(currency, str) and currency[:3] != order.currency:
        new += _flag(payment, 'CURRENCY', expected_currency=order.currency, actual_currency=currency[:3])
    status = PROVIDER_STATUS.get(entity.get('status'))
    refunded = entity.get('amount_refunded')
    refunded = refunded if isinstance(refunded, int) and not isinstance(refunded, bool) else payment.refunded_paise
    if not in_flight:  # a refund we sent and have not finished explains a temporary difference
        if status is not None and status != payment.status:
            new += _flag(payment, 'STATUS')
        elif refunded != payment.refunded_paise:
            new += _flag(payment, 'STATUS')
    return new


def reconcile(event_id=None, *, limit: int = BATCH) -> Result:
    qs = Payment.objects.select_related('order').filter(status__in=['authorized', 'captured', 'refunded'])
    if event_id is not None:
        qs = qs.filter(order__registration__event_id=event_id)
    batch = list(qs.order_by('reconciled_at', 'created_at', 'id')[:min(limit, BATCH)])
    pending = set(PaymentRefund.objects.filter(payment__in=batch, state='pending').values_list('payment_id', flat=True))
    checked = new = 0
    for payment in batch:
        try:
            entity = razorpay_client.fetch_payment(payment.provider_payment_id)
        except razorpay_client.ProviderRejected:
            new += _flag(payment, 'MISSING_PROVIDER')
        except razorpay_client.ProviderError:
            continue  # provider trouble: not checked, retried on the next run
        else:
            new += _compare(payment, entity, payment.pk in pending)
        checked += 1
        Payment.objects.filter(pk=payment.pk).update(reconciled_at=timezone.now())  # leaves updated_at alone
    scope = Q(resolved_at__isnull=True)
    if event_id is not None:
        scope &= Q(order__registration__event_id=event_id) | Q(payment__order__registration__event_id=event_id)
    return Result(checked=checked, mismatches=PaymentMismatch.objects.filter(scope).count(), new_mismatches=new,
                  ran_at=timezone.now())
