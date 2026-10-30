# Frontend Skill (Web)

## Purpose
Implement a Next.js web frontend task from a task definition.

## Steps

1. Read task from `docs/plans/PLAN-NNN-*.md` (full specification) and `docs/architecture/ARCH-001-web-frontend.md` (conventions).
2. Create component or route under `web/src/` per the layout rules (app/ for routes, components/{ui,domain,layout,features} for reusable UI).
3. Use the `PgApi` layer (never import fetch, never call an API directly). Server routes use `lib/data/public/*`; browser routes use `useApi()` and TanStack Query.
4. Handle loading, error, empty and data states per DoD-S.
5. Build and test with `npm run check` (lint, typecheck, tests); run Playwright smoke tests on the target route.
6. Validate bundle sizes with `ANALYZE=true npm run build` and check the build output for static/ISR prerender as specified.
7. Submit with a link to the task, reference to ARCH-001 sections, test results and bundle analysis.
