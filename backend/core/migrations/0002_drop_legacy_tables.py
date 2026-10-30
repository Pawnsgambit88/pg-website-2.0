from django.db import migrations

# Tables of the retired `tournaments` and `gallery` apps (removed from INSTALLED_APPS in BE-13). Nothing in the current
# apps references them. Children first. A table that still holds rows is KEPT (never silently destroy data) and reported;
# drop it by hand once the owner confirms the rows are not needed.
LEGACY_TABLES = ['pairings', 'tournament_rounds', 'tournament_registrations', 'tournaments', 'gallery_photos']
LEGACY_APPS = ['tournaments', 'gallery']


def drop_legacy(apps, schema_editor):
    conn = schema_editor.connection
    with conn.cursor() as cur:
        for table in LEGACY_TABLES:
            cur.execute("SELECT to_regclass(%s)", ['public.' + table])
            if cur.fetchone()[0] is None:
                continue
            cur.execute('SELECT EXISTS (SELECT 1 FROM public.%s)' % conn.ops.quote_name(table))
            if cur.fetchone()[0]:
                print('  core.0002: legacy table %s has rows, kept (drop manually after owner sign-off)' % table)
                continue
            cur.execute('DROP TABLE public.%s' % conn.ops.quote_name(table))
        cur.execute('DELETE FROM django_migrations WHERE app = ANY(%s)', [LEGACY_APPS])


class Migration(migrations.Migration):
    dependencies = [('core', '0001_initial')]
    operations = [migrations.RunPython(drop_legacy, migrations.RunPython.noop)]
