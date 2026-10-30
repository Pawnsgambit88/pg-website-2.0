"""Row Level Security helpers for the Supabase lockdown (used by core.0003 and `manage.py check_rls`).

Supabase exposes every table of the `public` schema through PostgREST to the `anon` and `authenticated` roles. This
project never uses that path (the Django backend is the only data access), so every public table gets RLS enabled with
NO policies: PostgREST roles then see no rows. The Django DB role is the table owner (or has BYPASSRLS), so it is not
affected. Plain local PostgreSQL has no PostgREST roles, so nothing is changed there.
"""

SUPABASE_ROLES = ('anon', 'authenticated')

TABLES_SQL = """
SELECT c.relname, c.relrowsecurity
FROM pg_class c
JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname = 'public' AND c.relkind IN ('r', 'p') AND NOT c.relispartition
ORDER BY c.relname
"""


def is_supabase(cursor) -> bool:
    """True when the PostgREST roles Supabase creates exist in this cluster."""
    cursor.execute('SELECT count(*) FROM pg_roles WHERE rolname = ANY(%s)', [list(SUPABASE_ROLES)])
    return cursor.fetchone()[0] == len(SUPABASE_ROLES)


def rls_state(cursor) -> list[tuple[str, bool]]:
    cursor.execute(TABLES_SQL)
    return [(name, bool(enabled)) for name, enabled in cursor.fetchall()]


def enable_rls(cursor) -> list[str]:
    """Enable RLS on every public table that lacks it. Returns the tables changed. Never creates policies."""
    changed = []
    for name, enabled in rls_state(cursor):
        if not enabled:
            cursor.execute('ALTER TABLE public.%s ENABLE ROW LEVEL SECURITY' % cursor.connection.ops.quote_name(name))
            changed.append(name)
    return changed
