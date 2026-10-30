# Developer Handoff

## Visual implementation first

Run the repository in mock mode and open `/handoff` before changing any page. The coded route is the canonical visual implementation. Exact tokens are in `design-tokens.json`, `docs/UI-SPECIFICATION.md` and `src/styles/index.css`. Use `docs/SCREEN-MAP.md` to map each screen to backend ownership and `docs/BACKEND-WIRING-CHECKLIST.md` as the integration pass.


## What is already decided

Do not reopen these without a concrete technical reason:
- React/Vite/Supabase architecture
- unified event model for social + competitive experiences
- structured CMS rather than arbitrary page builder
- Google + email auth
- server-owned roles, money, capacity, pairings publication and ratings
- separate blitz/rapid/classical rating pools
- permanent past-event archive
- media collection abstraction for static/carousel switching
- testimonial photo + quote + consent model
- Warm Social Club visual system
- public discovery before authentication
- player/admin experiences are distinct

## Implementation order

### Sprint 0 — reconcile current backend
Export production schema/functions/RLS. Apply migration plan and reconcile current records. Do not build the new UI against guessed legacy tables.

### Sprint 1 — identity/CMS/public site
Target identity tables, Google login, CMS, media storage, homepage, events/public archive.

### Sprint 2 — registration/payment
Atomic reservation, waitlist, Razorpay order/verification/webhook, player My Events.

### Sprint 3 — event operations
Check-in, admin event Control Room, pairings, rounds, result lifecycle.

### Sprint 4 — rating/history
Pool-specific Glicko-2, transaction ledger, player rating screen, completed-event player history.

### Sprint 5 — hardening
Security tests, concurrency tests, accessibility, performance, analytics, backups and launch runbook.

## Frontend integration seams

`src/lib/api.ts` is the public read adapter. Keep components ignorant of raw Supabase snake_case structures.

Auth lives in `features/auth/AuthContext.tsx`. Replace review data only through this provider/adapters, not scattered conditionals.

CMS/admin screens define the required production composition and interaction hierarchy. Wire their review data and controls to Supabase through domain adapters/queries without redesigning the screen. Use optimistic UI only after server success/reversal semantics are clear.

## Media storage

Recommended bucket: `site-media`.
- public read for published assets
- admin upload/delete/archive
- generate responsive derivatives using image transformation/provider where available
- persist dimensions and alt/focal metadata in `media_assets`

## Event operational permissions

Initial launch can use `admin` for all operations. If multiple event volunteers require access, add `organizer`/`host` capabilities as permissions, not by exposing admin broadly. `event_hosts` already supports event-scoped assignment.

## Pairing

The included pairing function is suitable as a PG engine baseline, not a claim of FIDE-certified pairing. Before official-rated use, validate requirements and swap the provider behind the same round/pairing contract if needed.

## Ratings

The included Edge Function shows the idempotent ledger pattern. Production implementation should be covered by known Glicko-2 vectors and a database transaction/RPC so ledger insertion/current-profile updates/round finalisation commit together.

## Payments

Keep browser integration thin. Never read price from UI state when creating the order. Webhook reconciliation is mandatory even if browser verification succeeds.

## CMS quality bar

An editor must be able to:
- change every major homepage message
- reorder/disable structured sections where allowed
- replace a hero image
- switch a collection static ↔ carousel
- reorder images and set alt/focal point
- create/edit/publish event content
- add any number of testimonials with photos
- publish an event recap/past gallery
without a code deployment.

## Handoff review

Before backend integration starts, review every route through `/handoff`, then walk through `SCREEN-INVENTORY.md`, `SCREEN-MAP.md`, `/handoff/states` and `STATE-MACHINES.md`. If a genuinely new state appears during implementation, add it to the state contract and screen index rather than inventing an isolated UI.
