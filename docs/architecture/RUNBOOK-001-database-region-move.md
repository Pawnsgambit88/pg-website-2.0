# Runbook: move the database from Supabase Seoul to Singapore, and lock down Supabase

**ID:** RUNBOOK-001 (operator runbook; companion to ARCH-001-web-frontend; ops document like OPS-001, so `schemas/architecture.schema.yaml` is not applied)
**Type:** ops-runbook
**Feature:** FEAT-001 | **Plan task:** PLAN-001 TASK-117 | **Version:** 1 | **Status:** draft, ready for owner review. Nothing here has been executed or tested.
**Date:** 2026-10-22 | **Author:** architect
**Executed by:** the owner. The architect cannot reach any Supabase, Railway or Vercel account.

## 0. Read this first

- **Command blocks are TEMPLATES.** Placeholders look like `<SEOUL_DB_URL>`. Never paste real credentials into this file, a ticket or a chat. Put them in your shell environment for the session only and clear history afterwards.
- Anything about what Supabase does is from memory and tagged **VERIFY** ("verify against current Supabase docs"). The architect had no web access. No prices, quotas or retention numbers are given.
- Two moves are different things (FEAT-000 F-NFR-008): (a) this infrastructure region move, and (b) migrating legacy data into the new backend model. The owner has said the whole codebase is being replaced, so section 2 asks whether (b) happens at all before you decide how much to copy in (a).
- Related: `ARCH-001-hosting-runtime.md` (topology, env vars), `ARCH-001-backend-contract.md` 6.4 (lockdown requirements), OPS-002 (account hygiene).
- Do not delete or alter the Seoul project until sign-off (section 12). Keep it as the rollback target.

## 1. Pre-move inventory: what is actually in the Seoul project

Source for this section: the repository, read-only. **The live Seoul project was not inspected.** Step 3.1 asks you to take the real inventory and compare it with this list.

### 1.1 Tables the legacy code expects (public schema)

From `supabase/schema.sql`, `backend/*/models.py`, `MIGRATION.md` section 1.5 and the two later SQL files. The Django models map onto these exact tables (`managed = True`, with initial migrations present, so a Django `migrate` against this database may already have run or may alter it; check the `django_migrations` table).

| Table | Contents | Personal or money data | Legacy columns of note |
|---|---|---|---|
| `users` | Player and admin profiles | Yes: name, email, phone, city, area, pincode, gender, birthday, FIDE id, chess.com username, `password_hash` (Django bcrypt, added by the migration plan) | `id` was a foreign key to `auth.users(id)` in `schema.sql`; `MIGRATION.md` drops that FK |
| `ratings` | Glicko-2 rating per user and time control | No | one row per user in `schema.sql`; per (user, time_control) after migration step 5 |
| `tournaments` | Events with fee, venue, status | Money configuration (`entry_fee`) | `time_control`, `location_link` added later |
| `tournament_registrations` | Registrations with Razorpay ids, payment status, score | **Yes: `razorpay_payment_id`, `razorpay_order_id`, `payment_status`** | `is_pairing_active` added later |
| `tournament_rounds` | Rounds | No | |
| `pairings` | Pairings and results | Results of identifiable players | |
| `gallery_photos` | URL, caption, category | Image URLs (free text) | URLs may point at the Seoul project Storage or external hosts |

Also expected: Postgres functions `increment_games`, `handle_new_user`, `check_tournament_capacity`; trigger `on_auth_user_created` on `auth.users`; trigger `enforce_tournament_capacity` on `tournament_registrations` (from `supabase/enforce_tournament_capacity.sql`); the `uuid-ossp` extension; several RLS policies on every table.

### 1.2 Other Supabase-managed content

| Area | Expected | Note |
|---|---|---|
| `auth.users` and related auth schema | **May hold real accounts** if players registered while the Vite app talked to Supabase Auth directly (before the Django move). Passwords there are Supabase-managed hashes, not the Django `password_hash`. | The Supabase `auth` schema is managed by Supabase; restoring it into another project is delicate (VERIFY). Decide in section 2 whether anyone needs it. |
| Edge Functions | `create-razorpay-order`, `verify-razorpay-payment`, `update-ratings` in `supabase/functions/` use `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`, `SUPABASE_SERVICE_ROLE_KEY`, `ADMIN_EMAIL` | They are deployed per project; they do not move with a database dump. They belong to the retired architecture and do not need to be recreated if the new backend replaces them. |
| Storage buckets | **Unknown.** The repo contains no Storage upload code; `gallery_photos.url` is free text. Check the dashboard for buckets and object counts. | If buckets exist, objects are copied separately (section 4.4). |
| Roles, extensions, settings | Default Supabase roles; `uuid-ossp`; possibly others enabled in the dashboard | Section 3.1 lists them. |
| Secrets | Old project keys (anon, service-role), database password, Razorpay keys in Edge Function secrets, SendGrid key | Rotate after the move (section 11). |

### 1.3 Who still talks to the Seoul database

| Consumer | How | Evidence |
|---|---|---|
| Legacy Vite app (`src/`, deleted by the owner on 2026-10-22; still in git history) | `@supabase/supabase-js` with the anon key from `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` | git history (`HEAD:src/...`), root `.env.example` |
| Legacy Django app (`backend/`) | Direct Postgres via `DB_HOST`, `DB_NAME`, `DB_USER`, `DB_PASSWORD`, `DB_PORT` (default port 5432, so likely the direct connection, not the pooler) | `backend/pgchess/settings.py` |
| Supabase Edge Functions | Service-role key | `supabase/functions` |
| Hosting of the legacy app | Probably a live Vercel project and a Railway or similar service for Django (`backend/Procfile` uses gunicorn). Not confirmed by any source. | OPS-002 section 2 says the root `vercel.json` suggests a live Vercel project |

### 1.4 What can be dropped

| Item | Verdict | Reason |
|---|---|---|
| Edge Functions and their secrets | Drop (after Razorpay webhook/orders are on the new backend) | Replaced by the Railway backend |
| RLS policies and `handle_new_user` trigger on `auth.users` | Do not carry forward | The backend owns data access; these only served the browser-to-Supabase design. Lockdown uses RLS with no policies (section 10) |
| `gallery_photos` | Probably drop or migrate once, owner decides | FEAT-001 drops the old public Gallery page; photos can become media assets (FEAT-000 section on dropped scope). |
| Test and abandoned accounts, test registrations, test payments | Delete if no legal or accounting need | Owner knows which are test data |
| `django_migrations`, `django_content_type`, `auth_*` Django tables (if present) | Drop if the new backend does not reuse them | |
| `ratings` history | Keep if players need continuity (rating is the product) | Decision in section 2 |
| `tournament_registrations` with Razorpay ids | **Keep for the legal or accounting retention period even if not migrated** | Payment records. Retention period is an owner or accountant question. |

### 1.5 Inventory commands (read-only; run against Seoul)

```sh
# TEMPLATE. Connection URL comes from the Supabase dashboard (direct connection). Do not paste credentials into files.
psql "<SEOUL_DB_URL>" -c "\dt public.*"
psql "<SEOUL_DB_URL>" -c "select schemaname, relname, n_live_tup from pg_stat_user_tables order by 1,2;"
psql "<SEOUL_DB_URL>" -c "select extname, extversion from pg_extension order by 1;"
psql "<SEOUL_DB_URL>" -c "select count(*) from auth.users;"
psql "<SEOUL_DB_URL>" -c "select id, name, public from storage.buckets;"
psql "<SEOUL_DB_URL>" -c "select bucket_id, count(*) from storage.objects group by 1;"
psql "<SEOUL_DB_URL>" -c "select pg_size_pretty(pg_database_size(current_database()));"
psql "<SEOUL_DB_URL>" -c "select * from django_migrations order by id;"
```

The `n_live_tup` value is an estimate; use exact counts (section 7) for reconciliation. Record results in the sign-off sheet (section 12).

## 2. Decision points (settle before you start)

| Id | Decision | Options | Recommendation (architect, owner decides) |
|---|---|---|---|
| DP-1 | Migrate legacy data at all? | (A) Start clean: new Singapore project, empty; legacy data archived only. (B) Lift-and-shift the `public` tables unchanged, then let the new backend migrate or ignore them. (C) Combine with the legacy-to-new-model migration (F-NFR-008) if the backend is rebuilt (OQ-18). | The owner said the whole codebase is being replaced. If no real players, registrations or payments exist worth keeping, **A** is the simplest and avoids copying a weak schema (RLS policies, `auth.users` coupling). If real users or payments exist, **B** is the safe default because it preserves everything without interpreting it; mapping into the new model is then the backend plan's job (`legacy_id_map`, contract section on target model). Do not choose C until OQ-18 is answered. |
| DP-2 | What about `auth.users` (Supabase Auth accounts)? | Keep and restore (delicate), export only email and profile data and ask players to reset, or drop | The new backend has its own auth; passwords do not transfer between hash schemes unless the new backend supports the legacy hash. Plan on password reset for everyone unless the backend plan says otherwise. Do not restore the `auth` schema into the new project unless there is a concrete need (VERIFY how Supabase handles it). |
| DP-3 | Is anything live that real players use today? | yes / no | If yes, you need a maintenance window and a rollback (sections 5 to 8). If the legacy site is not taking real registrations or payments, downtime is free and the plan simplifies to: freeze, dump, restore, verify. |
| DP-4 | Retention of payment records | period set by owner or accountant | Keep an encrypted dump of the Seoul database (or at least `tournament_registrations` and `users`) for that period, independent of both Supabase projects. |
| DP-5 | Storage objects | copy / do not copy | Only if section 1.5 shows buckets with real content. Prefer copying into the new project with the same bucket names and object keys so URLs only change host. |
| DP-6 | Timing relative to the new backend | before / after Railway backend exists | The new Singapore project is needed before the backend is built, for staging. **Create the empty projects first (steps 3.2, 3.3) regardless; copy production data last,** as close to cutover as possible, so you do not copy it twice. |
| DP-7 | Plan tier | paid for production now, free for staging | Daily backups on a paid plan are required before real payments (FEAT-000 F-NFR-006). Plan names, prices and backup retention are VERIFY items. |

Record the decisions in the sign-off sheet (section 12).

## 3. Preparation (no downtime)

### 3.1 Inventory and compare
- [ ] 3.1.1 Run section 1.5 against Seoul. Compare with section 1. Write down differences: unexpected tables, extra extensions, Storage buckets, `auth.users` count.
- [ ] 3.1.2 List every consumer that connects (section 1.3): live Vercel project, Django host, Edge Functions, scheduled jobs, any BI tool or admin access. Each one will need a new connection string or be turned off.
- [ ] 3.1.3 Note the Postgres major version of Seoul (`select version();`). The target must be the same or newer; restoring a dump from a newer into an older major version is not supported.

### 3.2 Create the Singapore production project
- [ ] 3.2.1 In the Supabase dashboard create a new project in region **Southeast Asia (Singapore) = ap-southeast-1** (VERIFY the exact dashboard label). Name it clearly (for example `pg-prod-sg`).
- [ ] 3.2.2 Generate a strong database password and store it in a password manager. Do not reuse the Seoul password.
- [ ] 3.2.3 Choose the paid plan for production (DP-7) before taking real payments; enable daily backups and note the retention you actually see (VERIFY).
- [ ] 3.2.4 Record project reference, direct connection host, pooler host and port for transaction mode and session mode (VERIFY names and ports in the dashboard).
- [ ] 3.2.5 Enable on the new project only the extensions the app needs. The legacy schema uses `uuid-ossp`; a new backend using `gen_random_uuid()` needs no extension (built in on current Postgres versions, VERIFY). Compare with the Seoul list from 3.1.1.

### 3.3 Create the staging project (separate)
- [ ] 3.3.1 Create a second Singapore project for staging (`pg-staging-sg`), different password, free or paid tier as you decide (the tier is not specified in any source).
- [ ] 3.3.2 Staging never receives production personal data unless you scrub it first (see 4.5).

### 3.4 Apply the lockdown on the new projects now
Do section 10 on the empty Singapore projects before any data arrives, so the data is never exposed even briefly.

### 3.5 Tools
- [ ] 3.5.1 A machine with `psql`, `pg_dump`, `pg_restore` of a **version at least as new as the Seoul and Singapore servers** (`pg_dump --version`). A client older than the server can fail or dump incorrectly.
- [ ] 3.5.2 Enough disk for the dump (use the size from 1.5), plus an encrypted place to keep it (DP-4). Dumps contain personal data: store them encrypted, delete working copies after sign-off.
- [ ] 3.5.3 Connection strings in environment variables for the session only:

```sh
# TEMPLATE. Set values by typing or pasting them into the shell; never commit them.
export SEOUL_DB_URL='<postgresql://postgres:<PASSWORD>@<SEOUL_DIRECT_HOST>:5432/postgres>'
export SG_DB_URL='<postgresql://postgres:<PASSWORD>@<SG_DIRECT_HOST>:5432/postgres>'
# Use the DIRECT (or session-mode) connection for dump and restore. Do not use the transaction-mode pooler for pg_dump/pg_restore.
```

## 4. Dump and restore procedure (templates)

Choose DP-1 first. If **A (start clean)**, skip 4.2 to 4.4, and just keep the encrypted archive from 4.1.

### 4.1 Rehearsal dump (no downtime, repeatable)

```sh
# TEMPLATE: custom-format dump of only the public schema, no ownership or ACL (target roles differ).
pg_dump "$SEOUL_DB_URL" \
  --format=custom --no-owner --no-privileges \
  --schema=public \
  --file=seoul-public-REHEARSAL.dump

# Archive the schema separately to read it, and to diff against schema.sql:
pg_dump "$SEOUL_DB_URL" --schema-only --schema=public --no-owner --no-privileges --file=seoul-public-schema.sql
```

Why only `public`: Supabase manages the `auth`, `storage`, `realtime` and other schemas, and restoring them across projects needs care (VERIFY). If DP-2 requires the auth data, export it as data only (for example `\copy` of selected columns to CSV from `auth.users`) and treat it as personal data.

### 4.2 Rehearsal restore into the staging project (or an empty Singapore production project)

```sh
# TEMPLATE
pg_restore --dbname="$SG_STAGING_DB_URL" --no-owner --no-privileges --exit-on-error \
  --single-transaction seoul-public-REHEARSAL.dump
```

Expected problems and how to read them: errors about missing role `authenticated`, `anon` or `service_role` mean the dump references Supabase roles that exist in a new Supabase project but not in plain Postgres (use `--no-privileges` as above); a trigger on `auth.users` (`on_auth_user_created`) cannot be restored if `auth.users` is not restored. That trigger belongs to the retired design: delete it from the restore (see 4.3). Policies reference `auth.uid()`; they also belong to the retired design.

### 4.3 Clean up what you do not want (applies to option B)

After a successful restore into the new project, run only what you decided in section 1.4. Example (adapt; review before running; this is a template):

```sql
-- TEMPLATE. Remove retired-design objects after confirming the new backend does not use them.
drop trigger if exists on_auth_user_created on auth.users;   -- only if auth.users exists in the new project and you really want this gone
drop function if exists public.handle_new_user();
drop function if exists public.increment_games(uuid, integer);
-- Policies are removed as part of lockdown (section 10); do not rely on them.
```

Leave `check_tournament_capacity` and its trigger if you still want that capacity guard until the new backend replaces it; otherwise remove it with the rest of the legacy schema when the new model is deployed.

### 4.4 Storage objects (only if buckets exist)

Copy objects with a tool that works with Supabase Storage (the S3-compatible endpoint, the CLI or the dashboard; VERIFY what the current Storage product offers), preserving bucket names and object keys, then compare object counts and total size per bucket with the Seoul figures from 1.5. Public buckets will change host with the move: record the old and new public host. Any absolute URL stored in `gallery_photos.url` that points at the old project host must be rewritten or the rows dropped (DP-1).

### 4.5 Staging data
Staging gets the rehearsal restore of production only if you scrub personal data first (emails, phones, birthdays, `password_hash`, Razorpay ids). Otherwise seed staging with synthetic data.

## 5. Downtime and cutover plan (option B or C; with option A there is nothing to cut over)

Estimate the window from the rehearsal: time of the dump plus the restore plus verification plus connection-string changes. Add margin. Pick a low-traffic time and no live event (check the event calendar). Tell players in advance if registration or payments will pause.

| Step | Action | Who |
|---|---|---|
| T-7 days | Rehearsal dump/restore into staging done; timings recorded; verification queries (section 7) pass on the rehearsal. | Owner |
| T-1 day | Confirm the new project settings (lockdown done, backups on, paid plan). Confirm rollback owner and contact list. Announce the window. | Owner |
| T-0 | **Freeze writes**: put the legacy site in maintenance or stop the legacy Django service, and stop anything that writes (scheduled jobs, Edge Functions). Confirm in Seoul that connections other than yours have dropped (`select count(*) from pg_stat_activity where datname = current_database();`). Do not rely on stopping the website alone. | Owner |
| T+0:05 | Final dump (4.1 command, new file name, with the date). Record the Seoul exact row counts (section 7) before and after the dump. | Owner |
| T+0:xx | Restore into the Singapore production project (4.2 command with `$SG_DB_URL`). Run the cleanup chosen in 4.3. Re-run lockdown checks (section 10) because a restore can create tables without RLS. | Owner |
| T+0:xx | Run the verification queries (section 7) on both sides and compare. Any mismatch: stop, go to section 8 (rollback), do not proceed. | Owner |
| T+0:xx | Update connection strings (section 9). Restart services. Smoke test (section 7.4). | Owner |
| T+0:xx | Lift maintenance. Watch logs for the first hour. | Owner |
| Sign-off | Section 12. Keep Seoul read-only until the retention date. | Owner |

If the legacy app is already off and the new backend is not live yet, there is no cutover: copy the data, verify, and keep the dump until the new backend imports it.

## 6. Making Seoul read-only (do this at T-0 and keep it until sign-off)

Two safe ways, pick one (VERIFY availability in the dashboard):
1. Revoke write privileges from the application roles: `revoke insert, update, delete, truncate on all tables in schema public from <app_role>;` (template; the role used by Django is the one in `DB_USER`).
2. Rotate or remove the Seoul database password for every consumer except yourself, so nothing can write by accident.

Do not pause or delete the Seoul project (a paused or deleted project may become unrecoverable after a period; VERIFY) until the retention date in section 12.

## 7. Verification

### 7.1 Row counts per table (run on both databases, compare line by line)

```sql
-- TEMPLATE. Exact counts, public schema. Adjust the table list to what you restored.
select 'users' as t, count(*) from public.users
union all select 'ratings', count(*) from public.ratings
union all select 'tournaments', count(*) from public.tournaments
union all select 'tournament_registrations', count(*) from public.tournament_registrations
union all select 'tournament_rounds', count(*) from public.tournament_rounds
union all select 'pairings', count(*) from public.pairings
union all select 'gallery_photos', count(*) from public.gallery_photos
order by 1;
```

Pass: every count identical on Seoul (after freeze) and Singapore.

### 7.2 Money totals and latest ids

```sql
-- TEMPLATE
select payment_status, count(*), count(razorpay_payment_id) as with_payment_id
  from public.tournament_registrations group by 1 order by 1;

select t.id, t.name, t.entry_fee, count(r.*) filter (where r.payment_status = 'paid') as paid_count,
       t.entry_fee * count(r.*) filter (where r.payment_status = 'paid') as expected_collected
  from public.tournaments t left join public.tournament_registrations r on r.tournament_id = t.id
 group by t.id, t.name, t.entry_fee order by t.id;

select max(created_at) as latest_user from public.users;
select max(registered_at) as latest_registration from public.tournament_registrations;
select id, registered_at from public.tournament_registrations order by registered_at desc limit 5;
```

Pass: grouped counts and per-tournament expected totals identical; the latest five registrations identical. Reconcile `paid` rows with the Razorpay dashboard for the same period if real payments exist (a mismatch is a Razorpay-side question, not caused by the move).

### 7.3 Checksums (row content, not just counts)

```sql
-- TEMPLATE. Order-independent checksum per table; run on both sides.
select md5(string_agg(t::text, '|' order by id)) from public.users t;
select md5(string_agg(t::text, '|' order by id)) from public.tournament_registrations t;
select md5(string_agg(t::text, '|' order by id)) from public.tournaments t;
select md5(string_agg(t::text, '|' order by id)) from public.ratings t;
select md5(string_agg(t::text, '|' order by id)) from public.pairings t;
select md5(string_agg(t::text, '|' order by id)) from public.tournament_rounds t;
select md5(string_agg(t::text, '|' order by id)) from public.gallery_photos t;
```

Pass: identical hashes. These queries load every row into one aggregate; they are fine at this expected size but check the size from 1.5 first. If you removed or changed columns during cleanup (4.3), compare only the surviving columns.

### 7.4 Structure and smoke tests
- [ ] Extension list on Singapore matches the needed set; functions and triggers you meant to keep exist (`\df public.*`, `\d tournament_registrations`).
- [ ] Sequences: the legacy tables use UUID keys, so no sequence reset is needed. If the new backend adds serial or identity columns, check they continue above the max id.
- [ ] Anonymous-request lockdown test (section 10) passes against the Singapore project.
- [ ] If the legacy Django app is still live: log in, view tournaments, register for a free test event, and for paid flows use Razorpay **test** keys only; then delete the test rows.
- [ ] If the new backend is live: login, registration and payment smoke test against the new database on staging first, then production.
- [ ] Storage: object count and total size per bucket match (4.4); one public object loads from the new host.
- [ ] Time zone check: `show timezone;` on both; timestamps compare as timestamptz so the instant is identical.

## 8. Rollback plan

Decide the point of no return before you start: **the first write to the Singapore database after cutover.** Before that point, rollback is cheap.

| Situation | Action |
|---|---|
| Verification fails before connection strings change | Do nothing to Seoul except lift the freeze (restore write grants or password). Fix the issue, drop and recreate the Singapore database content, retry in a new window. |
| Failure after connection strings change but before any new write | Revert connection strings to Seoul values (kept in your password manager), restart services, lift the freeze. |
| Failure after new writes happened on Singapore | Do not switch back blindly: Seoul does not have the new rows. Decide per case: fix forward on Singapore, or dump the new rows and replay onto Seoul, then switch. Keep a list of what was written (registrations, payments). |
| Seoul retention | Keep the Seoul project untouched and read-only until sign-off plus the retention period you choose in section 12 (suggested: at least 30 days after cutover and after one full event cycle; the number is a proposal, not from the sources). After that, take a final encrypted dump, then delete. |

Keep the pre-cutover environment values for Railway and Vercel written down (names and where they are; not values in this file) so the revert is a copy and paste.

## 9. Post-move connection string changes

| Where | Variable (names from this repo and the plan) | Change |
|---|---|---|
| Railway production: API, worker, scheduler | Database URL variable(s) of the backend (legacy Django: `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER`, `DB_PASSWORD`) | Point to the Singapore **pooler, transaction mode** host and port from step 3.2.4. Django: set `DISABLE_SERVER_SIDE_CURSORS = True`; avoid prepared statements, advisory locks and LISTEN/NOTIFY through the pooler; run migrations over the direct or session connection only (contract 6.4; VERIFY pooler behaviour). |
| Railway staging | Same variables | Point to the staging Singapore project. Never share production credentials with staging. |
| Vercel (all environments) | none | The web app holds no database or Supabase key. Only `NEXT_PUBLIC_SUPABASE_STORAGE_HOST` (and `NEXT_PUBLIC_MEDIA_BUCKET`, `NEXT_PUBLIC_MEDIA_BASE_URL` if used) change if media moved; then redeploy because they are inlined at build time. |
| Razorpay dashboard | Webhook URL | Unchanged by the database move (points at Railway). Check it only if the Railway domain changed. |
| Legacy Vite app, if still running | `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` | Not needed after the cutover; the legacy app should be retired rather than repointed. If it must keep running, it needs the new project URL and anon key, which conflicts with the lockdown in section 10. Do not run both. |
| Supabase Edge Functions | `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, Razorpay keys | Retired design; do not recreate. |
| Anything else (BI tool, backup script, admin access) | from section 3.1.2 | Update or remove. |

Test every changed connection from the real service (a health check that runs a trivial query), not just from your laptop.

## 10. Supabase lockdown checklist

Why: Supabase generates a REST API (PostgREST, the "Data API") and Storage endpoints for every project. The backend owns all data access, so none of that surface should expose data. Requirements: ARCH-001-backend-contract 6.4, FEAT-000 F-NFR-004, PLAN-001 R20. Apply to **every** project (Singapore production, Singapore staging, and Seoul until it is retired). Tick each item and write the date in the sign-off sheet.

### 10.1 Data API and row-level security
- [ ] L-01 Preferred: **disable the Data API** for the project or remove the `public` schema from the exposed schemas (VERIFY where this setting lives in the current dashboard). Record which option you used.
- [ ] L-02 Regardless of L-01 (defence in depth): **enable RLS on every table** in the exposed schemas and create **no policies**. Template to list tables without RLS: `select schemaname, tablename from pg_tables where schemaname = 'public' and not rowsecurity;` Expected: no rows. Template to enable: `alter table public.<table> enable row level security;` for each, or loop over `pg_tables`.
- [ ] L-03 **Remove the legacy policies** copied from `schema.sql` (they grant public read of users and registrations): list with `select schemaname, tablename, policyname from pg_policies where schemaname = 'public';` Expected: no rows. Drop each with `drop policy "<name>" on public.<table>;`. The legacy "Public can view all profiles" and "Count registrations is public" policies expose personal data if RLS is on but these policies remain.
- [ ] L-04 Revoke default grants from the API roles on application schemas: `revoke all on all tables in schema public from anon, authenticated;` and the same for sequences and functions; also `alter default privileges in schema public revoke all on tables from anon, authenticated;` (templates; VERIFY role names and default grants in the current Supabase).
- [ ] L-05 Check functions: `SECURITY DEFINER` functions callable by `anon` are a bypass. List `select proname, prosecdef from pg_proc p join pg_namespace n on n.oid = p.pronamespace where n.nspname = 'public';` and revoke execute from `public`, `anon`, `authenticated` or drop the retired ones (`increment_games`, `handle_new_user`).
- [ ] L-06 Add a recurring check (CI or a monthly calendar item) that fails if any table in an exposed schema has RLS off (contract 6.4). A restore, a migration or a dashboard click can silently create an unprotected table.

### 10.2 Anonymous-request verification (do this after every restore)

```sh
# TEMPLATE. The anon key is public by design on Supabase, but we use it here only to prove it gets nothing.
curl -s -o /dev/null -w "%{http_code}\n" "https://<PROJECT_REF>.supabase.co/rest/v1/users?select=email&limit=1" \
  -H "apikey: <ANON_KEY>" -H "Authorization: Bearer <ANON_KEY>"
curl -s "https://<PROJECT_REF>.supabase.co/rest/v1/tournament_registrations?select=*&limit=1" \
  -H "apikey: <ANON_KEY>" -H "Authorization: Bearer <ANON_KEY>"
```

Pass: an error status or an empty array `[]` (with RLS on and no policies the result is empty, with the API disabled it is an error). Fail: any row. Repeat for every table name listed by `\dt public.*`, for the `rpc` endpoints (`/rest/v1/rpc/<function>`), and with no key at all.

### 10.3 Keys and secrets
- [ ] L-07 **Service-role key lives only in Railway secrets** (and only if the backend needs it, for example to create signed Storage upload URLs). It is not in Vercel (any scope), not in `NEXT_PUBLIC_*`, not in GitHub secrets, not in logs, not in the repository (`git log -S` search for `service_role` and `eyJ` patterns).
- [ ] L-08 **The anon key is unused** by the new system. The web app holds no Supabase key (ARCH-001 17.2). Do not set `NEXT_PUBLIC_SUPABASE_ANON_KEY`; the build guard also refuses `NEXT_PUBLIC_*` names containing `KEY`.
- [ ] L-09 Database password: unique per project, in a password manager, in Railway only. Not shared with staging.
- [ ] L-10 Rotate JWT secret / API keys on the Seoul project too if the legacy anon key was ever shipped in a public bundle (it was: the Vite build inlined `VITE_SUPABASE_ANON_KEY`). With L-02/L-03 the anon key grants nothing, but rotating removes doubt (VERIFY the rotation procedure and side effects in the dashboard).

### 10.4 Storage
- [ ] L-11 List buckets and their public flag (`select id, public from storage.buckets;`). Expected for media: published media in a **public-read** bucket; draft or unpublished media in a **private** bucket served by signed URLs (contract 6.4, FEAT-001 OQ-14).
- [ ] L-12 **No anonymous writes**: check `storage.objects` policies (`select * from pg_policies where schemaname = 'storage';`). Writes happen only through backend-issued signed upload URLs. Remove any policy that allows `anon` or `authenticated` insert, update or delete (VERIFY that Storage RLS works this way in the current product).
- [ ] L-13 Set bucket file size and MIME type limits to the intended image types; no SVG (the web app also sets `dangerouslyAllowSVG: false`).
- [ ] L-14 Listing: public buckets should not allow anonymous listing of all object keys if you can avoid it (VERIFY).

### 10.5 Connection, network, backups
- [ ] L-15 **Pooler in transaction mode** for the application; Django has `DISABLE_SERVER_SIDE_CURSORS = True`; migrations over direct or session mode only.
- [ ] L-16 Direct database access limited to Railway and the owner: use Supabase network restrictions (allow-list of IP ranges) if available on the plan (VERIFY). Railway egress IPs may not be static (VERIFY Railway static outbound IP options); if they cannot be fixed, rely on a strong password and SSL and record the accepted risk. Require SSL (`sslmode=require` or `verify-full`) in every connection string.
- [ ] L-17 **Daily backups on a paid plan before real payments**, and a **restore drill**: restore the latest backup into the staging project (or a scratch project), run the section 7 queries, record the date and the time taken (FEAT-000 F-NFR-006). Point-in-time recovery, if offered, is an owner decision (VERIFY plan features and retention).
- [ ] L-18 **Separate staging project** with its own password and keys; never point staging services at production.
- [ ] L-19 Extension review: `select extname from pg_extension;` Keep only what is needed. Review any extension that exposes network access or file access (VERIFY the list available). Disable `pg_graphql`/GraphQL exposure if the Data API is disabled (VERIFY).
- [ ] L-20 Supabase account hygiene: 2FA on the owner account and any member, minimum members, no shared logins (OPS-002 account hygiene register). A team member can read project API keys and may reset the database password.
- [ ] L-21 Alerts: enable any available notification for project health, disk and connection usage (VERIFY).

## 11. Secret rotation after the move

Do after the production cutover is signed off. Rotating invalidates the old values everywhere, so update Railway first and test.

| Secret | Action | Where it lives afterwards |
|---|---|---|
| New Singapore database password | Already unique (3.2.2). Rotate again if it was ever pasted into a shell history, ticket or chat. | Railway only (password manager as backup) |
| Seoul database password and API keys | Rotate, or leave the project read-only (section 6) and rotate before archiving; do not reuse for anything | password manager |
| Supabase service-role key (new project) | Generate once the backend is configured; store in Railway only | Railway |
| Supabase anon key (all projects) | Not used; no action except L-10 on Seoul | n/a |
| Razorpay API keys and webhook secret | Rotate if Edge Function secrets in Seoul held them (they did: `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`); live keys are on Railway only afterwards | Railway |
| Django `DJANGO_SECRET_KEY` and JWT signing key | Rotate if the legacy value was the insecure default or ever committed; the settings default is `insecure-dev-key-change-me` | Railway |
| SendGrid / email provider key | Rotate if it was in a Seoul Edge Function secret or the legacy host | Railway |
| `REVALIDATE_SECRET`, `PREVIEW_SECRET` | Not affected by the database move; follow OPS-001 7.3 and 7.4 on their own schedule | Vercel and Railway |

After rotation: run the smoke test (7.4), confirm that no old value still works (try one old key against the Seoul API and expect failure), and delete working dumps and shell history entries.

## 12. Sign-off sheet (owner fills in; no secret values)

| Item | Value / date | Initials |
|---|---|---|
| DP-1 migrate legacy data (A / B / C) | | |
| DP-2 auth.users handling | | |
| DP-4 payment-record retention period and where the archive is kept | | |
| Seoul inventory (section 1.5) saved: tables, row counts, buckets, auth users, size | | |
| Singapore production project ref, Postgres version, plan, backups on (date) | | |
| Singapore staging project ref, plan | | |
| Rehearsal restore date and duration | | |
| Cutover window start / end | | |
| Row counts match (7.1) | | |
| Money totals and latest ids match (7.2) | | |
| Checksums match (7.3) | | |
| Smoke tests passed (7.4) | | |
| Lockdown L-01 to L-21 complete (list any accepted risk) | | |
| Anonymous-request test passed on production and staging (10.2) | | |
| Restore drill date (L-17) | | |
| Connection strings changed in Railway production / staging (9) | | |
| Secrets rotated (11) | | |
| Seoul set read-only on (date) | | |
| Seoul retention end date; final encrypted dump location; deletion date | | |
| Owner sign-off | | |

## 13. Discrepancies and open questions

| Id | Item |
|---|---|
| D-R1 | The plan names the deliverable `ARCH-001-db-region-move.md`; delivered as `RUNBOOK-001-database-region-move.md` as instructed. |
| D-R2 | PLAN-001 TASK-117 says the lockdown has "RLS enabled with no policies"; the legacy `schema.sql` creates permissive policies (for example public SELECT on users and registrations) that a dump/restore would carry across. This runbook therefore requires dropping policies (L-03), which the plan wording does not mention. |
| D-R3 | `MIGRATION.md` (legacy plan) keeps Supabase Postgres and has Django talk to it directly with `managed = True` models, while the current plan treats the backend as replaced. It is unknown whether Django `migrate` ever ran against the live database; section 1.5 includes `django_migrations` to find out. |
| D-R4 | The repo root `.env.example` still references `VITE_SUPABASE_ANON_KEY`; the lockdown makes that key useless, and TASK-107 removes the file. |
| D-R5 | The plan assumes the Django backend uses the pooler; the legacy `settings.py` defaults to port 5432 (direct). The pooler change is new work for the backend plan. |
| D-R6 | The Seoul project contents are inferred from the repository only. The live database may differ (extra tables, Storage buckets, Supabase Auth users). |
| D-R7 | FEAT-000 says the region move and legacy data migration may be combined if the backend is rebuilt (OQ-18, still open); this runbook only supports the separable approach (DP-1 option C is described, not planned). |

**Questions for the owner**
1. Are there real players, registrations or payments in the Seoul database today, or only test data? Is the legacy site live to the public?
2. Does anyone need their existing account kept (rating history), or is a clean start with a password reset acceptable (DP-1, DP-2)?
3. How long must payment records be retained, and who (accountant) needs the archive?
4. Are there Storage buckets in the Seoul project, and what is in them?
5. Is any other system connected to the Seoul database (analytics, backups, admin tools)?
6. Which plan will production use, and who pays? Is the staging project on a free or paid tier?
7. Preferred cutover window and acceptable downtime; any event dates to avoid?
