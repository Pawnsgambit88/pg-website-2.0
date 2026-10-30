# Backend Wiring Checklist

Use this once staging migrations are reconciled. The visual UI should not be redesigned during this pass.

## Foundation
- [ ] Set `VITE_USE_MOCKS=false` in staging.
- [ ] Configure Supabase URL/anon key.
- [ ] Configure exact local/staging/production Auth redirect URLs.
- [ ] Confirm protected `user_roles` model and RLS.
- [ ] Confirm site-media bucket policies.

## Public
- [ ] `getSiteContent()` reads published CMS content and section media collections.
- [ ] Upcoming event query supplies homepage and `/play`.
- [ ] Event detail projection exposes only public-safe fields.
- [ ] Past-event archive reads completed published events.
- [ ] Stories return published only.
- [ ] Testimonials return published + consented only.
- [ ] Contact action uses approved destination/provider and rate protection.

## Auth/profile
- [ ] Email sign-in/create/reset wired.
- [ ] Google OAuth/PKCE wired.
- [ ] Return-to-intent after auth verified.
- [ ] First-login profile/preferences write to permitted fields only.
- [ ] Public player profile is a separate safe projection/table from private profile.

## Registration/payment
- [ ] Capacity reservation RPC is atomic.
- [ ] Free event confirms without Razorpay.
- [ ] Waitlist never takes payment.
- [ ] Paid order amount/currency derived server-side.
- [ ] Browser provider response is server-verified.
- [ ] Webhook idempotently reconciles order/payment/registration.
- [ ] Hold expiry releases capacity.
- [ ] Cancellation/refund rules match published policy.

## Event room
- [ ] Check-in honors event/check-in window and registration state.
- [ ] Player sees only their permitted pairing/result data plus public standings.
- [ ] Pairing publication updates Event Room without requiring hard reload.
- [ ] Result submission is authorised and auditable.

## Ratings
- [ ] Blitz/Rapid/Classical profile rows migrate correctly.
- [ ] Rating transaction ledger is append-only.
- [ ] Round finalisation is idempotent and transactional.
- [ ] Rerunning finalisation cannot rerate.

## Admin/CMS
- [ ] Admin dashboard aggregates real operational state.
- [ ] CMS structured fields save/publish/version correctly.
- [ ] Media uploads persist alt/focal/rights metadata.
- [ ] Static/carousel collection behavior persists.
- [ ] Testimonial publish validation enforces quote + photo + consent.
- [ ] Event Builder persists all 8-step configuration.
- [ ] Control Room tabs read canonical server state.
- [ ] Pairing generation/publish/finalise functions require admin.
- [ ] Messages are logged/auditable.
- [ ] Payments reconciliation uses canonical provider IDs.
- [ ] Role mutations use admin-only server function.

## Release verification
- [ ] `/handoff` screen pass completed.
- [ ] `/handoff/states` state pass completed.
- [ ] `docs/VISUAL-QA.md` complete.
- [ ] `docs/TEST-PLAN.md` complete.
- [ ] `docs/LAUNCH-CHECKLIST.md` complete.
