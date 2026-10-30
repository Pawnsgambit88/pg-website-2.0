"""DB-level append-only protection for the rating ledger (PostgreSQL triggers)."""
from django.db import migrations

FORWARD = """
CREATE OR REPLACE FUNCTION rating_ledger_append_only() RETURNS trigger AS $$
BEGIN
    RAISE EXCEPTION 'rating_ledger is append-only' USING ERRCODE = 'integrity_constraint_violation';
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER rating_ledger_no_change
    BEFORE UPDATE OR DELETE ON rating_ledger
    FOR EACH ROW EXECUTE FUNCTION rating_ledger_append_only();

CREATE TRIGGER rating_ledger_no_truncate
    BEFORE TRUNCATE ON rating_ledger
    FOR EACH STATEMENT EXECUTE FUNCTION rating_ledger_append_only();
"""
REVERSE = """
DROP TRIGGER IF EXISTS rating_ledger_no_truncate ON rating_ledger;
DROP TRIGGER IF EXISTS rating_ledger_no_change ON rating_ledger;
DROP FUNCTION IF EXISTS rating_ledger_append_only();
"""


class Migration(migrations.Migration):
    dependencies = [('ratings', '0001_initial')]
    operations = [migrations.RunSQL(FORWARD, REVERSE)]
