"""Payment orders, ledger, webhook events, mismatch and refund records (contract 3.3 R04/R05, 5.1).

Provider ids live only here, never in a player DTO. States move forward only (see services.py).
`Registration.payment_order_state` / `refund_state` mirror these rows so player DTOs stay one query.
"""
from __future__ import annotations

import uuid

from django.db import models
from django.db.models import Q

from accounts.models import User
from registrations.models import Registration


class PaymentOrder(models.Model):
    STATES = [(s, s) for s in ('created', 'attempted', 'paid', 'failed', 'expired', 'refunded')]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    registration = models.OneToOneField(Registration, on_delete=models.PROTECT, related_name='payment_order')
    user = models.ForeignKey(User, on_delete=models.PROTECT, related_name='payment_orders')
    provider_order_id = models.CharField(max_length=64, unique=True)
    amount_paise = models.PositiveIntegerField()
    currency = models.CharField(max_length=3, default='INR')
    state = models.CharField(max_length=10, choices=STATES, default='created')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'payment_orders'
        constraints = [
            models.CheckConstraint(condition=Q(amount_paise__gt=0), name='payorder_amount_positive'),
            models.CheckConstraint(
                condition=Q(state__in=['created', 'attempted', 'paid', 'failed', 'expired', 'refunded']),
                name='payorder_state_valid'),
        ]

    def __str__(self):
        return f'{self.provider_order_id} {self.state}'


class Payment(models.Model):
    """Ledger row: one provider payment against one order. `amount_paise` is what the PROVIDER reported."""
    STATUSES = [(s, s) for s in ('authorized', 'captured', 'failed', 'refunded')]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    order = models.ForeignKey(PaymentOrder, on_delete=models.PROTECT, related_name='payments')
    provider_payment_id = models.CharField(max_length=64, unique=True)
    amount_paise = models.PositiveIntegerField()
    currency = models.CharField(max_length=3)
    status = models.CharField(max_length=10, choices=STATUSES)
    refunded_paise = models.PositiveIntegerField(default=0)
    flagged = models.BooleanField(default=False)  # amount/currency disagreed with the order: never confirmed
    source = models.CharField(max_length=10, default='verify')  # verify | webhook
    reconciled_at = models.DateTimeField(null=True, blank=True)  # last G06 comparison with the provider
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'payments'
        constraints = [
            models.CheckConstraint(condition=Q(status__in=['authorized', 'captured', 'failed', 'refunded']),
                                   name='payment_status_valid'),
            models.CheckConstraint(condition=Q(refunded_paise__lte=models.F('amount_paise')),
                                   name='payment_refund_within_amount'),
        ]
        indexes = [models.Index(fields=['order', 'status'], name='payment_order_status_idx')]

    def __str__(self):
        return f'{self.provider_payment_id} {self.status}'


class PaymentRefund(models.Model):
    STATES = [(s, s) for s in ('pending', 'processed', 'failed')]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    payment = models.ForeignKey(Payment, on_delete=models.PROTECT, related_name='refunds')
    provider_refund_id = models.CharField(max_length=64, null=True, blank=True, unique=True)
    amount_paise = models.PositiveIntegerField()
    reason = models.CharField(max_length=40)  # late_capture | cancellation | admin | ... (a code, never free text from a user)
    state = models.CharField(max_length=10, choices=STATES, default='pending')
    sent_to_provider = models.BooleanField(default=False)  # True once the provider accepted the request
    last_error = models.CharField(max_length=60, blank=True)  # reason code only
    created_at = models.DateTimeField(auto_now_add=True)
    processed_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        db_table = 'payment_refunds'
        constraints = [
            models.CheckConstraint(condition=Q(amount_paise__gt=0), name='payrefund_amount_positive'),
            models.CheckConstraint(condition=Q(state__in=['pending', 'processed', 'failed']),
                                   name='payrefund_state_valid'),
        ]
        indexes = [models.Index(fields=['state', 'sent_to_provider'], name='payrefund_state_idx')]


class PaymentWebhookEvent(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    provider_event_id = models.CharField(max_length=128, unique=True)
    event_type = models.CharField(max_length=64)
    payload = models.JSONField()
    outcome = models.CharField(max_length=40, blank=True)
    received_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'payment_webhook_events'


class PaymentMismatch(models.Model):
    """Amount, currency or order disagreement. Surfaced to admins (G04, G06); never silently corrected."""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    order = models.ForeignKey(PaymentOrder, null=True, on_delete=models.PROTECT, related_name='mismatches')
    payment = models.ForeignKey(Payment, null=True, on_delete=models.PROTECT, related_name='mismatches')
    source = models.CharField(max_length=10)  # verify | webhook
    reason = models.CharField(max_length=30)  # AMOUNT | CURRENCY | ORDER | ORDER_UNKNOWN | STATUS
    provider_order_id = models.CharField(max_length=64, blank=True)
    provider_payment_id = models.CharField(max_length=64, blank=True)
    expected_amount_paise = models.PositiveIntegerField(null=True, blank=True)
    actual_amount_paise = models.PositiveIntegerField(null=True, blank=True)
    expected_currency = models.CharField(max_length=3, blank=True)
    actual_currency = models.CharField(max_length=3, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    resolved_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        db_table = 'payment_mismatches'
        indexes = [models.Index(fields=['resolved_at'], name='paymismatch_open_idx')]


class FakeProviderRecord(models.Model):
    """Backing store for RAZORPAY_MODE=fake only (orders, payments, refunds the fake 'provider' has seen).
    Never written or read in live mode."""
    kind = models.CharField(max_length=10)  # order | payment | refund
    provider_id = models.CharField(max_length=64, unique=True)
    data = models.JSONField()
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'payment_fake_provider_records'
