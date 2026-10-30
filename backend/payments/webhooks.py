"""Razorpay webhook receiver (contract 5.1, W01).

A plain Django view, deliberately outside the DRF envelope, authentication and per-user rate limit: the only
credential is the provider's HMAC over the RAW body, checked before the JSON is trusted. Failure answers 400 and logs
a reason code only. Every accepted event id is stored once (`payment_webhook_events.provider_event_id` unique): a
repeat answers 200 with no side effects. Business disagreements are recorded (mismatch rows) and acknowledged; only
transient faults answer 5xx so the provider retries.
"""
from __future__ import annotations

import hashlib
import json
import logging
import uuid

from django.db import IntegrityError, transaction
from django.http import HttpResponse, JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_POST

from . import razorpay_client, services
from .models import Payment, PaymentRefund, PaymentWebhookEvent

logger = logging.getLogger('pg.payments')

PAYMENT_EVENTS = {'payment.captured': 'captured', 'payment.failed': 'failed', 'order.paid': 'captured'}
REFUND_EVENTS = {'refund.processed': 'processed', 'refund.failed': 'failed'}


def _entity(payload: dict, key: str):
    node = payload.get(key)
    entity = node.get('entity') if isinstance(node, dict) else None
    return entity if isinstance(entity, dict) else None


def _bad(reason: str) -> HttpResponse:
    logger.warning('razorpay_webhook_rejected reason=%s', reason)
    return JsonResponse({'received': False}, status=400)


@csrf_exempt
@require_POST
def razorpay_webhook(request):
    raw = request.body  # raw bytes: the signature covers exactly these
    signature = request.META.get('HTTP_X_RAZORPAY_SIGNATURE', '')
    if not signature:
        return _bad('MISSING_SIGNATURE')
    if not razorpay_client.verify_webhook_signature(raw, signature):
        return _bad('BAD_SIGNATURE')
    try:
        body = json.loads(raw)
    except ValueError:
        return _bad('BAD_JSON')
    event_type = body.get('event') if isinstance(body, dict) else None
    payload = body.get('payload') if isinstance(body, dict) else None
    if not isinstance(event_type, str) or not isinstance(payload, dict) or len(event_type) > 64:
        return _bad('BAD_SHAPE')

    event_id = request.META.get('HTTP_X_RAZORPAY_EVENT_ID', '').strip()
    if not event_id or len(event_id) > 128:
        event_id = 'body-' + hashlib.sha256(raw).hexdigest()

    post_commit = []
    with transaction.atomic():  # a failure below rolls the stored event back too, so the retry is processed
        try:
            with transaction.atomic():
                stored = PaymentWebhookEvent.objects.create(provider_event_id=event_id, event_type=event_type,
                                                            payload=body)
        except IntegrityError:
            return JsonResponse({'received': True, 'duplicate': True})
        stored.outcome = _dispatch(event_type, payload, post_commit)[:40]
        stored.save(update_fields=['outcome'])
    for refund in post_commit:  # provider call after commit; failure leaves the refund pending for the retry job
        try:
            services.execute_refund(refund)
        except Exception:  # noqa: BLE001 - the event is already stored and acknowledged
            logger.exception('razorpay_webhook_refund_execute_failed')
    return JsonResponse({'received': True})


def _dispatch(event_type: str, payload: dict, post_commit: list) -> str:
    if event_type in PAYMENT_EVENTS:
        entity = _entity(payload, 'payment')
        if entity is None or entity.get('status') != PAYMENT_EVENTS[event_type]:
            return 'ignored_shape'
        outcome = services.record_payment(entity, source='webhook')
        if outcome.refund is not None:
            post_commit.append(outcome.refund)
        return outcome.kind
    if event_type in REFUND_EVENTS:
        return _on_refund(_entity(payload, 'refund'), REFUND_EVENTS[event_type])
    return 'ignored_event'  # unknown events are stored (above) and acknowledged


def _on_refund(entity, result: str) -> str:
    if entity is None:
        return 'ignored_shape'
    provider_refund_id, provider_payment_id, amount = entity.get('id'), entity.get('payment_id'), entity.get('amount')
    if not (isinstance(provider_refund_id, str) and isinstance(provider_payment_id, str)
            and isinstance(amount, int) and not isinstance(amount, bool) and amount > 0):
        return 'ignored_shape'
    payment = Payment.objects.filter(provider_payment_id=provider_payment_id).first()
    if payment is None:
        return 'unknown_payment'

    refund = PaymentRefund.objects.filter(provider_refund_id=provider_refund_id).first()
    if refund is None:  # one we sent: match on the receipt (our refund id) before it was linked
        receipt = entity.get('receipt')
        try:
            local_id = uuid.UUID(receipt) if isinstance(receipt, str) else None
        except ValueError:
            local_id = None
        if local_id is not None:
            refund = PaymentRefund.objects.filter(pk=local_id, payment=payment).first()
    if refund is None:  # created at the provider (dashboard): record it
        if amount > payment.amount_paise - payment.refunded_paise:
            services._record_mismatch(order=payment.order, payment=payment, source='webhook', reason='AMOUNT',
                                      provider_order_id=payment.order.provider_order_id,
                                      provider_payment_id=provider_payment_id, expected_amount=payment.amount_paise,
                                      actual_amount=amount)
            return 'mismatch'
        refund = PaymentRefund.objects.create(payment=payment, amount_paise=amount, reason='provider',
                                              provider_refund_id=provider_refund_id, sent_to_provider=True)
    elif refund.provider_refund_id is None:
        refund.provider_refund_id = provider_refund_id
        refund.sent_to_provider = True
        refund.save(update_fields=['provider_refund_id', 'sent_to_provider'])
    changed = services.finish_refund(refund.pk, result)
    return f'refund_{result}' if changed else 'refund_noop'
