"""Payments service layer (contract 3.3 R04/R05, 5.1, 5.3, 6.1 L3/L10/L11).

Rules this module enforces:
  * The browser never supplies price, key or amount. Amount, currency and key come from the server-owned
    registration/order (R04).
  * R05 trusts nothing from the browser: ownership, constant-time checkout signature, then the payment is FETCHED from
    the provider and order id, exact amount, currency and status are checked against the order.
  * R05 and the webhook share `record_payment`, so both paths write the same ledger and move state the same way.
  * State moves forward only (see `ORDER_ALLOWED`, `PAYMENT_RANK`).
  * Lock order everywhere: event row -> registration -> order -> payment -> refund. Provider calls never run while
    the event row is locked (R04 holds only the registration row so two taps cannot create two orders).
  * Late capture (money arrived after the hold lapsed and no seat exists) = auto-refund, with the registration showing
    refund state `pending` until the provider confirms.
  * Logs carry reason codes only: never bodies, signatures, secrets, emails.
"""
from __future__ import annotations

import logging
from dataclasses import dataclass

from django.db import transaction
from django.db.models import Sum
from django.utils import timezone

from core.errors import (AlreadyRegistered, HoldExpired, InvalidSignature, NotFound, PaymentMismatch,
                         ValidationFailed)
from core.responses import iso
from registrations import rules
from registrations import services as reg_services
from registrations.errors import PaymentUnavailable
from registrations.models import Registration

from . import razorpay_client
from .models import Payment, PaymentMismatch as MismatchRecord, PaymentOrder, PaymentRefund

logger = logging.getLogger('pg.payments')

CURRENCY = 'INR'

ORDER_ALLOWED = {
    'created': {'attempted', 'paid', 'failed', 'expired'},
    'attempted': {'paid', 'failed'},
    'failed': {'attempted', 'paid', 'expired'},
    'expired': {'paid'},
    'paid': {'refunded'},
    'refunded': set(),
}
PAYMENT_RANK = {'failed': 1, 'authorized': 1, 'captured': 2, 'refunded': 3}
PROVIDER_STATUS = {'captured': 'captured', 'authorized': 'authorized', 'failed': 'failed', 'refunded': 'refunded'}


class RefundError(Exception):
    """A refund request that cannot be made (wrong payment state, amount too large). Reason code in args[0]."""


@dataclass
class Outcome:
    kind: str  # confirmed | confirming | already_confirmed | late_refund | failed | mismatch | unknown_order |
    #            ignored | refunded_at_provider
    registration: Registration | None = None
    refund: PaymentRefund | None = None


# ================================================================= R04

def create_order(user, registration_id) -> dict:
    """R04: create or return the single order for a registration with a live hold."""
    reg_services.owned_registration(user, registration_id)  # 404 before any lock
    with transaction.atomic():
        reg = (Registration.objects.select_related('event').select_for_update(of=('self',))
               .get(pk=reg_services.owned_registration(user, registration_id).pk))
        now = timezone.now()
        status = rules.effective_status(reg, now)
        if status == 'confirmed':
            raise AlreadyRegistered()
        if status not in ('pending', 'confirming'):
            raise HoldExpired()
        order = PaymentOrder.objects.filter(registration=reg).first()
        if order is None:
            if reg.amount_paise <= 0:
                raise ValidationFailed(fields={'registrationId': ['This registration needs no payment.']})
            try:  # row lock on THIS registration only; bounded by the client timeouts
                provider = razorpay_client.create_order(
                    amount_paise=reg.amount_paise, currency=CURRENCY, receipt=str(reg.pk),
                    notes={'registration': str(reg.pk)})
                provider_order_id = provider['id']
            except (razorpay_client.ProviderError, KeyError, TypeError):
                logger.warning('payment_order_create_failed')
                raise PaymentUnavailable() from None
            order = PaymentOrder.objects.create(
                registration=reg, user=user, provider_order_id=provider_order_id, amount_paise=reg.amount_paise,
                currency=CURRENCY, state='created')
            reg.payment_order_state = 'created'
            reg.save(update_fields=['payment_order_state', 'updated_at'])
        elif order.state in ('paid', 'refunded'):
            raise AlreadyRegistered()
        return {
            'orderId': order.provider_order_id,
            'amountPaise': order.amount_paise,
            'currency': order.currency,
            'keyId': razorpay_client.key_id(),
            'holdExpiresAt': iso(reg.hold_expires_at),
            'serverNow': iso(now),
        }


# ================================================================= R05

def verify(user, provider_order_id: str, provider_payment_id: str, signature: str) -> Registration:
    order = (PaymentOrder.objects.select_related('registration__event')
             .filter(provider_order_id=provider_order_id, user=user).first())
    if order is None:
        raise NotFound()
    if not razorpay_client.verify_checkout_signature(provider_order_id, provider_payment_id, signature):
        logger.warning('payment_verify_rejected reason=BAD_SIGNATURE')
        raise InvalidSignature()

    known = Payment.objects.filter(provider_payment_id=provider_payment_id).first()
    if known is not None:  # replay of an already recorded payment: no provider call, no side effects
        if known.order_id != order.pk or known.flagged:
            raise PaymentMismatch()
        if known.status in ('captured', 'refunded'):
            return _fresh(order.registration_id)

    try:
        entity = razorpay_client.fetch_payment(provider_payment_id)
    except razorpay_client.ProviderRejected:
        _record_mismatch(order=order, source='verify', reason='PAYMENT_UNKNOWN', provider_order_id=provider_order_id,
                         provider_payment_id=provider_payment_id)
        raise PaymentMismatch() from None
    except razorpay_client.ProviderError:
        logger.warning('payment_verify_provider_unavailable')
        raise PaymentUnavailable() from None

    outcome = record_payment(entity, source='verify', expect_order=order, expect_payment_id=provider_payment_id)
    if outcome.refund is not None:
        execute_refund(outcome.refund)  # after commit; failure leaves it pending for the retry job
    if outcome.kind == 'late_refund':
        raise HoldExpired('The hold expired before the payment completed. The payment will be refunded.')
    if outcome.kind in ('confirmed', 'confirming', 'already_confirmed'):
        return _fresh(order.registration_id)
    raise PaymentMismatch()  # mismatch, failed, or any status other than captured/authorized


def _fresh(registration_id) -> Registration:
    return Registration.objects.select_related('event').get(pk=registration_id)


# ================================================================= shared ledger writer (R05 and W01)

def _record_mismatch(*, order, source, reason, provider_order_id='', provider_payment_id='', payment=None,
                     expected_amount=None, actual_amount=None, expected_currency='', actual_currency=''):
    MismatchRecord.objects.create(
        order=order, payment=payment, source=source, reason=reason, provider_order_id=provider_order_id[:64],
        provider_payment_id=provider_payment_id[:64], expected_amount_paise=expected_amount,
        actual_amount_paise=actual_amount, expected_currency=expected_currency, actual_currency=actual_currency)
    logger.warning('payment_mismatch source=%s reason=%s', source, reason)


def _advance_order(order: PaymentOrder, reg: Registration, new_state: str) -> None:
    if new_state == order.state or new_state not in ORDER_ALLOWED[order.state]:
        return
    order.state = new_state
    order.save(update_fields=['state', 'updated_at'])
    reg.payment_order_state = new_state


def record_payment(entity: dict, *, source: str, expect_order: PaymentOrder | None = None,
                   expect_payment_id: str | None = None) -> Outcome:
    """Write the ledger row for a provider payment entity and apply its effect. Safe to call twice (forward-only),
    nestable inside the webhook transaction. Never raises for a business disagreement: it records a mismatch and
    returns Outcome('mismatch'). A refund created here is returned UNSENT: call `execute_refund` after commit."""
    payment_id, order_id = entity.get('id'), entity.get('order_id')
    amount, currency, raw_status = entity.get('amount'), entity.get('currency'), entity.get('status')
    if not (isinstance(payment_id, str) and isinstance(amount, int) and not isinstance(amount, bool) and amount > 0
            and isinstance(currency, str) and isinstance(raw_status, str)):
        return Outcome('ignored')
    if expect_payment_id is not None and payment_id != expect_payment_id:
        _record_mismatch(order=expect_order, source=source, reason='ORDER', provider_payment_id=payment_id,
                         provider_order_id=str(order_id or ''))
        return Outcome('mismatch')

    with transaction.atomic():
        order = expect_order or (PaymentOrder.objects.filter(provider_order_id=order_id).first()
                                 if isinstance(order_id, str) else None)
        if order is None:
            _record_mismatch(order=None, source=source, reason='ORDER_UNKNOWN',
                             provider_order_id=str(order_id or ''), provider_payment_id=payment_id,
                             actual_amount=amount, actual_currency=currency[:3])
            return Outcome('unknown_order')
        if order_id != order.provider_order_id:
            _record_mismatch(order=order, source=source, reason='ORDER', provider_order_id=str(order_id or ''),
                             provider_payment_id=payment_id)
            return Outcome('mismatch')

        event = reg_services.lock_event(order.registration.event_id)
        reg = Registration.objects.select_for_update().get(pk=order.registration_id)
        reg.event = event
        order = PaymentOrder.objects.select_for_update().get(pk=order.pk)
        payment = Payment.objects.select_for_update().filter(provider_payment_id=payment_id).first()
        now = timezone.now()

        if payment is not None and payment.order_id != order.pk:
            _record_mismatch(order=order, payment=payment, source=source, reason='ORDER',
                             provider_order_id=order.provider_order_id, provider_payment_id=payment_id)
            return Outcome('mismatch')

        status = PROVIDER_STATUS.get(raw_status)
        if status is None:  # created / pending at the provider: nothing to record yet
            return Outcome('ignored')

        disagree = None
        if amount != order.amount_paise:
            disagree = 'AMOUNT'
        elif currency != order.currency:
            disagree = 'CURRENCY'
        if disagree:
            if payment is None:
                payment = Payment.objects.create(order=order, provider_payment_id=payment_id,
                                                 amount_paise=amount, currency=currency[:3], status=status,
                                                 flagged=True, source=source)
            if not payment.flagged:
                payment.flagged = True
                payment.save(update_fields=['flagged', 'updated_at'])
            _record_mismatch(order=order, payment=payment, source=source, reason=disagree,
                             provider_order_id=order.provider_order_id, provider_payment_id=payment_id,
                             expected_amount=order.amount_paise, actual_amount=amount,
                             expected_currency=order.currency, actual_currency=currency[:3])
            return Outcome('mismatch')

        if payment is None:
            refunded = entity.get('amount_refunded')
            refunded = refunded if isinstance(refunded, int) and 0 <= refunded <= amount else 0
            payment = Payment.objects.create(order=order, provider_payment_id=payment_id, amount_paise=amount,
                                             currency=currency, status=status, refunded_paise=refunded,
                                             source=source)
            old_rank = 0
        else:
            old_rank = PAYMENT_RANK[payment.status]
            if PAYMENT_RANK[status] > old_rank:
                payment.status = status
                payment.save(update_fields=['status', 'updated_at'])
        advanced = PAYMENT_RANK[status] > old_rank
        if payment.flagged or not advanced:  # a repeat: report the current state, change nothing
            if status in ('captured', 'authorized') and reg.status == 'confirmed':
                return Outcome('already_confirmed', registration=reg)
            if status in ('captured', 'authorized') and reg.status == 'confirming':
                return Outcome('confirming', registration=reg)
            return Outcome('ignored', registration=reg)
        if status == 'refunded':
            return Outcome('refunded_at_provider', registration=reg)
        if status == 'failed':
            return _on_failed(order, reg, now)
        if status == 'authorized':
            return _on_authorized(order, reg, now)
        return _on_captured(order, reg, payment, event, now)


def _on_failed(order, reg, now) -> Outcome:
    _advance_order(order, reg, 'failed')
    if reg.status == 'confirming':
        reg.status = 'pending'
    reg.save(update_fields=['status', 'payment_order_state', 'updated_at'])
    return Outcome('failed', registration=reg)


def _on_authorized(order, reg, now) -> Outcome:
    if reg.status == 'pending' and reg.hold_expires_at and reg.hold_expires_at > now:
        _advance_order(order, reg, 'attempted')
        reg.status = 'confirming'  # seat stays held until capture (or failure)
        reg.save(update_fields=['status', 'payment_order_state', 'updated_at'])
        return Outcome('confirming', registration=reg)
    return Outcome('ignored', registration=reg)


def _cancelled_by_expiry(reg) -> bool:
    """release_expired stamps cancelled_at = hold_expires_at; a player cancel stamps the cancel time."""
    return bool(reg.status == 'cancelled' and reg.hold_expires_at and reg.cancelled_at == reg.hold_expires_at)


def _on_captured(order, reg, payment, event, now) -> Outcome:
    _advance_order(order, reg, 'paid')
    if reg.status == 'confirmed':
        reg.save(update_fields=['payment_order_state', 'updated_at'])
        return Outcome('already_confirmed', registration=reg)

    event_open = event.status not in ('cancelled', 'completed')
    seat = False
    if event_open:
        if reg.status == 'confirming':
            seat = True
        elif reg.status == 'pending':
            seat = bool(reg.hold_expires_at and reg.hold_expires_at > now) or _has_free_seat(event, reg, now)
        elif _cancelled_by_expiry(reg):
            seat = _has_free_seat(event, reg, now) and not Registration.objects.filter(
                user_id=reg.user_id, event_id=event.pk, status__in=Registration.ACTIVE).exclude(pk=reg.pk).exists()
    if seat:
        reg.status = 'confirmed'
        reg.confirmed_at = now
        reg.cancelled_at = None
        reg.save(update_fields=['status', 'confirmed_at', 'cancelled_at', 'payment_order_state', 'updated_at'])
        reg_services.adjust_confirmed(event.pk, +1)  # emits revalidation when the public sold-out state flips
        reg.event = event
        reg_services.notify_confirmed(reg)  # queued in this transaction; sent after commit
        return Outcome('confirmed', registration=reg)

    # Late capture: money arrived and no seat is available (or the registration is gone). Auto-refund.
    released_hold = reg.status in ('pending', 'confirming')
    if released_hold:
        reg.status = 'cancelled'
        reg.cancelled_at = now
    if reg.refund_state != 'refunded':
        reg.refund_state = 'pending'
    reg.save(update_fields=['status', 'cancelled_at', 'payment_order_state', 'refund_state', 'updated_at'])
    refund = _new_refund(payment, payment.amount_paise - payment.refunded_paise, 'late_capture')
    if released_hold:
        reg_services.settle_event(event, now)
    logger.info('payment_late_capture refund_started=1')
    return Outcome('late_refund', registration=reg, refund=refund)


def _has_free_seat(event, reg, now) -> bool:
    return event.capacity is None or rules.occupied(event.pk, now, exclude=reg.pk) < event.capacity


# ================================================================= refunds (also called by BE-04 / BE-10)

def _new_refund(payment: Payment, amount_paise: int, reason: str) -> PaymentRefund:
    return PaymentRefund.objects.create(payment=payment, amount_paise=amount_paise, reason=reason[:40])


def refund_payment(payment: Payment, amount_paise: int | None = None, *, reason: str,
                   execute: bool = True) -> PaymentRefund:
    """Start a refund of a captured payment (full remainder when `amount_paise` is None).

    Writes the refund row (state `pending`) and marks the registration refund state `pending` in one transaction, then
    (execute=True) asks the provider. If this is called inside a caller's transaction pass execute=False and call
    `execute_refund(refund)` after commit so no network call runs under their locks. Raises RefundError. A provider
    outage leaves the row pending (`last_error` set) for the retry job; completion arrives by response or webhook, and
    only then are payment, order and registration moved (`finish_refund`)."""
    if not isinstance(reason, str) or not reason.strip():
        raise RefundError('REASON_REQUIRED')
    with transaction.atomic():
        payment = Payment.objects.select_for_update().select_related('order').get(pk=payment.pk)
        if payment.status != 'captured':
            raise RefundError('NOT_REFUNDABLE')
        in_flight = payment.refunds.filter(state='pending').aggregate(t=Sum('amount_paise'))['t'] or 0
        remaining = payment.amount_paise - payment.refunded_paise - in_flight
        amount = remaining if amount_paise is None else amount_paise
        if not isinstance(amount, int) or isinstance(amount, bool) or amount <= 0 or amount > remaining:
            raise RefundError('BAD_AMOUNT')
        refund = _new_refund(payment, amount, reason.strip())
        Registration.objects.filter(pk=payment.order.registration_id).exclude(refund_state='refunded').update(
            refund_state='pending')
    if execute:
        execute_refund(refund)
    return refund


def execute_refund(refund: PaymentRefund) -> PaymentRefund:
    """Send a pending refund to the provider exactly once. Never raises on provider trouble."""
    verdict = None
    with transaction.atomic():  # the row lock makes sure two workers never send the same refund twice
        row = PaymentRefund.objects.select_for_update().select_related('payment').get(pk=refund.pk)
        if row.state != 'pending' or row.sent_to_provider:
            return row
        try:
            data = razorpay_client.refund_payment(payment_id=row.payment.provider_payment_id,
                                                  amount_paise=row.amount_paise, reference=str(row.pk),
                                                  notes={'refund': str(row.pk)})
        except razorpay_client.ProviderRejected as exc:
            row.last_error = exc.code[:60]
            row.save(update_fields=['last_error'])
            logger.warning('refund_rejected reason=%s', exc.code)
            verdict = 'failed'
        except razorpay_client.ProviderError as exc:
            row.last_error = exc.code[:60]
            row.save(update_fields=['last_error'])
            logger.warning('refund_deferred reason=%s', exc.code)
            return row
        else:
            provider_id = data.get('id') if isinstance(data, dict) else None
            if not isinstance(provider_id, str):
                row.last_error = 'BAD_RESPONSE'
                row.save(update_fields=['last_error'])
                return row
            row.provider_refund_id = provider_id
            row.sent_to_provider = True
            row.last_error = ''
            row.save(update_fields=['provider_refund_id', 'sent_to_provider', 'last_error'])
            if data.get('status') in ('processed', 'failed'):
                verdict = data['status']
    if verdict:  # outside the row lock: finish_refund takes the event lock first
        finish_refund(refund.pk, verdict)
    return PaymentRefund.objects.get(pk=refund.pk)


def finish_refund(refund_id, result: str) -> bool:
    """Apply a provider verdict ('processed' | 'failed') to refund, payment, order and registration together.
    Idempotent: a refund that is no longer pending is left alone. Returns True when something changed."""
    with transaction.atomic():
        probe = PaymentRefund.objects.select_related('payment__order__registration').get(pk=refund_id)
        order = probe.payment.order
        event = reg_services.lock_event(order.registration.event_id)
        reg = Registration.objects.select_for_update().get(pk=order.registration_id)
        reg.event = event
        order = PaymentOrder.objects.select_for_update().get(pk=order.pk)
        payment = Payment.objects.select_for_update().get(pk=probe.payment_id)
        refund = PaymentRefund.objects.select_for_update().get(pk=refund_id)
        if refund.state != 'pending':
            return False
        now = timezone.now()
        others_pending = payment.refunds.filter(state='pending').exclude(pk=refund.pk).exists()

        if result == 'failed':
            refund.state = 'failed'
            refund.save(update_fields=['state'])
            if not others_pending and reg.refund_state != 'refunded':
                reg.refund_state = 'failed'  # surfaced to admins (G04, G06)
                reg.save(update_fields=['refund_state', 'updated_at'])
            return True

        refund.state = 'processed'
        refund.processed_at = now
        refund.save(update_fields=['state', 'processed_at'])
        payment.refunded_paise = min(payment.amount_paise, payment.refunded_paise + refund.amount_paise)
        full = payment.refunded_paise >= payment.amount_paise
        if full:
            payment.status = 'refunded'
        payment.save(update_fields=['refunded_paise', 'status', 'updated_at'])
        if not full:
            if not others_pending and reg.refund_state == 'pending':
                reg.refund_state = 'none'
                reg.save(update_fields=['refund_state', 'updated_at'])
            return True

        _advance_order(order, reg, 'refunded')
        was_confirmed = reg.status == 'confirmed'
        reg.refund_state = 'refunded'
        reg.refunded_at = now
        if reg.status in ('confirmed', 'confirming', 'cancelled'):
            reg.status = 'refunded'
            reg.cancelled_at = reg.cancelled_at or now
        reg.save(update_fields=['status', 'refund_state', 'refunded_at', 'cancelled_at', 'payment_order_state',
                                'updated_at'])
        if was_confirmed:
            reg_services.adjust_confirmed(event.pk, -1)
        reg_services.settle_event(event, now)
        return True
