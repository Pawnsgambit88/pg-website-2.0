# Pawn's Gambit web (`web/`)

Next.js 16 App Router frontend. Independent npm package (own `package.json` and lockfile), not a root workspace member.
Governing documents: `docs/architecture/ARCH-001-web-frontend.md`, `.claude/rules/40-frontend.mdc`.
Status: TASK-007 scaffold only. No features, no tokens, no lint rule set beyond `eslint-config-next`.

## Commands

| Command | Purpose |
|---|---|
| `npm run dev` | Dev server (Turbopack). |
| `npm run build` | `npm run guard:env && next build && npm run check:build-output` (explicit chain: `ignore-scripts=true` disables pre/post hooks). |
| `npm start` | Serve the production build. |
| `npm run typecheck` | `tsc --noEmit`. |
| `npm run lint` | ESLint flat config (`eslint-config-next` core-web-vitals + typescript). TASK-008 adds the project rules. |
| `npm test` | Node built-in test runner for env parsing and the build guard (`src/**/*.test.ts`). Vitest arrives with TASK-008. |
| `npm run check:deps` | dependency-cruiser (`.dependency-cruiser.cjs`: M3 to M6, F-04, cycles) plus `scripts/check-module-directives.ts` (M6 content checks, M13). |
| `npm run check:build-output` | Asserts `.next` output after `next build` (see "Architecture lint and build-output checks"). |
| `npm run check` | typecheck + lint + format:check + check:deps + test + check:tokens. |
| `npm run analyze` | `ANALYZE=true next build --webpack`; report in `.next/analyze/*.html`. See notes. |
| `node scripts/measure-baseline.mjs [--write]` | Gzip First Load JS per route from the Turbopack build; `--write` updates `budgets.json` `baseline`. |

Local setup: `nvm use` (Node 24), `cp .env.example .env.local`, `npm ci`.

## End-to-end tests (TASK-009)

Playwright 1.64 with `@axe-core/playwright`. Not part of `npm run check` (needs browsers and a production build).

| Command | Purpose |
|---|---|
| `npm run e2e:install` | Downloads Chromium and WebKit (`npx playwright install`; `ignore-scripts=true` means no postinstall does it). CI adds `--with-deps`. |
| `npm run e2e` | Builds the mock profile (`npm run build` with `NEXT_PUBLIC_USE_MOCKS=true`), starts `next start` on a free port, runs every project. |
| `npm run e2e -- --grep @smoke` | The PR smoke selection (OPS-002 G9). |
| `npm run e2e -- --project=chromium-320` | One project. Names: `chromium-{1440,1280,1024,768,390,320}`, `webkit-{1440,390}`, `raw-html`, `helper-selftest`, and `firefox-1440` when `E2E_FIREFOX=1`. |
| `npm run e2e:ui` | Playwright UI mode. |

Environment switches: `E2E_SKIP_BUILD=1` reuses `.next` (must be a mock-profile build), `E2E_PORT=n` pins the port, `E2E_BASE_URL=http://...` tests a server you started yourself (no build, no server).

Layout: `e2e/helpers/` (`expectNoHorizontalScroll`, `expectTouchTargets`, `expectNoAxeViolations`, `requestLog`, `expectSingleCspHeader`, `fetchRawHtml`, `withReducedMotion`, `expectToFail`), specs by suffix: `*.spec.ts` runs once per viewport project, `*.raw.spec.ts` runs once with JavaScript disabled, `*.selftest.spec.ts` runs once on inline fixtures. The self-tests prove each helper rejects a deliberately broken fixture. Not yet built: `mockScenario()`, `expectInputFontSize(16)`, `withTimezone`, `withClockSkew` (they need the mock layer, TASK-016/017). The overflow, touch-target and axe checks in `smoke.spec.ts` pass trivially on the placeholder pages; the exactly-one-CSP test is `test.fixme` until TASK-120.

## Versions (verified against the registry on 2026-10-22)

| Package | ARCH-001 5.1 | Installed | Note |
|---|---|---|---|
| next | 16.4.x | 16.4.2 | `~16.4.2` |
| react / react-dom | 19.3.x | 19.3.1 | `~19.3.1` |
| typescript | 5.9.x | 5.9.3 | Registry latest is 7.0.2; kept on 5.9 per DEC-002 (typescript-eslint peer `<6.1.0`). |
| tailwindcss, @tailwindcss/postcss | 4.3.x | 4.3.3 | |
| eslint | 9.x | 9.39.5 | 10.13.0 exists; `eslint-config-next` accepts it, TASK-008 decides. |
| eslint-config-next | n/a | 16.4.2 | |
| @next/bundle-analyzer | n/a | 16.4.2 | |
| zod | 4.x | 4.6.7 | |
| server-only | n/a | 0.0.1 | |
| @types/node | n/a | 24.19.2 | Matches Node 24 (registry latest 26.x is not used). |

Not installed yet (later tasks): TanStack Query, react-hook-form, `@hookform/resolvers` (registry 6.0.0 declares zod 4 support in its peer list; confirm in the task that adds it), Radix, Vitest 5 (5.0.5 available), Playwright 1.64.1, vitest-axe 0.1.0, dependency-cruiser 18.7.0, Prettier.

Deviations from the task text and ARCH-001 are listed under "Deviations and findings" below.

## Environment

`src/lib/env/env.public.ts` (browser-safe) and `src/lib/env/env.server.ts` (starts with `import 'server-only'`, so a client import is a build error) parse with zod and fail fast. Pure schema and guard logic is in `public-schema.ts`, `server-schema.ts`, `guard.ts` so it can be unit tested and reused by `next.config.ts`.

Build guard (`guard.ts`), run by `npm run build` (via `scripts/guard-env.ts`) and again at `next.config.ts` load so a bare `next build` is also covered:
- `NEXT_PUBLIC_USE_MOCKS=true` is refused for any Vercel target other than `preview` or `development` (production, staging, unknown). Preview is allowed only because the variable is set explicitly. Local builds (no `VERCEL_ENV`) are allowed.
- Any `NEXT_PUBLIC_*` name matching `/SECRET|TOKEN|KEY|PASSWORD/i` is refused.

## Deviations and findings (for the architect)

1. **`prebuild` does not run on npm 12 with `ignore-scripts=true`.** ARCH-001 6.3 specifies a `prebuild` hook and `.npmrc` `ignore-scripts=true`. With npm 12 (installed here), `ignore-scripts=true` also suppresses lifecycle scripts of the project itself (`pre*`/`post*`), so a `prebuild` guard silently never ran (verified: production plus mocks built successfully). Fix applied: `build` is `npm run guard:env && next build`, and `next.config.ts` calls `assertBuildEnv` too. Consequence for later tasks: `postbuild` (`check:build-output`, ARCH-001 18.3) will not run either; chain it explicitly in `build` or in the Vercel build command. Vercel runs `npm ci`/`npm run build` with the project `.npmrc`, so the same applies there.
2. **`@next/bundle-analyzer` is a no-op under Turbopack** (the Next 16 default). `ANALYZE=true npm run build` prints a warning and emits nothing. `npm run analyze` therefore builds with `--webpack` to emit the HTML report. The Turbopack-native tools are `npx next analyze` (interactive) and `npx next analyze --output`. Budget numbers always come from the Turbopack build, not from the webpack report.
3. **`NEXT_PUBLIC_CONTACT_MODE` values are not specified** anywhere in ARCH-001/FEAT-001. Scaffold assumes `form | off` (default `form`). Architect to confirm.
4. **Preview opt-in variable**: the task says "explicit opt-in variable"; ARCH-001 11.3 defines the opt-in as `NEXT_PUBLIC_USE_MOCKS=true` itself on a preview target. Implemented that way (no extra variable).
5. `turbopack.root` is pinned to `web/` because the parent repo has its own lockfile (otherwise Next infers the wrong root).
6. ARCH-001 6.1 places env modules in `lib/env/`; the task Files list shows `lib/env.server.ts`. Followed ARCH-001 6.1.
7. `npm audit` (all deps) reports 5 high findings, all one chain: `braces` -> `micromatch` -> `fast-glob` -> `@next/eslint-plugin-next` -> `eslint-config-next@16.4.2` (dev-only, lint tooling, the latest published version; `--force` would downgrade to 14.x). Production dependencies: 0 vulnerabilities. TASK-128 audit gate should scope to `--omit=dev` or carry a recorded exception.
8. `app/(public)/page.tsx` exports `revalidate = 900` and the root layout sets `robots: noindex`; `(public)` overrides to index. TASK-013 replaces the per-page `dynamic = 'force-dynamic'` on client-group placeholders with group layouts.

## Baseline (empty app, Next 16.4.2, Turbopack, default build)

First Load JS, gzip level 9: **134,780 bytes (134.8 KB)**, raw 455,990 bytes (456.0 KB); identical on all six routes (no app code yet). The ARCH-001 spike measured about 137 KB gzip / 456 KB raw: within 2 percent, so no ADR is required (threshold 15 percent). Recorded in `budgets.json` under `baseline`.

## Verification notes (TASK-007)

- draftMode isolation (OD-02): verified in a throwaway copy outside the repo. A `(public)` page that awaits `draftMode()` through a `server-only` module `lib/data/public/preview.ts` and `export const revalidate = 900` still builds as `○ /` (Static, revalidate 15m, expire 1y) with `/api/draft` as `ƒ`; the prerendered HTML contains the published state. Not verified: runtime behaviour with the `__prerender_bypass` cookie (needs a running server request, which was not possible in this session). The `(preview)` fallback is not needed at build level.
- Static public CSP (OD-03): in the same throwaway copy the `public` policy was attached through `next.config.ts` `headers()` and appears in `routes-manifest.json`. Hydration under that policy in a real browser was NOT verified (no browser harness in this task; Playwright arrives with TASK-009 and the CSP test with TASK-120). The prerendered page contains 10 script tags, of which 2 are inline, matching the spike finding that inline scripts exist, so `'unsafe-inline'` is required on `script-src`.


## Architecture lint and build-output checks (TASK-121)

- `npm run check:deps` = `depcruise src --config .dependency-cruiser.cjs && node scripts/check-module-directives.ts`. Each rule has a failing fixture in `scripts/arch-lint.test.ts` (run by `npm test`). Orphans are warnings only.
- `npm run check:build-output` (also the tail of `npm run build`) reads `.next`. **Profile:** `CHECK_BUILD_PROFILE=production|mock`; unset follows `NEXT_PUBLIC_USE_MOCKS` (the variable the build itself read). `production` asserts no mock sentinel/markers/mock-only routes in `.next/static` and `.next/server`; `mock` (Playwright, preview opt-in) skips that, refuses a production/staging hosting target, and once `src/lib/mock` exists requires the sentinel to be present (positive control). A value contradicting `NEXT_PUBLIC_USE_MOCKS` is an error.
- The mock sentinel `__PG_MOCK_SENTINEL_9d41c7e2__` must be exported from `src/lib/mock/sentinel.ts` by TASK-016/017 (constant `MOCK_SENTINEL` in `scripts/check-build-output.ts`).
- `/handoff` 404 gate: checked statically (source layout calls `notFound()` when mocks are off and is `force-dynamic`; compiled server output contains the gate; routes are never prerendered). That the gate answers HTTP 404 at runtime is for the e2e / post-deploy smoke, a static check cannot execute it.
- Known exceptions: none. `no-orphans` currently warns on 8 modules that later tasks consume.
