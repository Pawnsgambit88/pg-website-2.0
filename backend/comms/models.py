"""Communications store (contract 3.6 C14/C15, 5.5, COMP-B11).

Everything is stored BEFORE delivery. `EventMessage` is the authored message and its audience; the worker resolves
recipients into `MessageDelivery` rows (one per registration) and delivers each independently, so a partial failure is
visible per recipient. `TransactionalEmail` is the same queue for system mail built from a template (registration
confirmation, waitlist offer). `EmailTemplate` overrides the built-in template text (see templates.py).

No row stores a recipient address: delivery looks the address up from the user at send time, and `last_error` holds a
short reason code, never provider text, message bodies or addresses.
"""
import uuid

from django.conf import settings
from django.db import models
from django.db.models import Q


class EmailTemplate(models.Model):
    """Template store. A row replaces the built-in default for `key`; delete the row to go back to the default.
    Plain text with `{{variable}}` placeholders (see comms.templates for the variables each key receives)."""
    key = models.CharField(max_length=40, primary_key=True)
    subject = models.CharField(max_length=200)
    body = models.TextField(max_length=8000)
    updated_at = models.DateTimeField(auto_now=True)
    updated_by = models.ForeignKey(settings.AUTH_USER_MODEL, null=True, blank=True, on_delete=models.SET_NULL,
                                   related_name='+')

    class Meta:
        db_table = 'email_templates'

    def __str__(self):
        return self.key


class EventMessage(models.Model):
    """C14: an authored message to an event audience. `resolved_at` is set by the worker once recipients are written."""
    AUDIENCES = [(a, a) for a in ('confirmed', 'waitlist', 'checked_in', 'first_timers')]
    TRIGGERS = [(t, t) for t in ('confirmation', 'reminder_24h', 'checkin_open', 'pairing_published', 'post_event')]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    event = models.ForeignKey('content.Event', on_delete=models.CASCADE, related_name='messages')
    audience = models.CharField(max_length=16, choices=AUDIENCES)
    channel = models.CharField(max_length=10, default='email')
    subject = models.CharField(max_length=150)
    body = models.TextField(max_length=5000)
    trigger = models.CharField(max_length=20, choices=TRIGGERS, blank=True, default='')  # reserved for BE-12
    recipient_count = models.PositiveIntegerField(default=0)  # audience size when accepted
    created_by = models.ForeignKey(settings.AUTH_USER_MODEL, null=True, blank=True, on_delete=models.SET_NULL,
                                   related_name='+')
    created_at = models.DateTimeField(auto_now_add=True)
    resolved_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        db_table = 'event_messages'
        ordering = ['-created_at', 'id']
        indexes = [models.Index(fields=['event', '-created_at'], name='evmsg_event_created_idx'),
                   models.Index(fields=['resolved_at'], name='evmsg_resolved_idx')]

    def __str__(self):
        return f'{self.audience} {self.created_at:%Y-%m-%d}'


class MessageDelivery(models.Model):
    """One recipient of an EventMessage. queued -> sent | failed (failed is final: attempts exhausted or permanent)."""
    STATES = [(s, s) for s in ('queued', 'sent', 'failed')]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    message = models.ForeignKey(EventMessage, on_delete=models.CASCADE, related_name='deliveries')
    registration = models.ForeignKey('registrations.Registration', on_delete=models.CASCADE, related_name='+')
    state = models.CharField(max_length=8, choices=STATES, default='queued')
    attempts = models.PositiveSmallIntegerField(default=0)
    next_attempt_at = models.DateTimeField(db_index=True)
    last_error = models.CharField(max_length=60, blank=True, default='')
    provider_id = models.CharField(max_length=120, blank=True, default='')
    sent_at = models.DateTimeField(null=True, blank=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'message_deliveries'
        constraints = [
            models.UniqueConstraint(fields=['message', 'registration'], name='delivery_one_per_registration'),
            models.CheckConstraint(condition=Q(state__in=['queued', 'sent', 'failed']), name='delivery_state_valid'),
        ]
        indexes = [models.Index(fields=['state', 'next_attempt_at'], name='delivery_due_idx')]


class TransactionalEmail(models.Model):
    """System mail built from a template, queued in the transaction that caused it (so it exists iff the change
    committed). `dedupe_key` makes a repeated trigger a no-op. The context holds non-secret display values only."""
    STATES = [(s, s) for s in ('queued', 'sent', 'failed', 'skipped')]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    template = models.CharField(max_length=40)
    dedupe_key = models.CharField(max_length=120)
    user = models.ForeignKey(settings.AUTH_USER_MODEL, null=True, blank=True, on_delete=models.SET_NULL,
                             related_name='+')
    context = models.JSONField(default=dict, blank=True)
    state = models.CharField(max_length=8, choices=STATES, default='queued')
    attempts = models.PositiveSmallIntegerField(default=0)
    next_attempt_at = models.DateTimeField(db_index=True)
    last_error = models.CharField(max_length=60, blank=True, default='')
    provider_id = models.CharField(max_length=120, blank=True, default='')
    sent_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'transactional_emails'
        constraints = [
            models.UniqueConstraint(fields=['template', 'dedupe_key'], name='txmail_unique_trigger'),
            models.CheckConstraint(condition=Q(state__in=['queued', 'sent', 'failed', 'skipped']),
                                   name='txmail_state_valid'),
        ]
        indexes = [models.Index(fields=['state', 'next_attempt_at'], name='txmail_due_idx')]
