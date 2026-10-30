import uuid

from django.db import models


class RateLimitHit(models.Model):
    """One counted event for a (scope, hashed subject). Subjects (emails, IPs) are stored as SHA-256 digests only."""

    scope = models.CharField(max_length=40)
    key = models.CharField(max_length=64)
    at = models.DateTimeField(db_index=True)

    class Meta:
        db_table = 'rate_limit_hits'
        indexes = [models.Index(fields=['scope', 'key', 'at'], name='rl_scope_key_at')]


class IdempotencyRecord(models.Model):
    """Stored response for an Idempotency-Key (contract 2.5). Kept at least 24 hours."""

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    scope = models.CharField(max_length=64)  # user id or 'anon:<ip hash>'
    key = models.CharField(max_length=64)
    method = models.CharField(max_length=8)
    path = models.CharField(max_length=255)
    request_hash = models.CharField(max_length=64)
    status_code = models.PositiveSmallIntegerField(null=True)  # null while the first request is still running
    response_body = models.JSONField(null=True)
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)

    class Meta:
        db_table = 'idempotency_records'
        constraints = [
            models.UniqueConstraint(fields=['scope', 'key', 'method', 'path'], name='idem_unique_scope_key_route'),
        ]
