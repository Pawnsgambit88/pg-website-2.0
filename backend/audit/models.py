import uuid

from django.db import models


class AppendOnlyError(RuntimeError):
    pass


class AuditQuerySet(models.QuerySet):
    def update(self, **kwargs):
        raise AppendOnlyError('audit_log is append-only.')

    def delete(self):
        raise AppendOnlyError('audit_log is append-only.')

    def bulk_update(self, *args, **kwargs):
        raise AppendOnlyError('audit_log is append-only.')


class AuditLog(models.Model):
    """Append-only record of a privileged mutation (contract 6.5). Written via `audit.write()` in the mutation's transaction."""

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    actor = models.ForeignKey('accounts.User', null=True, on_delete=models.SET_NULL, related_name='+')
    actor_role = models.CharField(max_length=10)
    action = models.CharField(max_length=64)
    object_type = models.CharField(max_length=48)
    object_id = models.CharField(max_length=64, blank=True, default='')
    before = models.JSONField(null=True)
    after = models.JSONField(null=True)
    reason = models.CharField(max_length=500, blank=True, default='')
    request_id = models.CharField(max_length=128, blank=True, default='')
    ip = models.CharField(max_length=45, blank=True, default='')  # coarse: IPv4 /24, IPv6 /48
    occurred_at = models.DateTimeField(auto_now_add=True, db_index=True)

    objects = AuditQuerySet.as_manager()

    class Meta:
        db_table = 'audit_log'
        indexes = [
            models.Index(fields=['object_type', 'object_id', '-occurred_at'], name='audit_object_idx'),
            models.Index(fields=['actor', '-occurred_at'], name='audit_actor_idx'),
            models.Index(fields=['action', '-occurred_at'], name='audit_action_idx'),
        ]

    def save(self, *args, **kwargs):
        if not self._state.adding:
            raise AppendOnlyError('audit_log is append-only.')
        super().save(*args, **kwargs)

    def delete(self, *args, **kwargs):
        raise AppendOnlyError('audit_log is append-only.')
