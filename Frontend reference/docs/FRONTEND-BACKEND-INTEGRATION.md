# Frontend ↔ Backend Integration Guide

The screen composition is already implemented. Backend work should replace mock providers with target queries/RPCs/functions without changing the UX contract unless a real technical constraint is documented.

## Mode switch

`VITE_USE_MOCKS=true`
- Uses `src/data/mock.ts` for visual/flow review.
- Enables local role switching.

`VITE_USE_MOCKS=false`
- Uses Supabase/Auth and target backend contracts.

Do not ship production with mock mode enabled.

## Integration sequence

1. Reconcile production database with `docs/MIGRATION-FROM-CURRENT.md`.
2. Apply/adjust migrations in staging.
3. Configure Auth/Google redirect URLs.
4. Wire read-only public content/events first.
5. Wire authentication/profile/onboarding.
6. Wire free registration/capacity/waitlist.
7. Wire Razorpay order/verification/webhook.
8. Wire check-in/event room.
9. Wire pairing/results/rating transactions.
10. Wire admin/CMS mutations and audit.
11. Run security + state + responsive test plans.

## Browser-authoritative vs server-authoritative

Browser may provide:
- navigation/filter choices
- form input
- event intent
- public preferences
- requested action
- provider callback identifiers needed for verification

Server must derive/own:
- authenticated user identity
- role/privilege
- actual fee/currency/member price
- capacity availability/hold expiry
- paid/refunded state
- event eligibility/deadlines
- pairing publication
- rating mutation
- audit history

## Public data

### Home
Frontend function: `getSiteContent()` + `getEvents('upcoming')`.
Backend: published CMS page/sections/media plus public event projection.
Do not expose draft CMS content through public policies.

### Event discovery/detail
Return only public-safe event fields. Avoid leaking internal notes, payment provider details or private registration information.

### Stories/testimonials
Public query returns only published/consented records.

## Auth

Google: Supabase OAuth/PKCE through `signInWithOAuth({ provider:'google' })` and `/auth/callback`.
Preserve the route/event intent across auth. First account creation routes to `/welcome` before returning to the original conversion when profile completion is required.

Roles are read from protected role storage, not editable profile metadata.

## Registration/payment

Frontend flow:
1. User presses Save/Join.
2. Server/RPC reserves capacity or returns waitlist/sold-out/free confirmation.
3. Paid flow receives server-created payment order.
4. Browser opens Razorpay.
5. Verification function validates exact authenticated order/payment/amount/currency/status.
6. UI reads canonical registration status from server.
7. Webhook provides idempotent reconciliation.

Never mark paid from browser state.

## Event room

The player view consumes canonical event/registration/check-in/round/pairing/result state. Use realtime subscription or a deliberate polling strategy for pairings/results. Always allow manual refresh fallback.

## Ratings

Expose current `rating_profiles` + append-only transaction/game ledger. Finalisation occurs server-side in one idempotent transaction per round/rating period.

## CMS

Structured fields should map to CMS tables/JSON contracts documented in `docs/CONTENT-MODEL-MAP.md`. The frontend layout is not stored as arbitrary page-builder HTML.

## Mutations

For all mutations:
- optimistic UI only where reversal is safe
- show pending state
- surface domain-specific error
- invalidate/refetch relevant query keys
- record admin audit where required

## Query/cache recommendation

Use TanStack Query keys by domain, e.g.:
- `['site','home']`
- `['events','upcoming',filters]`
- `['event',slug]`
- `['me','registrations']`
- `['event-room',eventId]`
- `['me','ratings',pool]`
- `['admin','event',eventId,'registrations']`

Mutations should invalidate the smallest authoritative set.
