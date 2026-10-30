"""Global payments ledger, refund and reconcile (contract 3.8: G04, G05, G06).

The ledger is read-only. Money state changes only through `refund` (provider first via `refund_payment(execute=False)`,
then `execute_refund` after the commit; payment, order and registration move together in `finish_refund`) and never
through a free-form status write. Provider ids appear only in these admin DTOs.
"""
from __future__ import annotations

import logging
import uuid
from datetime import date, datetime, time, timedelta, timezone as dt_timezone

from django.db import transaction
from django.db.models import Exists, OuterRef, Q
from django.utils import timezone

import audit
from core.errors import NotFound, ValidationFailed
from core.responses import iso
from payments import reconcile as pay_reconcile
from payments import services as pay_services
from payments.models import Payment, PaymentMismatch, PaymentOrder, PaymentRefund

from . import control_service as cs
from . import event_service as svc
from .permissions import require_step_up

logger = logging.getLogger('pg.payments')


def _parse_uuid(raw, key, errors):
    if raw is None:
        return None
    try:
        return uuid.UUID(str(raw))
    except ValueError:
        errors[key] = ['Use a valid id.']
        return None


def _parse_date(raw, key, errors):
    if raw is None:
        return None
    try:
        return date.fromisoformat(raw)
    except ValueError:
        errors[key] = ['Use a date like 2026-01-31.']
        return None


def list_ledger(request, pagination_cls):
    q = request.query_params
    errors: dict = {}
    status = cs._parse_enum(q, 'status', cs.WEB_PAYMENT_STATES, errors)
    mismatch = cs._parse_bool(q, 'mismatch', errors)
    event_id = _parse_uuid(q.get('eventId'), 'eventId', errors)
    start, end = _parse_date(q.get('from'), 'from', errors), _parse_date(q.get('to'), 'to', errors)
    if start and end and start > end:
        errors['to'] = ['Choose a date on or after the start date.']
    if errors:
        raise ValidationFailed(fields=errors)
    qs = PaymentOrder.objects.select_related('user', 'registration__event')
    if status:
        qs = qs.filter(state=status)
    if event_id:
        qs = qs.filter(registration__event_id=event_id)
    if start:
        qs = qs.filter(updated_at__gte=datetime.combine(start, time.min, tzinfo=dt_timezone.utc))
    if end:
        qs = qs.filter(updated_at__lt=datetime.combine(end + timedelta(days=1), time.min, tzinfo=dt_timezone.utc))
    if mismatch is not None:
        open_mm = PaymentMismatch.objects.filter(resolved_at__isnull=True)
        has = Exists(open_mm.filter(Q(order_id=OuterRef('pk')) | Q(payment__order_id=OuterRef('pk'))))
        qs = qs.filter(has) if mismatch else qs.filter(~has)
    qs = qs.order_by('-updated_at', 'id')
    paginator = pagination_cls()
    orders = list(paginator.paginate_queryset(qs, request))
    return paginator, cs.payment_rows(orders, with_event=True)


# ---------------------------------------------------------------- G05

REFUND_ERRORS = {
    'NOT_REFUNDABLE': ('form', 'Only a captured payment can be refunded.'),
    'BAD_AMOUNT': ('amountPaise', 'Use an amount between 1 paisa and the refundable balance.'),
    'REASON_REQUIRED': ('reason', 'A reason is required.'),
}


def _parse_refund(data) -> tuple[int | None, str]:
    if not isinstance(data, dict):
        raise ValidationFailed(fields={'form': ['Send a JSON object.']})
    errors = {str(k)[:60]: ['This field cannot be changed here.'] for k in data if k not in ('amountPaise', 'reason')}
    amount, reason = data.get('amountPaise'), data.get('reason')
    if amount is not None and (not isinstance(amount, int) or isinstance(amount, bool) or amount < 1):
        errors['amountPaise'] = ['Use a whole number of paise, at least 1.']
    if not isinstance(reason, str) or not reason.strip() or len(reason.strip()) > 500:
        errors['reason'] = ['Use 1 to 500 characters.']
    if errors:
        raise ValidationFailed(fields=errors)
    return amount, reason.strip()


def refund(request, payment_id, data) -> dict:
    """-> RefundResult. Idempotent through the caller's `run_idempotent`; the step-up grant is consumed first."""
    amount, reason = _parse_refund(data)
    try:
        pk = uuid.UUID(str(payment_id))
    except ValueError:
        raise NotFound() from None
    probe = Payment.objects.filter(pk=pk).select_related('order').first()
    if probe is None:
        raise NotFound()
    require_step_up(request)
    with transaction.atomic():
        payment = Payment.objects.select_for_update().select_related('order').get(pk=pk)
        if payment.flagged:
            raise ValidationFailed(fields={'form': ['This payment does not match the order and needs reconciling first.']})
        try:
            row = pay_services.refund_payment(payment, amount, reason='admin', execute=False)
        except pay_services.RefundError as exc:
            key, text = REFUND_ERRORS.get(str(exc), ('form', 'The refund could not start.'))
            raise ValidationFailed(fields={key: [text]}) from None
        audit.write(request, action='payment.refund', object_type='payment', object_id=payment.pk, reason=reason,
                    before={'refundedPaise': payment.refunded_paise},
                    after={'refundPaise': row.amount_paise, 'refundState': 'pending',
                           'registrationId': str(payment.order.registration_id)})
    svc.execute_refunds([row])  # after commit; a provider outage leaves it pending for the retry job
    row = PaymentRefund.objects.get(pk=row.pk)
    if row.state == 'failed':
        raise ValidationFailed(fields={'form': ['The provider declined this refund.']})
    payment.refresh_from_db()
    return {'paymentId': str(payment.pk), 'refundState': 'refunded' if row.state == 'processed' else 'pending',
            'refundedPaise': payment.refunded_paise, 'currency': payment.currency, 'requestedAt': iso(row.created_at)}


# ---------------------------------------------------------------- G06

def reconcile(request, data) -> dict:
    if not isinstance(data, dict):
        raise ValidationFailed(fields={'form': ['Send a JSON object.']})
    errors = {str(k)[:60]: ['This field cannot be changed here.'] for k in data if k != 'eventId'}
    event_id = _parse_uuid(data.get('eventId'), 'eventId', errors)
    if errors:
        raise ValidationFailed(fields=errors)
    if event_id is not None:
        cs.control_event(event_id)  # 404 for an unknown or draft event
    result = pay_reconcile.reconcile(event_id)
    with transaction.atomic():
        audit.write(request, action='payment.reconcile', object_type='payment', object_id='',
                    after={'checked': result.checked, 'newMismatches': result.new_mismatches,
                           'eventId': str(event_id) if event_id else None})
    return {'checked': result.checked, 'mismatches': result.mismatches, 'newMismatches': result.new_mismatches,
            'ranAt': iso(result.ran_at)}
