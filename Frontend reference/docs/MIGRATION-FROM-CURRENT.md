# Migration From Current PG Website

The target model intentionally broadens the existing tournament application into a social-event platform. Perform this as a staged migration, not a flag-day rewrite.

## Phase 1 — inventory
Export actual production schema, RLS policies, Edge Functions and row counts. Treat production as factual source; do not assume older checked-in schema represents it.

## Phase 2 — introduce v2 tables alongside current data
Create CMS/media and target event/rating/payment ledgers. Keep legacy tables readable.

## Phase 3 — migrate data
- users → profiles/public profiles/roles
- tournaments → events
- registrations → event_registrations
- rounds/pairings → event rounds/pairings
- ratings → pool-specific rating_profiles
- gallery → media assets/collections

Write reconciliation SQL comparing source/target counts and key monetary totals.

## Phase 4 — dual-read staging
Point the new frontend at staging target tables. Run real historical events through archive views and replay selected tournament data.

## Phase 5 — command cutover
New registrations/payments/pairings use target backend only. Legacy app becomes read-only.

## Phase 6 — production cutover
Deploy frontend, monitor auth/payment/registration errors, preserve legacy data for agreed retention period, then remove unused paths through a later migration.
