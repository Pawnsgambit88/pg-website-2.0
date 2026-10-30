from django.db import migrations

from core import rls


def lock_down(apps, schema_editor):
    with schema_editor.connection.cursor() as cur:
        if not rls.is_supabase(cur):
            return  # plain PostgreSQL: no PostgREST roles to lock out, nothing to do
        changed = rls.enable_rls(cur)
        print('  core.0003: RLS enabled on %d public table(s), no policies' % len(changed))


class Migration(migrations.Migration):
    # Depends on the latest migration of every app so all tables exist when RLS is switched on.
    dependencies = [
        ('core', '0002_drop_legacy_tables'),
        ('accounts', '0001_initial'),
        ('audit', '0001_initial'),
        ('comms', '0001_comms_store'),
        ('content', '0009_comms_store'),
        ('payments', '0002_payment_reconciled_at'),
        ('ratings', '0003_ledger_nullable_blank'),
        ('registrations', '0003_control_room'),
    ]
    operations = [migrations.RunPython(lock_down, migrations.RunPython.noop)]
