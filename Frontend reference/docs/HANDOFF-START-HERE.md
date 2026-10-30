# PG v2 — Start Here

This repository is the implementation handoff for Pawn's Gambit v2. The coded screens are the visual source of truth. Product behavior is defined by the accompanying contracts, migrations and state documents.

## First 10 minutes

1. Read `README.md`.
2. Run `npm install`.
3. Copy `.env.example` to `.env.local`.
4. Keep `VITE_USE_MOCKS=true` for design review.
5. Run `npm run dev`.
6. Open `/handoff`.
7. Open `/handoff/design-system` for exact tokens.
8. Open `/handoff/states` for loading/empty/error/payment/live-event states.
9. Review every route listed in `docs/SCREEN-MAP.md` before integrating backend data.

Mock review accounts:
- Player: `player@pg.local` + any password
- Admin: `admin@pg.local` + any password

The `/handoff` route also exposes role-switch buttons in mock mode.

## Source-of-truth order

When two artifacts appear to disagree, use this order:

1. Security and server ownership: `docs/AUTH-SECURITY.md`, `docs/BACKEND-CONTRACT.md`, migrations/functions.
2. Product behavior and state: `docs/UX-FLOWS.md`, `docs/STATE-MACHINES.md`, `docs/EVENT-ENGINE.md`.
3. Visual implementation: coded route + `src/styles/index.css`.
4. Public homepage composition: `VISUAL-REFERENCE.html` / `VISUAL-REFERENCE.css`.
5. Copy baseline: `docs/COPY-BASELINE.md`.
6. Supporting rationale: remaining docs.

Do not silently alter an invariant. Record an intentional change in `docs/DECISIONS.md`.

## What is already decided

- React/Vite frontend and Supabase backend.
- Google and email/password authentication.
- Separate private profile, public player identity and protected roles.
- Server-owned price/payment/capacity/pairing/rating state.
- Separate Blitz/Rapid/Classical Glicko-2 pools.
- One configurable Event domain for social, tournament, league, workshop and special formats.
- CMS-controlled public copy, stories, testimonials and media collections.
- Static/carousel media selection per collection.
- Public discovery before authentication; authentication only when required to commit/register.
- Player experience prioritises the next useful action, not a generic analytics dashboard.
- Admin experience is a Control Room organised around real operational jobs.

## Before writing backend code

Read:
- `docs/FRONTEND-BACKEND-INTEGRATION.md`
- `docs/SCREEN-MAP.md`
- `docs/CONTENT-MODEL-MAP.md`
- `docs/DATABASE-SCHEMA.md`
- `docs/MIGRATION-FROM-CURRENT.md`

The current production Supabase schema must be exported and reconciled before applying target migrations. Do not overwrite production from an assumed historical schema.

## Before changing the UI

Read:
- `docs/UI-SPECIFICATION.md`
- `docs/COMPONENT-CATALOG.md`
- `docs/RESPONSIVE-BEHAVIOR.md`
- `docs/UI-STATES.md`
- `docs/VISUAL-QA.md`
- `docs/COPY-BASELINE.md`

Do not replace Newsreader/Anek Latin/Fragment Mono with generic system fonts unless the approved font fails to load and the documented fallback is being used.

## Definition of done

Implementation is not launch-ready until every item in `docs/LAUNCH-CHECKLIST.md` and the applicable flows in `docs/TEST-PLAN.md` pass in staging.
