---

id: PLAN-001
type: plan
feature_id: FEAT-001
architecture_id: ARCH-001
version: 6
status: draft
tasks:

# ---- Phase 0: gates and housekeeping ----

- {id: TASK-001, title: "Write FEAT-001 requirements: frontend rewrite scope (58 screens/states mapped to routes; consumes FEAT-000 inventory)", description: "Est M. Gate for all build work. Completed 2026-10-21; defaults approved by owner.", owner: product-manager, status: complete, dependencies: [], risk: medium}
- {id: TASK-002, title: "Write ARCH-001: Next.js App Router web architecture incl. react-best-practices conventions (server/client boundaries, caching, code-splitting, bundle budget)", description: "Est L. Gate for all build work. Completed 2026-10-21 (draft); pending owner review of OD-01 and OD-06.", owner: architect, status: complete, dependencies: [TASK-001], risk: high}
- {id: TASK-003, title: "Add Next.js web-frontend rule, skill and agent guidance referencing react-best-practices; reconcile Expo-era rules (use Appendix A of ARCH-001 as rule text; add dependency-cruiser config for M1-M6)", description: "Est S. Housekeeping blocker (repo rules describe Expo). Unblocked by TASK-002 completion. Completed 2026-10-22.", owner: architect, status: complete, dependencies: [TASK-002], risk: medium, parallel_group: G0}
- {id: TASK-004, title: "Publish backend contract and gap matrix: what the new backend must satisfy (PgApi, slug, envelope, revalidation webhook)", description: "Est M. Source for the backend handoff; uses FEAT-000 inventory. Unblocked by TASK-001/002 completion. Completed 2026-10-22.", owner: architect, status: complete, dependencies: [TASK-001], risk: medium, parallel_group: G0}
- {id: TASK-005, title: "Asset inventory: next/font sources, licensed imagery, brand mark, image host for next/image", description: "Est S. Image host decided in v3 (Q16): Supabase Storage, configured in next/image remotePatterns. Completed 2026-10-21.", owner: product-manager, status: complete, dependencies: [], risk: medium, parallel_group: G0}
- {id: TASK-006, title: "Security design review of ARCH-001 (token handling, CSP, revalidation webhook, guards, CMS/JSON-LD XSS, server secrets); review sections 10, 12, 17, 9.2 specifically", description: "Est S. Unblocked by TASK-002 completion. Completed 2026-10-22; verdict APPROVED WITH CONDITIONS (scaffold conditions being absorbed into ARCH-001 v2). See SEC-001-arch-001-web-frontend.md.", owner: security-reviewer, status: complete, dependencies: [TASK-002], risk: medium, parallel_group: G0}
- {id: TASK-113, title: "Extract ISR/revalidation strategy into ARCH-001-isr-revalidation.md: cache tags, webhook contract, signing vectors (sections 9 and 7.1)", description: "Est S (reduced from M). Added in v2; mostly decided. Becomes extraction task.", owner: architect, status: complete, dependencies: [TASK-002, TASK-004], risk: high, parallel_group: G1}
- {id: TASK-115, title: "Hosting and runtime note for Next.js: Vercel (sin1) + Railway (Singapore) + Supabase (Singapore), env matrix and /api rewrite", description: "Est S. Q15 resolved by the owner in v3, so no longer blocked; this task documents the decided topology in docs/architecture/ARCH-001-hosting.md. Frontend: Next.js on Vercel (Pro plan needed for commercial use) with functions pinned to Singapore (sin1). Backend: Railway, Southeast Asia (Singapore) region, as an API service plus a worker plus scheduler/cron services (hold expiry, reminders, rating processing, emails). Database: Supabase Postgres in a new Singapore (ap-southeast-1) project (move from Seoul is TASK-117), reached through the Supabase connection pooler in transaction mode (backend disables server-side cursors if Django). Media uploads: Supabase Storage, host added to next/image remotePatterns (Q16 resolved). Environment matrix: production (Vercel production + Railway production + Supabase production on a paid plan with daily backups before real payments); staging (separate Railway environment + separate Supabase project + Vercel staging/preview domain); preview (Vercel preview deployments, mock mode only by explicit opt-in, no backend). Env vars split server-only vs public: API_INTERNAL_URL (Railway service URL, server-side fetches and the rewrite target), NEXT_PUBLIC_API_BASE_URL (relative /api, same origin), REVALIDATE_SECRET (shared HMAC secret set in both Vercel and Railway), NEXT_PUBLIC_SITE_URL, NEXT_PUBLIC_USE_MOCKS, Supabase storage host. Browser calls go through a Vercel rewrite from /api/* to Railway so there is one origin: no CORS, and the refresh token can later move to an httpOnly cookie. Razorpay webhooks go straight to Railway, not through Vercel. Django to Vercel publish revalidation uses the HMAC-signed /api/revalidate route (TASK-113, TASK-114). The note also records ISR persistence and image-optimiser behaviour on Vercel and how large uploads reach Supabase Storage. Add section 18.2 Vercel behaviours list. OQ-18 (extend or rebuild the backend) stays open and this topology works either way. Unblocked by TASK-002 completion.", owner: architect, status: complete, dependencies: [TASK-002], risk: medium, parallel_group: G0}
- {id: TASK-117, title: "Database region move runbook (Seoul -> Singapore) and Supabase lockdown checklist", description: "Est S. Added in v3 (owner decision). Runbook at docs/architecture/ARCH-001-db-region-move.md; the owner performs the move. Steps: create the new Singapore (ap-southeast-1) Supabase project, dump and restore from the current ap-northeast-2 (Seoul) project, update connection strings to the pooler (transaction mode) in Railway production and staging, reconcile row counts and money totals, define the cutover window and rollback. Lockdown checklist for the Supabase auto-generated REST API, because the backend owns all data access: RLS enabled with no policies on every backend table, or the API disabled; no anon or service keys in client code; Storage bucket policies for media uploads; paid plan with daily backups enabled before taking real payments; separate staging project. Ready (no dependencies).", owner: architect, status: complete, dependencies: [], risk: medium, parallel_group: G0}
- {id: TASK-124, title: "GATE: ARCH-001 v2 scaffold conditions absorbed (CSP default-deny, revalidation spec, mock guard hardening, lint/schema rules)", description: "Est S. Architect task to fold SEC-001 scaffold conditions (before TASK-007) into ARCH-001 v2 addendum or amended sections. Blocks TASK-007.", owner: architect, status: complete, dependencies: [TASK-006], risk: medium}
- {id: TASK-125, title: "Dual-mode token module (localStorage for mock, httpOnly cookie for launch)", description: "Est M. Frontend-engineer task to implement browser/tokens.ts supporting both modes behind NEXT_PUBLIC_USE_MOCKS switch and launch/api/auth endpoint (OD-01 ACCEPTED). Includes CSRF-header refresh and step-up re-authentication flow scaffolding. Acceptance criteria: both modes tested, partial acceptance pending per ARCH-001 v2 and runtime behavior testing in Playwright (TASK-009).", owner: frontend-engineer, status: complete, dependencies: [TASK-007, TASK-124], risk: high}
- {id: TASK-126, title: "Vercel Firewall rate limits and Deployment Protection ops checklist", description: "Est S. Architect task to document (not execute) Vercel Firewall rules for /api/csp-report and /api/revalidate rate limits, and Deployment Protection constraints for preview deployments. Deliverable: docs/architecture/OPS-001-vercel-firewall-and-protection.md (127 checklist items; owner performs in dashboards; verification V-04..V-11 only possible after TASK-007/111/114 are deployed to staging). Completed 2026-10-22.", owner: architect, status: complete, dependencies: [TASK-124], risk: medium}
- {id: TASK-127, title: "Privacy purge runbook and webhook types", description: "Est S. Architect task to add player and result change webhook types to the contract (F-15 follow-up) and document the emergency image/data purge runbook for privacy opt-outs and takedowns. Deliverable: added to ARCH-001-backend-contract.md section 9.4 (webhooks) and new ops doc.", owner: architect, status: pending, dependencies: [TASK-113], risk: medium}
- {id: TASK-128, title: "CI hardening spec: dependency gate, pinned actions, 2FA policy", description: "Est M. Architect task to specify (not implement) the CI hardening rules: high/critical audit gate that fails CI, pinned action versions (SHA), 2FA requirement, env scoping, supply-chain SLA (F-19), zero-dependency audit script, signed SBOM. Deliverable: docs/architecture/OPS-002-ci-hardening.md (81 controls; 3-4 open decisions OD-CI-01 to OD-CI-06). Creates no .github files or CONTRIBUTING.md, no implementation code. Completed 2026-10-22.", owner: architect, status: complete, dependencies: [TASK-124], risk: medium}
- {id: TASK-129, title: "Implement CI per OPS-002 (workflows, CODEOWNERS, dependabot, supply-chain scripts, policy-exceptions)", description: "Est L. New in v6. Frontend-engineer task (note: no devops-engineer enum; frontend-engineer carries CI/build tasks). Create .github/workflows/ci.yml, nightly.yml, post-deploy-smoke.yml, CODEOWNERS, .github/dependabot.yml, supply-chain script (web/scripts/ci/supply-chain.mjs), policy-exceptions registry (web/security/policy-exceptions.json), CONTRIBUTING.md SLA section, SECURITY.md, PR template. Depends on TASK-008 (lint/test setup), 009 (Playwright), 121 (check:build-output), 128 (OPS-002 spec). Both contract-stub server (OD-CI-01) and the CI implementation depend on each other; recommend folding stub into this task.", owner: frontend-engineer, status: pending, dependencies: [TASK-008, TASK-009, TASK-121, TASK-128], risk: medium}

# ---- Phase 1: foundation ----

- {id: TASK-007, title: "Scaffold web/ (Next.js App Router, React 19, TS strict, Tailwind v4, route groups, env modules, @next/bundle-analyzer); record empty-app gzip baseline, create budgets.json, verify package versions from 5.1, verify draftMode isolation (OD-02) and static-CSP hydration smoke test (OD-03), .nvmrc/.npmrc (ignore-scripts=true)/browserslist, set Vercel region sin1", description: "Est M. Completed 2026-10-22. Scaffold verified: Next 16.4.2, React 19.3.1, TS 5.9.3, Tailwind 4.3.3, ESLint 9.39.5, zod 4.6.7. Baseline First Load JS 134,780 B gzip recorded in budgets.json. Partial verification: draftMode isolation and static-CSP hydration in throwaway copy (acceptance criteria for TASK-009/120/119).", owner: frontend-engineer, status: complete, dependencies: [TASK-002, TASK-003, TASK-124], risk: medium}
- {id: TASK-008, title: "Configure ESLint (next, jsx-a11y, no barrel imports, server/client boundary rules), Prettier, Vitest, Testing Library, vitest-axe", description: "Est S.", owner: frontend-engineer, status: complete, dependencies: [TASK-007], risk: low, parallel_group: G1}
- {id: TASK-009, title: "Playwright harness: viewport projects, no-horizontal-scroll, touch-target, axe, request-log and no-JS raw-HTML helpers", description: "Est M.", owner: test-engineer, status: complete, dependencies: [TASK-007], risk: medium, parallel_group: G1}
- {id: TASK-010, title: "Tailwind v4 @theme tokens from design-tokens.json and styles.css, base layer, safe-area, motion and content-visibility utilities", description: "Est M. Schema-form task file.", owner: frontend-engineer, status: complete, dependencies: [TASK-007], risk: medium, parallel_group: G1}
- {id: TASK-011, title: "Self-host Newsreader, Anek Latin, Fragment Mono with next/font, fallback metrics and resource hints", description: "Est S.", owner: frontend-engineer, status: complete, dependencies: [TASK-010, TASK-005], risk: medium, parallel_group: G2}
- {id: TASK-012, title: "Server-safe formatters (IST date/time, INR), client hooks and versioned storage helper", description: "Est S.", owner: frontend-engineer, status: complete, dependencies: [TASK-007], risk: low, parallel_group: G1}
- {id: TASK-013, title: "App Router structure: (public)/(auth)/(app)/(admin)/(handoff) groups, layouts, loading/error/not-found, noindex for non-public groups, skip link; client groups export dynamic='force-dynamic'; test /api/* not intercepted", description: "Est M.", owner: frontend-engineer, status: complete, dependencies: [TASK-007], risk: medium, parallel_group: G1}
- {id: TASK-014, title: "API client core: envelope/errors, server fetch, browser client with single-flight refresh via anySignal (not AbortSignal.any), Web Locks session-lock.ts, idempotency.ts, legacy-bare normaliser, error-code copy map", description: "Est L (consider splitting 014a/014b). Schema-form task file. Add two-tab Web Locks test. Replace AbortSignal.any with in-repo anySignal combiner.", owner: frontend-engineer, status: complete, dependencies: [TASK-002, TASK-007], risk: high, parallel_group: G1}
- {id: TASK-015, title: "TanStack Query layer for client areas only: provider, queryOptions and key factory from section 11.9, useApiMutation with invalidates, QueryClient cleared on 401/403", description: "Est S.", owner: frontend-engineer, status: complete, dependencies: [TASK-014], risk: low, parallel_group: G2}
- {id: TASK-016, title: "Domain types, zod schemas and PgApi interface: public and player (slug required on events); add AvailabilityDto and preview link method; add capabilities flags on Event Room snapshot and admin resources (OQ-02)", description: "Est M.", owner: frontend-engineer, status: complete, dependencies: [TASK-002, TASK-004, TASK-007], risk: medium, parallel_group: G1}
- {id: TASK-017, title: "Domain types, zod schemas and PgApi interface: admin (slug rules for events and stories); add AvailabilityDto and capabilities flags", description: "Est M.", owner: frontend-engineer, status: complete, dependencies: [TASK-002, TASK-004, TASK-007], risk: medium, parallel_group: G1}
- {id: TASK-018, title: "Mock adapter core per section 11.4: mutable state only in browser store, add export-scan test for module-level mutable objects, NEXT_PUBLIC_USE_MOCKS switch (tree-shaken) and public fixtures", description: "Est M.", owner: frontend-engineer, status: complete, dependencies: [TASK-015, TASK-016], risk: medium, parallel_group: G2}
- {id: TASK-019, title: "Mock player fixtures and scenario switcher (registration states, event-room states, roles)", description: "Est M.", owner: frontend-engineer, status: complete, dependencies: [TASK-018], risk: medium, parallel_group: G3}
- {id: TASK-020, title: "Mock admin fixtures (CMS, media, events, builder, control room, payments, settings) with publish-triggered revalidation", description: "Est M.", owner: frontend-engineer, status: pending, dependencies: [TASK-017, TASK-018], risk: medium, parallel_group: G3}
- {id: TASK-021, title: "Mock auth, session and profile services behaving like the contract (token expiry/rotation, neutral reset)", description: "Est M. Repurposed from the former Django auth adapter.", owner: frontend-engineer, status: complete, dependencies: [TASK-014, TASK-016, TASK-018], risk: medium, parallel_group: G3}
- {id: TASK-022, title: "Export the PgApi contract (schemas, examples, error codes, webhook payload) for the new backend plan", description: "Est M. Repurposed from the former Django real-adapter task.", owner: frontend-engineer, status: pending, dependencies: [TASK-004, TASK-016, TASK-017, TASK-113], risk: medium, parallel_group: G3}
- {id: TASK-023, title: "Auth context for client areas: token store, session bootstrap, login/register/logout, cross-tab sign-out, split contexts", description: "Est M.", owner: frontend-engineer, status: complete, dependencies: [TASK-014, TASK-015, TASK-021], risk: high}
- {id: TASK-024, title: "Route guards and return-to intent (RequireAuth, RequireRole, safe redirect, session-expired restore)", description: "Est M.", owner: frontend-engineer, status: complete, dependencies: [TASK-013, TASK-023], risk: high}
- {id: TASK-111, title: "Public server data layer: server-only cached fetchers with tags, React.cache dedup and minimal DTOs", description: "Est M. Added in v2.", owner: frontend-engineer, status: complete, dependencies: [TASK-014, TASK-016, TASK-018], risk: medium, parallel_group: G3}
- {id: TASK-114, title: "Revalidation route handler (HMAC, replay window, tag/path mapping) and mock publish trigger", description: "Est M. Added in v2.", owner: frontend-engineer, status: complete, dependencies: [TASK-007, TASK-111, TASK-113], risk: high, parallel_group: G3B}
- {id: TASK-112, title: "SEO layer: metadata helpers, Open Graph, Event JSON-LD, sitemap, robots, OG image", description: "Est M. Added in v2.", owner: frontend-engineer, status: complete, dependencies: [TASK-007, TASK-111, TASK-113], risk: medium, parallel_group: G3B}

# ---- Phase 1.5: follow-ups from ARCH-001 ----

- {id: TASK-118, title: "Story detail page `/stories/[slug]` (prerendered, closed block model, JSON-LD Article optional, in sitemap)", description: "Est M. From ARCH-001 section 30 F-01 (OQ-01 approved). Add story-detail row to route table.", owner: frontend-engineer, status: complete, dependencies: [TASK-047, TASK-111, TASK-112], risk: medium, parallel_group: G8}
- {id: TASK-119, title: "Draft preview: `/api/draft`, `/api/draft/exit`, preview banner, `createPreviewLink` in PgAdminApi, mock preview route, fallback `(preview)` group decision", description: "Est M. From ARCH-001 section 30 F-02 (OQ-03 section 8.4). Plan Q17 now resolved. Add anonymous-after-draft cache isolation test (F-06 SEC-001): verify draftMode clears, no draft data served publicly after exit, __Host- cookie per-build not user-bound.", owner: frontend-engineer, status: pending, dependencies: [TASK-114, TASK-073, TASK-124], risk: medium}
- {id: TASK-120, title: "Edge policy: `proxy.ts` with route-class CSP, security headers, nonce for client groups, CSP report endpoint, Report-Only rollout, Playwright CSP/hydration test", description: "Est M. From ARCH-001 section 30 F-03 (CSP is real build item; section 10). Includes Playwright CSP test: verify default-deny baseline, mutually exclusive path patterns per route, one-header-per-route crawl (F-05 SEC-001), static-CSP on prerendered public pages, Report-Only on staging, production never Report-Only.", owner: frontend-engineer, status: complete, dependencies: [TASK-007, TASK-013, TASK-124], risk: high}
- {id: TASK-121, title: "Architecture lint: dependency-cruiser config for M3-M6 rules, `check:build-output` script (route modes, finite revalidate, mock sentinel, secret names, noindex); explicit build chain (guard:env, next build, check:build-output)", description: "Est M. From ARCH-001 section 30 F-04. Mechanical enforcement of ARCH-001 module rules. With `ignore-scripts=true`, guard:env and check:build-output must be explicit in build script (OPS-002 spec I-1). check:build-output includes positive control for mock sentinel.", owner: frontend-engineer, status: complete, dependencies: [TASK-008], risk: medium}
- {id: TASK-122, title: "Observability adapter and PII scrubber: `lib/observe` with error/vital/analytics hooks, web-vitals hook, `/api/csp-report` logging", description: "Est M. From ARCH-001 section 30 F-05 (section 19). No task existed.", owner: frontend-engineer, status: complete, dependencies: [TASK-007, TASK-014], risk: medium}
- {id: TASK-123, title: "Public availability island hook: `useAvailability(slug)` without Query (Query-free fetch, 30s visibility-aware refresh)", description: "Est S. From ARCH-001 section 30 F-06 (section 9.6). Can be folded into TASK-043 if preferred; kept separate here.", owner: frontend-engineer, status: complete, dependencies: [TASK-111], risk: low, parallel_group: G8}

# ---- Phase 2: design system and shells ----

- {id: TASK-025, title: "Layout and typography primitives (Server Components): Shell, Section, Eyebrow, Heading, Lede, PageIntro, Surface, InfoRow, ActionRow", description: "Est M.", owner: frontend-engineer, status: complete, dependencies: [TASK-010], risk: low, parallel_group: G4}
- {id: TASK-026, title: "Button, TextLink, per-module Icon set (no barrel), StatusBadge, Avatar", description: "Est M.", owner: frontend-engineer, status: complete, dependencies: [TASK-010, TASK-011, TASK-025], risk: low}
- {id: TASK-027, title: "Form primitives (client): Field, Input, Select, Textarea, Switch, ChoiceCard with react-hook-form and zod glue", description: "Est M.", owner: frontend-engineer, status: complete, dependencies: [TASK-025, TASK-026], risk: medium, parallel_group: G5}
- {id: TASK-028, title: "Feedback primitives: Skeleton, EmptyState, ErrorState, PermissionState, Toast and live region, ProgressBar, Banner", description: "Est M.", owner: frontend-engineer, status: complete, dependencies: [TASK-012, TASK-025, TASK-026], risk: low, parallel_group: G5}
- {id: TASK-029, title: "Dialog and Drawer/Sheet with focus trap, scroll lock and focus return", description: "Est M.", owner: frontend-engineer, status: complete, dependencies: [TASK-026], risk: medium, parallel_group: G5}
- {id: TASK-030, title: "Tabs (route-linked and local) and Stepper", description: "Est M.", owner: frontend-engineer, status: complete, dependencies: [TASK-026], risk: low, parallel_group: G5}
- {id: TASK-031, title: "ResponsiveTable: table at 720px and up, labelled stacked rows below, content-visibility rows", description: "Est M.", owner: frontend-engineer, status: complete, dependencies: [TASK-025, TASK-026], risk: medium, parallel_group: G5}
- {id: TASK-032, title: "ResponsiveImage and MediaFrame on next/image: sizes, aspect ratio, focal-point object-position, lazy/priority", description: "Est S.", owner: frontend-engineer, status: complete, dependencies: [TASK-010], risk: medium, parallel_group: G4}
- {id: TASK-033, title: "Accessible Carousel (server-rendered first slide, lazy client implementation, pause, reduced motion, swipe, keyboard)", description: "Est M.", owner: frontend-engineer, status: complete, dependencies: [TASK-012, TASK-026, TASK-032], risk: medium, parallel_group: G6}
- {id: TASK-034, title: "Domain components: EventCard, EventFacts, BoardCard, RatingPoolCard, ResultRow, Timeline, MetricTile", description: "Est M.", owner: frontend-engineer, status: complete, dependencies: [TASK-026, TASK-028, TASK-032], risk: medium, parallel_group: G6}
- {id: TASK-035, title: "Reveal-on-scroll utility (shared observer, no hydration flicker, reduced-motion safe)", description: "Est S.", owner: frontend-engineer, status: complete, dependencies: [TASK-010, TASK-012], risk: low, parallel_group: G4}
- {id: TASK-036, title: "PublicNav and Footer (Server Components) with mobile menu island and auth-aware link", description: "Est M.", owner: frontend-engineer, status: complete, dependencies: [TASK-013, TASK-023, TASK-026, TASK-029], risk: medium, parallel_group: G7}
- {id: TASK-037, title: "PlayerShell: sidebar to mobile top bar and menu drawer", description: "Est M.", owner: frontend-engineer, status: complete, dependencies: [TASK-013, TASK-023, TASK-026, TASK-029], risk: medium, parallel_group: G7}
- {id: TASK-038, title: "AdminShell: sidebar to drawer, role guard integration", description: "Est M.", owner: frontend-engineer, status: pending, dependencies: [TASK-013, TASK-023, TASK-026, TASK-029], risk: medium, parallel_group: G7}
- {id: TASK-039, title: "Handoff routes: index, design-system and UI-states pages (mock/dev only)", description: "Est M. Screens 57, 58.", owner: frontend-engineer, status: pending, dependencies: [TASK-013, TASK-019, TASK-023, TASK-028, TASK-034], risk: low, parallel_group: G7}

# ---- Phase 3: public site (prerendered) ----

- {id: TASK-040, title: "Home (prerendered): hero and upcoming games with parallel server fetching (screen 01, top half)", description: "Est L.", owner: frontend-engineer, status: complete, dependencies: [TASK-018, TASK-032, TASK-034, TASK-035, TASK-036, TASK-111, TASK-112], risk: medium, parallel_group: G8}
- {id: TASK-041, title: "Home: first-visit, community, story, testimonials and final CTA sections (screen 01, lower half)", description: "Est M.", owner: frontend-engineer, status: complete, dependencies: [TASK-033, TASK-040], risk: low}
- {id: TASK-042, title: "Play (prerendered): event list with client filter and deferred search islands (screen 02)", description: "Est M.", owner: frontend-engineer, status: complete, dependencies: [TASK-018, TASK-028, TASK-034, TASK-036, TASK-111, TASK-112], risk: low, parallel_group: G8}
- {id: TASK-043, title: "Event detail (ISR): open, full, closed and sold-out modes, live availability island, JSON-LD, mobile sticky CTA (screen 03)", description: "Est L.", owner: frontend-engineer, status: complete, dependencies: [TASK-018, TASK-032, TASK-033, TASK-034, TASK-036, TASK-111, TASK-112, TASK-113], risk: medium, parallel_group: G8}
- {id: TASK-044, title: "Event detail: completed/archive mode with standings and gallery (screen 04)", description: "Est M.", owner: frontend-engineer, status: complete, dependencies: [TASK-031, TASK-043], risk: low}
- {id: TASK-045, title: "Past events archive (prerendered) with search (screen 05)", description: "Est S.", owner: frontend-engineer, status: complete, dependencies: [TASK-034, TASK-036, TASK-111, TASK-112], risk: low, parallel_group: G8}
- {id: TASK-046, title: "Community page (screen 06)", description: "Est S.", owner: frontend-engineer, status: complete, dependencies: [TASK-032, TASK-033, TASK-036, TASK-111, TASK-112], risk: low, parallel_group: G8}
- {id: TASK-047, title: "Stories (prerendered): featured story and chronological grid, stories carry slugs (screen 07)", description: "Est M.", owner: frontend-engineer, status: complete, dependencies: [TASK-032, TASK-036, TASK-111, TASK-112], risk: low, parallel_group: G8}
- {id: TASK-048, title: "Contact (static page + form island) with validation, success and service-error states (screen 08)", description: "Est M.", owner: frontend-engineer, status: complete, dependencies: [TASK-027, TASK-028, TASK-036, TASK-112], risk: low, parallel_group: G8}
- {id: TASK-049, title: "Legal template for privacy, terms, refund policy, plus not-found and error pages (screens 09-12)", description: "Est S.", owner: frontend-engineer, status: complete, dependencies: [TASK-013, TASK-036, TASK-111, TASK-112], risk: low, parallel_group: G8}
- {id: TASK-116, title: "Prerender and SEO verification: raw-HTML assertions, JSON-LD, sitemap/robots, Lighthouse SEO, publish-to-visible revalidation test", description: "Est M. Added in v2.", owner: test-engineer, status: pending, dependencies: [TASK-009, TASK-040, TASK-042, TASK-043, TASK-044, TASK-045, TASK-046, TASK-047, TASK-049, TASK-112, TASK-114], risk: medium, parallel_group: G17}

# ---- Phase 4: auth and conversion ----

- {id: TASK-050, title: "AuthLayout and Login with return-to intent and flagged Google button (screen 13)", description: "Est M.", owner: frontend-engineer, status: complete, dependencies: [TASK-018, TASK-024, TASK-026, TASK-027, TASK-028], risk: medium}
- {id: TASK-051, title: "Create account with server field-error mapping (screen 14)", description: "Est M.", owner: frontend-engineer, status: complete, dependencies: [TASK-050], risk: medium, parallel_group: G9}
- {id: TASK-052, title: "OAuth callback: processing, success redirect, failure recovery, feature-flagged (screen 15)", description: "Est S.", owner: frontend-engineer, status: pending, dependencies: [TASK-024, TASK-050], risk: low, parallel_group: G9}
- {id: TASK-053, title: "Reset password: request (neutral response) and token-confirm modes (screen 16)", description: "Est M.", owner: frontend-engineer, status: complete, dependencies: [TASK-021, TASK-050], risk: low, parallel_group: G9}
- {id: TASK-054, title: "Welcome / first-login preferences, skip-safe (screen 17)", description: "Est M.", owner: frontend-engineer, status: complete, dependencies: [TASK-018, TASK-021, TASK-024, TASK-027], risk: low, parallel_group: G9}
- {id: TASK-055, title: "Registration frame: layout, parallel load, state resolver and ineligible states (screens 18-21 shell)", description: "Est L.", owner: frontend-engineer, status: pending, dependencies: [TASK-018, TASK-019, TASK-024, TASK-027, TASK-028, TASK-043], risk: high}
- {id: TASK-056, title: "Registration: free confirmation and success (screens 19, 21)", description: "Est M.", owner: frontend-engineer, status: pending, dependencies: [TASK-055], risk: medium, parallel_group: G10}
- {id: TASK-057, title: "Registration: paid flow with hold countdown and lazily loaded Razorpay checkout hook (screen 18)", description: "Est L. Schema-form task file. Load Razorpay checkout.js only when needed (lazy bundle-defer-third-party per ARCH-001 14.4); verify SRI not possible and script runs in token-bearing origin (F-13 SEC-001: accepted with record; cookie move removes impact).", owner: frontend-engineer, status: pending, dependencies: [TASK-015, TASK-022, TASK-055, TASK-125], risk: high, parallel_group: G10}
- {id: TASK-058, title: "Registration: waitlist join (screen 20)", description: "Est S.", owner: frontend-engineer, status: pending, dependencies: [TASK-055], risk: low, parallel_group: G10}
- {id: TASK-059, title: "Registration and payment scenario tests (every UI-STATES registration state)", description: "Est M.", owner: test-engineer, status: pending, dependencies: [TASK-009, TASK-056, TASK-057, TASK-058], risk: medium}

# ---- Phase 5: player area ----

- {id: TASK-060, title: "Player dashboard with next-action hero and parallel sections (screen 22)", description: "Est M.", owner: frontend-engineer, status: complete, dependencies: [TASK-019, TASK-024, TASK-034, TASK-037], risk: medium, parallel_group: G11}
- {id: TASK-061, title: "My Events: upcoming, waitlist, pending payment, history (screen 23)", description: "Est M.", owner: frontend-engineer, status: complete, dependencies: [TASK-019, TASK-024, TASK-034, TASK-037], risk: medium, parallel_group: G11}
- {id: TASK-062, title: "Event Room data layer: state derivation, deduplicated polling (30s idle max per section 11.9, not 60s for AC-45), manual refresh, announcements", description: "Est L. Schema-form task file.", owner: frontend-engineer, status: complete, dependencies: [TASK-015, TASK-019, TASK-028, TASK-037], risk: high, parallel_group: G11}
- {id: TASK-063, title: "Event Room: before check-in and check-in open (screens 24, 25)", description: "Est M.", owner: frontend-engineer, status: complete, dependencies: [TASK-034, TASK-062], risk: medium, parallel_group: G12}
- {id: TASK-064, title: "Event Room: pairing pending and live round with result submission (screens 26, 27)", description: "Est L. Schema-form task file.", owner: frontend-engineer, status: complete, dependencies: [TASK-029, TASK-034, TASK-062], risk: high, parallel_group: G12}
- {id: TASK-065, title: "Event Room: between rounds and event complete (screens 28, 29)", description: "Est M.", owner: frontend-engineer, status: complete, dependencies: [TASK-034, TASK-062], risk: medium, parallel_group: G12}
- {id: TASK-066, title: "Rating: pool selector, pool cards, RD explanation and content-visibility game ledger (screen 30)", description: "Est M.", owner: frontend-engineer, status: complete, dependencies: [TASK-019, TASK-028, TASK-034, TASK-037], risk: medium, parallel_group: G11}
- {id: TASK-067, title: "Rating: lazy accessible trend chart with table alternative (screen 30)", description: "Est M.", owner: frontend-engineer, status: pending, dependencies: [TASK-066], risk: medium}
- {id: TASK-068, title: "Profile: private account vs public chess identity, dirty-state guard (screen 31)", description: "Est M.", owner: frontend-engineer, status: complete, dependencies: [TASK-021, TASK-027, TASK-029, TASK-037], risk: medium, parallel_group: G11}

# ---- Phase 6: admin ----

- {id: TASK-069, title: "Admin patterns: SplitWorkspace (master-detail), FilterBar, SaveBar (dirty/publish), ConfirmAction", description: "Est M.", owner: frontend-engineer, status: pending, dependencies: [TASK-027, TASK-029, TASK-030, TASK-031, TASK-038], risk: medium}
- {id: TASK-070, title: "Admin dashboard: today/next event and attention list (screen 32)", description: "Est M.", owner: frontend-engineer, status: pending, dependencies: [TASK-020, TASK-034, TASK-038], risk: low, parallel_group: G13}
- {id: TASK-071, title: "Media library: grid, search, upload with validation and progress (screen 34, left)", description: "Est M.", owner: frontend-engineer, status: pending, dependencies: [TASK-020, TASK-032, TASK-069], risk: medium}
- {id: TASK-072, title: "Media collection editor: static/carousel, order, autoplay, alt text, lazy focal point picker (screen 34, right)", description: "Est L.", owner: frontend-engineer, status: pending, dependencies: [TASK-033, TASK-071], risk: high}
- {id: TASK-073, title: "Website CMS: structured section editor with per-section lazy chunks, draft/publish states and revalidation trigger (screen 33)", description: "Est L.", owner: frontend-engineer, status: pending, dependencies: [TASK-020, TASK-069, TASK-072, TASK-114], risk: high, parallel_group: G14}
- {id: TASK-074, title: "Stories admin: list and editor with slug rules and publish (screen 35)", description: "Est M.", owner: frontend-engineer, status: pending, dependencies: [TASK-020, TASK-031, TASK-069, TASK-072], risk: medium, parallel_group: G14}
- {id: TASK-075, title: "Testimonials admin with publish gating (screen 36)", description: "Est M.", owner: frontend-engineer, status: pending, dependencies: [TASK-020, TASK-069, TASK-071], risk: medium, parallel_group: G14}
- {id: TASK-076, title: "Admin events list with state filters (screen 37)", description: "Est M.", owner: frontend-engineer, status: pending, dependencies: [TASK-020, TASK-030, TASK-031, TASK-038], risk: low, parallel_group: G13}
- {id: TASK-077, title: "Event Builder framework per DEC-023: 8-step flow with small vanilla store plus uncontrolled per-step RHF forms with 300ms debounce commit, per-step validation, deferred preview, mobile one-step mode", description: "Est L. Schema-form task file. Adopt vanilla store pattern per DEC-023.", owner: frontend-engineer, status: pending, dependencies: [TASK-020, TASK-027, TASK-029, TASK-030, TASK-034, TASK-069], risk: high}
- {id: TASK-078, title: "Event Builder steps 1-2: Basics (with slug) and Experience (screens 38, 39)", description: "Est M.", owner: frontend-engineer, status: pending, dependencies: [TASK-077], risk: low, parallel_group: G15}
- {id: TASK-079, title: "Event Builder steps 3-4: Registration and Payment (screens 40, 41)", description: "Est M.", owner: frontend-engineer, status: pending, dependencies: [TASK-077], risk: medium, parallel_group: G15}
- {id: TASK-080, title: "Event Builder steps 5-6: Game system and Media (screens 42, 43)", description: "Est M.", owner: frontend-engineer, status: pending, dependencies: [TASK-072, TASK-077], risk: medium, parallel_group: G15}
- {id: TASK-081, title: "Event Builder steps 7-8: Communications and Review/publish with SEO preview (screens 44, 45)", description: "Est M.", owner: frontend-engineer, status: pending, dependencies: [TASK-077, TASK-112], risk: medium, parallel_group: G15}
- {id: TASK-082, title: "Event Control Room frame: header, summary strip, route-linked tabs (screens 46-53 shell)", description: "Est M.", owner: frontend-engineer, status: pending, dependencies: [TASK-020, TASK-030, TASK-034, TASK-038, TASK-076], risk: medium}
- {id: TASK-083, title: "Event Control: Overview and Registrations tabs (screens 46, 47)", description: "Est M.", owner: frontend-engineer, status: pending, dependencies: [TASK-031, TASK-082], risk: low, parallel_group: G16}
- {id: TASK-084, title: "Event Control: Check-in desk tab, phone-first (screen 48)", description: "Est M.", owner: frontend-engineer, status: pending, dependencies: [TASK-027, TASK-082], risk: medium, parallel_group: G16}
- {id: TASK-085, title: "Event Control: Pairings and rounds tab with draft/publish/finalise (screen 49)", description: "Est L. Schema-form task file.", owner: frontend-engineer, status: pending, dependencies: [TASK-029, TASK-031, TASK-082], risk: high, parallel_group: G16}
- {id: TASK-086, title: "Event Control: Payments tab (screen 50)", description: "Est S.", owner: frontend-engineer, status: pending, dependencies: [TASK-031, TASK-082], risk: low, parallel_group: G16}
- {id: TASK-087, title: "Event Control: Messages tab with audience, composer, delivery state (screen 51)", description: "Est M.", owner: frontend-engineer, status: pending, dependencies: [TASK-027, TASK-082], risk: medium, parallel_group: G16}
- {id: TASK-088, title: "Event Control: Gallery and recap, and Audit tabs (screens 52, 53)", description: "Est M.", owner: frontend-engineer, status: pending, dependencies: [TASK-031, TASK-071, TASK-082], risk: low, parallel_group: G16}
- {id: TASK-089, title: "Players admin: search, list and record detail (screen 54)", description: "Est M.", owner: frontend-engineer, status: pending, dependencies: [TASK-020, TASK-031, TASK-069], risk: medium, parallel_group: G14}
- {id: TASK-090, title: "Payments admin: ledger, mismatch and reconcile (screen 55)", description: "Est M.", owner: frontend-engineer, status: pending, dependencies: [TASK-020, TASK-031, TASK-038], risk: medium, parallel_group: G13}
- {id: TASK-091, title: "Settings admin: grouped sections, integration status, no secrets (screen 56)", description: "Est M.", owner: frontend-engineer, status: pending, dependencies: [TASK-020, TASK-027, TASK-069], risk: medium, parallel_group: G14}

# ---- Phase 7: cross-cutting QA ----

- {id: TASK-092, title: "Contract conformance tests: PgApi contract against the mock, reusable against a future backend base URL; negative tests for legacy backend defects L-1..L-16", description: "Est M (increased from v4 to M+). Include negative conformance tests for each legacy defect (SEC-001 annex A): unauthenticated registrations list, public profile PII, no throttling, insecure SECRET_KEY, no payment webhook, CSV formula injection, etc. Frontend tests run against mock (which must not have these defects); tests are reusable against the new backend base URL.", owner: test-engineer, status: pending, dependencies: [TASK-014, TASK-021, TASK-022], risk: medium, parallel_group: G17}
- {id: TASK-093, title: "E2E journeys: public, auth and registration (mock mode, 390 and 1440) with request-waterfall capture", description: "Est L.", owner: test-engineer, status: pending, dependencies: [TASK-009, TASK-040, TASK-042, TASK-043, TASK-050, TASK-051, TASK-059], risk: medium, parallel_group: G17}
- {id: TASK-094, title: "E2E journeys: player dashboard, event room, rating, profile (390 primary)", description: "Est M.", owner: test-engineer, status: pending, dependencies: [TASK-009, TASK-060, TASK-061, TASK-063, TASK-064, TASK-065, TASK-067, TASK-068], risk: medium, parallel_group: G17}
- {id: TASK-095, title: "E2E journeys: admin CMS, testimonials, event builder, control room, publish-to-public visibility", description: "Est L.", owner: test-engineer, status: pending, dependencies: [TASK-009, TASK-070, TASK-073, TASK-074, TASK-075, TASK-080, TASK-081, TASK-085, TASK-088, TASK-089, TASK-090, TASK-091, TASK-114], risk: medium, parallel_group: G17}
- {id: TASK-096, title: "Responsive matrix: every route at 1440/1280/1024/768/390/320, no horizontal scroll, touch targets", description: "Est M.", owner: test-engineer, status: pending, dependencies: [TASK-093, TASK-094, TASK-095], risk: medium, parallel_group: G18}
- {id: TASK-097, title: "Accessibility audit: axe on all routes plus manual keyboard, screen reader, 200% zoom", description: "Est M.", owner: test-engineer, status: pending, dependencies: [TASK-093, TASK-094, TASK-095], risk: medium, parallel_group: G18}
- {id: TASK-098, title: "Visual QA against reference screens and VISUAL-QA checklist", description: "Est M.", owner: test-engineer, status: pending, dependencies: [TASK-039, TASK-093, TASK-094, TASK-095], risk: medium, parallel_group: G18}
- {id: TASK-110, title: "React best-practices audit (Next.js edition: waterfalls, bundle, server, client fetching, re-render, rendering/hydration, js) with bundle analyzer evidence; use section 14.7 mapping as checklist", description: "Est M. Feeds TASK-099 and TASK-100. Use RBP mapping in 14.7 as audit checklist.", owner: code-reviewer, status: pending, dependencies: [TASK-093, TASK-094, TASK-095, TASK-116], risk: medium, parallel_group: G18}
- {id: TASK-099, title: "Performance budget (First Load JS per route per section 14.3), size check and Lighthouse mobile using TASK-110 evidence", description: "Est M. Use budget table in 14.3 as initial numbers.", owner: frontend-engineer, status: pending, dependencies: [TASK-011, TASK-093, TASK-094, TASK-095, TASK-110], risk: medium, parallel_group: G18B}
- {id: TASK-100, title: "Triage and fix QA findings (responsive, a11y, visual, SEO, performance, react-best-practices)", description: "Est L. Re-split once findings are known.", owner: frontend-engineer, status: pending, dependencies: [TASK-096, TASK-097, TASK-098, TASK-099, TASK-110, TASK-116], risk: medium}
- {id: TASK-101, title: "Security review of the web app (tokens, XSS/JSON-LD, guards, revalidation endpoint, CSP, server secrets, dependencies); launch-gate security sign-off", description: "Est M (+ sign-off gate). Re-check implementation against SEC-001 findings F-01..F-24 and design claims (verify controls in code). Verify high findings F-01, F-02, F-03 closed or waived; backend webhook (source of truth), negative conformance tests, privacy/draft hardening, CSP Report-Only clean run on staging. Approval gate before TASK-106 (user approval).", owner: security-reviewer, status: pending, dependencies: [TASK-006, TASK-092, TASK-100, TASK-125, TASK-126, TASK-127, TASK-128], risk: high, parallel_group: G19}
- {id: TASK-102, title: "Code review of web/ against ARCH-001 and the web-frontend rule", description: "Est M.", owner: code-reviewer, status: pending, dependencies: [TASK-092, TASK-100], risk: medium, parallel_group: G19}
- {id: TASK-103, title: "OPTIONAL: installable PWA basics (manifest, icons, offline fallback page)", description: "Est S. Optional, late, not on critical path.", owner: frontend-engineer, status: pending, dependencies: [TASK-099, TASK-100], risk: low, parallel_group: G19}
- {id: TASK-104, title: "Workflow readiness gate: artifact statuses, traceability and exit criteria", description: "Est S. Executed by the workflow-controller agent; owner is architect because the schema owner enum has no workflow-controller value.", owner: architect, status: pending, dependencies: [TASK-101, TASK-102], risk: low}

# ---- Phase 8: cutover (deferred; blocked on the new backend plan) ----

- {id: TASK-105, title: "Deployment config for the chosen Next.js host: env split, staging environment, ISR persistence verification, revalidation reachability; Vercel Firewall/Deployment Protection", description: "Est M. Blocked: new backend plan (out of scope) only. CSP work now moves to TASK-120; keep only deployment config and verification here. Config includes Vercel project settings (sin1), /api/* rewrite to Railway (no CORS), staging environment, Vercel Firewall rules (from TASK-126), Deployment Protection constraints, real-browser CSP verification on staging (OD-03).", owner: frontend-engineer, status: blocked, dependencies: [TASK-100, TASK-101, TASK-120, TASK-115, TASK-126], risk: medium}
- {id: TASK-106, title: "GATE: explicit user approval for cutover and agreed release scope", description: "Est S. Blocked: new backend plan (out of scope). Requires explicit user approval; no agent may self-approve. Gate depends on TASK-101 security sign-off and TASK-105 deployment config.", owner: product-manager, status: blocked, dependencies: [TASK-104, TASK-105, TASK-101], risk: high}
- {id: TASK-107, title: "Remove legacy root files and confirm final cutover (src/ already removed 2026-10-22)", description: "Est M. Blocked: TASK-106 and new backend plan. Note: legacy src/ directory was already removed by owner 2026-10-22 and is no longer in working tree (committed history preserved in git HEAD if needed). Remaining work: remove root package.json, package-lock.json, vite.config.js, index.html, tailwind/postcss/eslint configs, vercel.json (legacy), dist/, public/, and legacy backend decisions from repo. Destructive; requires explicit owner approval gate (TASK-106).", owner: frontend-engineer, status: blocked, dependencies: [TASK-106], risk: high}
- {id: TASK-108, title: "README, runbook, rollback notes and docs update", description: "Est S. Blocked behind TASK-107.", owner: architect, status: blocked, dependencies: [TASK-107], risk: low, parallel_group: G20}
- {id: TASK-109, title: "Post-deploy smoke test on production URL (incl. view-source content and revalidation)", description: "Est S. Blocked behind TASK-107.", owner: test-engineer, status: blocked, dependencies: [TASK-107], risk: medium, parallel_group: G20}
critical_path: [TASK-001, TASK-002, TASK-006, TASK-124, TASK-007, TASK-013, TASK-120, TASK-010, TASK-011, TASK-026, TASK-029, TASK-038, TASK-069, TASK-071, TASK-072, TASK-080, TASK-095, TASK-110, TASK-099, TASK-100, TASK-101, TASK-104, TASK-106, TASK-107]
parallel_groups:
- {id: G0, tasks: [TASK-003, TASK-004, TASK-005, TASK-006, TASK-115, TASK-117]}
- {id: G0.5, tasks: [TASK-124, TASK-125, TASK-126, TASK-127, TASK-128]}
- {id: G0.75, tasks: [TASK-120, TASK-121, TASK-122]}
- {id: G1, tasks: [TASK-008, TASK-009, TASK-010, TASK-012, TASK-013, TASK-014, TASK-016, TASK-017, TASK-113]}
- {id: G2, tasks: [TASK-011, TASK-015, TASK-018]}
- {id: G3, tasks: [TASK-019, TASK-020, TASK-021, TASK-022, TASK-111]}
- {id: G3B, tasks: [TASK-112, TASK-114]}
- {id: G4, tasks: [TASK-025, TASK-032, TASK-035]}
- {id: G5, tasks: [TASK-027, TASK-028, TASK-029, TASK-030, TASK-031]}
- {id: G6, tasks: [TASK-033, TASK-034]}
- {id: G7, tasks: [TASK-036, TASK-037, TASK-038, TASK-039]}
- {id: G8, tasks: [TASK-040, TASK-042, TASK-043, TASK-045, TASK-046, TASK-047, TASK-048, TASK-049, TASK-118, TASK-123]}
- {id: G8.5, tasks: [TASK-119]}
- {id: G9, tasks: [TASK-051, TASK-052, TASK-053, TASK-054]}
- {id: G10, tasks: [TASK-056, TASK-057, TASK-058]}
- {id: G11, tasks: [TASK-060, TASK-061, TASK-062, TASK-066, TASK-068]}
- {id: G12, tasks: [TASK-063, TASK-064, TASK-065]}
- {id: G13, tasks: [TASK-070, TASK-076, TASK-090]}
- {id: G14, tasks: [TASK-073, TASK-074, TASK-075, TASK-089, TASK-091]}
- {id: G15, tasks: [TASK-078, TASK-079, TASK-080, TASK-081]}
- {id: G16, tasks: [TASK-083, TASK-084, TASK-085, TASK-086, TASK-087, TASK-088]}
- {id: G17, tasks: [TASK-092, TASK-093, TASK-094, TASK-095, TASK-116]}
- {id: G18, tasks: [TASK-096, TASK-097, TASK-098, TASK-110]}
- {id: G18B, tasks: [TASK-099]}
- {id: G19, tasks: [TASK-101, TASK-102, TASK-103]}
- {id: G20, tasks: [TASK-108, TASK-109]}
rollout:
  order: [TASK-105, TASK-106, TASK-107, TASK-108, TASK-109]
  feature_flag: true
  migration: false
  rollback: "Cutover is deferred and blocked on a new backend plan that is out of scope for PLAN-001; until then web/ is built and previewed against mocks beside the unchanged legacy app and nothing is switched. Legacy src/ was removed by owner 2026-10-22; TASK-107 removes remaining root files (package.json, configs, etc.) only after explicit user approval (TASK-106). Rollback: redeploy the previous build artifact or the tagged commit and purge the ISR cache per the runbook."

---

# Plan: Pawn's Gambit (PG Chess) Frontend Rewrite

**ID:** PLAN-001
**Type:** plan
**Feature:** FEAT-001
**Architecture:** ARCH-001
**Version:** 6
**Status:** draft
**Date:** 2026-10-22

> **Status stays** `draft` **on purpose.** FEAT-001 (approved 2026-10-21) and ARCH-001 v2 (merged 2026-10-22) are complete. TASK-001 to 006, 124, 126, 128 complete (8 tasks). TASK-007 ready (scaffold). TASK-113, 115, 117, 125, 127 in Phase 1 ready set (ready = 6 tasks). Ready tasks unblock Phase 1 foundation (TASK-008, 009, 010 et al.). OD-01 and OD-06 marked resolved; OD-CI-01 to OD-CI-06 (contract stub location, minimum release age, patch SLA, reviewer model, pinning policy, separate Vercel project) added with decision pointers in TASK-129.

## Changes in version 6

| Area | Change |
|------|--------|
| Completed tasks | TASK-007 scaffold complete 2026-10-22: Next 16.4.2, React 19.3.1, TS 5.9.3, Tailwind 4.3.3, ESLint 9.39.5, zod 4.6.7; baseline First Load JS 134,780 B gzip in web/budgets.json; env guard + tests via node --test. Partly verified: draftMode isolation (OD-02) and static-CSP hydration in throwaway copy (OD-03) -> carry as acceptance criteria into TASK-009/120/119. TASK-126 complete: deliverable OPS-001 (127 items; verification V-04..V-11 deferred to staging). TASK-128 complete as SPEC: deliverable OPS-002 (81 controls, 3-4 open decisions). |
| New CI implementation task | TASK-129 (L, frontend-engineer) added: implement .github/ workflows, CODEOWNERS, dependabot, supply-chain scripts, exceptions registry per OPS-002. Depends on TASK-008, 009, 121, 128. Note: enum has no devops-engineer owner; frontend-engineer carries build/CI. Open decision OD-CI-01: contract-stub server location (fold into TASK-129 or TASK-092 per owner choice). |
| Spec fixes | (a) With `ignore-scripts=true`, npm skips prebuild/postbuild, so guard:env and check:build-output must be explicit in build script (affects TASK-121). (b) @next/bundle-analyzer is a no-op under Turbopack; npm run analyze builds with --webpack for the report; budgets always from Turbopack (affects TASK-099/110). (c) npm audit scope: gate production deps; dev-only high warns with SLA per OPS-002 (affects TASK-128/129/008). (d) NEXT_PUBLIC_CONTACT_MODE assumed `form | off` (affects contact task). (e) /handoff notFound() and force-dynamic per page; TASK-013 should move to group layouts. |
| Ready set recomputed | TASK-007 complete. Ready (all dependencies complete, verified by listing): 008, 009, 010, 012, 013, 014, 016, 017, 113, 115, 117, 125. TASK-008 (tooling) and TASK-010 (tokens) were started 2026-10-22 and are in flight. TASK-011, 111, 120 and 121 stay pending until their dependencies complete. |
| Rollout checklist | Add OD-CI-01..06 summary pointer to OPS-002; note the 17-20 'verify against current vendor docs' items in OPS-001/OPS-002 as a pre-launch verification task; legacy src/ already removed by owner 2026-10-22 (committed in git HEAD). |
| Status summary | Complete: 10 (001 to 007, 124, 126, 128); ready: 12; pending: 102; blocked: 5. Total 129. |
| Task count | 128 → 129 (+1 TASK-129 CI implementation). Architect count 12 → 12 (TASK-128 marked complete, no change to enum). Frontend-engineer count 98 → 99 (+1 for TASK-129). |

## Changes in version 5

| Area | Change |
|------|--------|
| Completed tasks | TASK-003, 004, 006 marked `complete` (2026-10-22); TASK-001, 002, 005 already complete in v4. |
| New gate task | TASK-124 (ARCH-001 v2: absorb SEC-001 conditions) added as an architect task (complete 2026-10-22, ARCH-001 v2 merged) blocking TASK-007 and Phase 0.5. |
| SEC-001 follow-ups | Four new tasks added for security review findings: TASK-125 (dual-mode token module, OD-01), TASK-126 (Firewall/Deployment Protection ops), TASK-127 (privacy webhook/runbook), TASK-128 (CI hardening). All in Phase 0.5 pending dependencies. |
| Owner decisions | OD-01 ACCEPTED (localStorage for mock-backed build; httpOnly cookie REQUIRED for launch; frontend supports both via browser/tokens.ts). OD-06 ACCEPTED (per-instance replay dedupe with event id inside HMAC). Both marked resolved. |
| Task updates | TASK-007 now depends on TASK-124 (ready status maintained pending gate). TASK-120 updated with CSP pattern/baseline test notes (F-05). TASK-119 updated with draft isolation test. TASK-057 updated with Razorpay isolation and OD-01 link. TASK-092 expanded with L-1..L-16 negative conformance tests. TASK-101 added SEC-001 re-check and launch-gate sign-off. TASK-105 updated with Firewall/Deployment Protection. |
| Critical path | Updated to include TASK-006, TASK-124 early on (before TASK-007). |
| Parallel groups | Added G0.5 for TASK-124, 125, 126, 127, 128; renumbered CSP/lint/obs tasks to G0.75. |
| Task count | 123 → 128 (five new tasks: 124, 125, 126, 127, 128); architect count 8 → 12; frontend-engineer 97 → 98. |
| Status summary | Complete: 7 (001 to 006, 124); ready: 6 (007, 113, 115, 117, 126, 128); pending: 110; blocked: 5. Total 128. |

## Changes in version 4

| Area | Change |
|------|--------|
| TASK-001/002 | Now `complete`. FEAT-001 approved by owner 2026-10-21 (defaults stand); ARCH-001 written (draft, pending owner approval of OD-01/OD-06). |
| TASK-005 | Now `complete` (marked ready in v3, completed 2026-10-21). |
| Task readiness | TASK-003, 004, 006, 007, 113, 115, 117 now `ready` (all Phase 0/1 dependencies met). |
| New tasks | Six tasks added from ARCH-001 section 30 follow-ups: TASK-118 (story detail), 119 (draft preview), 120 (edge policy/CSP), 121 (architecture lint), 122 (observability), 123 (availability hook). |
| Task reshapes | TASK-007, 013, 014, 015, 016/017, 018, 062, 077, 099, 105, 110, 113 updated per ARCH-001 section 30.2. |
| Path corrections | Plan references corrected: ARCH-001 at `docs/architecture/ARCH-001-web-frontend.md`; FEAT-001 at `docs/requirements/FEAT-001-frontend-rewrite.md`; asset inventory at `docs/plans/FEAT-001/ASSET-INVENTORY.md`. |
| Open questions | Plan Q8, Q11, Q13, Q17 marked resolved (owner approval 2026-10-21). New open questions OD-01, OD-06 added to notes on decision documentation. |
| Task count | 117 → 123 (six new tasks added); frontend-engineer count 81 → 87. |
| Route traceability | Story detail page `/stories/[slug]` added as 59th screen/route (new; not in the original 58 reference screens). |

## Changes in version 3

| Area | Change |
|------|--------|
| Hosting | Owner decisions recorded (see "Hosting & regions" in section 2): Next.js on Vercel (functions pinned to `sin1`), backend on Railway Singapore, Supabase Postgres moving from Seoul to a new Singapore project. **Q15 and Q16 resolved**; blocker B4 closed. |
| TASK-115 | Unblocked (`blocked` to `pending`, risk high to medium). It now documents the decided topology, regions, env matrix (prod/staging/preview), env vars and the `/api/*` rewrite instead of choosing a host. |
| TASK-105 | Stays `blocked`, but only on the new backend plan; Q15 no longer blocks it. Deploy config now includes the Vercel rewrite and staging. |
| TASK-005 | Image host (Q16) settled as Supabase Storage via `next/image` `remotePatterns`. |
| Tasks | v2: 110 → v3: 117. Added TASK-117 (architect, no dependencies, risk medium, group G0): database region move runbook (Seoul to Singapore) and Supabase lockdown checklist. Architect count v2: 7 → v3: 8. |

## Changes in version 2

| Area | Change |
|------|--------|
| Framework | **Vite + react-router replaced by Next.js App Router** (prerendering is a hard requirement). `web/` directory kept. Route groups `(public)`, `(auth)`, `(app)`, `(admin)`, `(handoff)`. |
| Rendering | Public pages are Server Components, static/ISR with on-demand revalidation when an admin publishes. `(auth)`, `(app)`, `(admin)` are client-rendered behind auth and `noindex`. |
| Backend | The **whole codebase, backend included, is being replaced**. The old "gap matrix" is now **the contract the new backend must satisfy** (`PgApi` interface + mocks). No task integrates the current Django API. Source for features: `docs/requirements/FEAT-000-feature-inventory.md`. |
| Cutover | Phase 8 kept but **blocked on a new backend plan (out of scope)**. The explicit user-approval gate before deleting legacy `src/` stays. The frontend ships against mocks until then. |
| Scope cuts | Old public Gallery page, tournament leaderboard and CSV export are **dropped** (event gallery/recap in the reference design stays). No tasks existed for them in v1, so none were removed; FEAT-001 records the drop (TASK-001). |
| Identifiers | Event and story URLs use **slugs**; the new backend must expose a unique `slug`, immutable once published; UUID stays the internal id. |
| Tokens | Refresh token in browser storage is acceptable (Q2); cookie-first blocker removed. |
| React standard | `react-best-practices`: `server-*` and Next.js rules **now apply** (section 2). DoD-R, TASK-002, 003, 008, 110 and per-task criteria updated. |
| Tasks | 110 to **116**. Added: TASK-111 (public data layer), 112 (SEO), 113 (ISR/revalidation contract), 114 (revalidation endpoint), 115 (hosting note), 116 (prerender verification). Repurposed: TASK-004, 021, 022, 092. Reframed/blocked: TASK-105 to 109. |
| Schema conformance | The seven long-form files now use the `task.schema.yaml` object forms. `TASKS-P*.md` are narrative companions, not schema documents. |

**Where the detail lives**

| File | Content |
|------|---------|
| `docs/plans/FEAT-001/TASKS-P0-P2.md` | TASK-001 to 039 plus 111 to 115 and 117 (narrative) |
| `docs/plans/FEAT-001/TASKS-P3-P5.md` | TASK-040 to 068 plus 112 (SEO) and 116 (narrative) |
| `docs/plans/FEAT-001/TASKS-P6-P8.md` | TASK-069 to 110 (narrative) |
| `docs/plans/FEAT-001/TASK-010.md`, `-014.md`, `-057.md`, `-062.md`, `-064.md`, `-077.md`, `-085.md` | Schema-conformant long-form task documents for the seven highest-complexity tasks |

---

## 1. Summary

A from-scratch rewrite of the PG Chess website frontend in `web/` (Next.js App Router, TypeScript strict, Tailwind v4), built to the static reference in `Frontend reference/` (58 screens, plus story detail page `/stories/[slug]` as the 59th). Legacy `src/` was removed by owner on 2026-10-22; remaining root legacy files (`package.json`, configs, etc.) are deleted only in a final gated cutover task (TASK-107).

- **129 tasks** (v6: +1 CI implementation task TASK-129), 9 phases (0 to 8). Owners: frontend-engineer 99, test-engineer 11, architect 12, product-manager 3, security-reviewer 2, code-reviewer 2. Status: complete 10, ready 12, blocked 5, pending 102.
- The frontend is built against a typed `PgApi` interface with a mock adapter that works in server rendering and in the browser (`NEXT_PUBLIC_USE_MOCKS`). **The interface and mocks are the contract the new backend must satisfy**; TASK-022 exports it and TASK-092 provides a conformance suite (expanded with L-1..L-16 negative conformance tests from SEC-001 annex A).
- Public pages are prerendered for SEO; signed-in areas are client-rendered.
- Mobile is first-class and enforced per task through DoD-S and dedicated responsive, accessibility and performance tasks.
- The Vercel `react-best-practices` skill governs React quality; TASK-110 audits it.

### Blockers

| #   | Blocker                                                                                                                                                                                                                                                                                | Resolving task     |
| --- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------ |
| B1  | FEAT-001 and ARCH-001 do not exist (FEAT-000 inventory is in progress as a precursor).                                                                                                                                                                                                 | TASK-001, TASK-002 |
| B2  | Repo rules, skill and agent describe Expo/React Native (`40-frontend.mdc` globs `frontend/**`; `00-team.mdc`: "frontend-engineer to Expo/React Native"). They contradict a Next.js web app in `web/`.                                                                                  | TASK-003           |
| B3  | Cutover cannot happen until a **new backend plan** (out of scope) delivers the contract. Phase 8 is blocked; the frontend ships against mocks until then.                                                                                                                              | new backend plan   |
| B4  | ~~Hosting/runtime for Next.js is undecided.~~ **Resolved in v3 (Q15):** Vercel (`sin1`) + Railway Singapore + Supabase Singapore. TASK-115 now only documents it; TASK-117 covers the database region move and Supabase lockdown.                                                      | TASK-115, TASK-117 |
| B5  | Planning-convention conflict: `30-planning.mdc` says `agent` and `docs/plans/YYYY-MM-DD-<slug>.md`; the planner agent and schema say `owner` and `docs/plans/<feature-id>.md`. This plan follows the requested path and the schema fields, and carries S/M/L in each task description. | TASK-003           |
| B6  | ~~Legacy~~ `src/` ~~deletion blocked until TASK-107.~~ **Resolved 2026-10-22:** owner removed `src/` directory. Remaining root legacy files (package.json, configs, dist/, public/) are gated by explicit approval in TASK-106 and deleted in TASK-107.                                | TASK-106, TASK-107 |

(The v1 blockers "Django envelope not implemented" and "cookie-first refresh token" are removed: the backend is being replaced and Q2 is resolved.)

---

## 2. Planning Assumptions

**Decided by the user (fixed):**

1. Web app, not Expo/React Native. New app in `web/`. Old `src/` untouched until TASK-107. Task owners use the schema enum.
2. **Stack (v2):** Next.js (App Router) + React 19 + TypeScript strict + Tailwind CSS v4 (CSS-first `@theme` tokens from `design-tokens.json`), TanStack Query for client areas, react-hook-form with zod. Next routing replaces react-router.
3. Faithful to the reference visual language (palette, Newsreader / Anek Latin / Fragment Mono, 2px public radius, copper about 10 percent, editorial public, dense admin). Fonts self-hosted through `next/font`.
4. **Backend is being replaced** (frontend and backend). `PgApi` + mocks are the contract; no task targets the current Django API. Product features are inventoried in `docs/requirements/FEAT-000-feature-inventory.md` (pending).
5. Auth model: short-lived access token in memory, refresh token in versioned browser storage (acceptable, Q2), CSP, no tokens in URLs or logs. Google sign-in is a feature-flagged UI.
6. FEAT-001 and ARCH-001 are the identifiers for this effort; PM and architect tasks gate the build.
7. Mobile first-class: mobile-first Tailwind, 320 and 390 primary widths, 44 to 48px targets, 16px minimum inputs, safe-area insets, mobile nav and drawers, admin tables to labelled stacked rows, Event Builder one step at a time with explicit preview, Event Room essentials at 390px, sticky bottom CTA on event detail, reduced motion, performance budget. PWA optional and late.
8. **Rendering:** prerendering is important. Public pages (Home, Play, event detail, past events, community, stories, contact, legal) are static/ISR with on-demand revalidation on admin publish, with `generateMetadata`, Open Graph, JSON-LD `Event`, sitemap and robots. `/app/`*, `/admin/*` and the auth flows are client-rendered behind auth and `noindex`. Mocks must work in server rendering (mock adapter at the data layer, not browser-only MSW).
9. **URLs use slugs** (as in the reference). The new backend must expose a unique `slug` on events and stories, immutable once published; UUID stays internal.
10. **Dropped:** old public Gallery page, tournament leaderboard, CSV export.
11. **Governing React standard: the** `react-best-practices` **skill** (`.claude/skills/react-best-practices/`, 70 rules) for every frontend-engineer task and for the TASK-110 audit. It is named in ARCH-001 scope (TASK-002) and the new web rule/skill (TASK-003).
12. **Proposals P1 to P11 are approved** (Q14), except where the Next.js switch supersedes them (table below).
13. **Hosting and regions (owner-confirmed, v3):** see the subsection below.

### Hosting & regions (owner-confirmed, v3)

Resolves Q15 (hosting/runtime) and Q16 (image hosting). Documented by TASK-115; the database move and Supabase lockdown are covered by TASK-117.

| Layer | Decision |
|-------|----------|
| Frontend | Next.js on Vercel. The Pro plan is needed for commercial use. Vercel functions are pinned to Singapore (`sin1`). |
| Backend | Railway, Southeast Asia (Singapore) region: an API service, a worker and scheduler/cron services (hold expiry, reminders, rating processing, emails). |
| Database | Supabase Postgres, **moving from ap-northeast-2 (Seoul) to a new Singapore (ap-southeast-1) project**. The owner performs the move (new project, dump/restore, update connection strings). The backend uses the Supabase connection pooler; in transaction mode, Django must disable server-side cursors. Paid plan with daily backups before real payments are taken. |
| Supabase lockdown | The auto-generated REST API must not be reachable: RLS enabled with no policies on all backend tables, or the API disabled, because the backend owns data access. |
| Media | Uploads go to Supabase Storage; the host is allow-listed in `next/image` `remotePatterns` (Q16). |
| Environments | Production, staging (separate Railway environment and separate Supabase project, Vercel staging/preview domain) and Vercel preview deployments (mock mode by explicit opt-in only). |
| API access | The browser calls the API through a Vercel rewrite `/api/*` to Railway: one origin, no CORS, and the refresh token can later move to an httpOnly cookie. |
| Webhooks | Razorpay webhooks go straight to Railway, not through Vercel. Django-to-Vercel publish revalidation uses the HMAC-signed `/api/revalidate` route (TASK-113, TASK-114) with a shared secret configured in both environments. |
| Resolved (2026-10-23) | OQ-18: the backend EXTENDS the existing Django app in `backend/` (owner decision). It is developed against a local PostgreSQL database first, and starts after the main frontend pages. The hosting topology is unchanged. |

**Applicability of the skill to this Next.js app (ARCH-001 confirms):**

| Category | Applies? | How it is used here |
|----------|----------|---------------------|
| `async-*` | **Yes** | Independent fetches start together (`async-parallel`); `Suspense` boundaries and streaming isolate slow secondary data (`async-suspense-boundaries`); defer awaits to the branch that needs them (`async-defer-await`, `async-cheap-condition-before-await`); `async-api-routes` applies to `/api/revalidate` (start promises early, await late). |
| `bundle-*` | **Yes** | No barrel imports (lint-enforced) (`bundle-barrel-imports`; `optimizePackageImports` only where a barrel is unavoidable); `next/dynamic` for heavy client features: chart, carousel implementation, focal/drag editor, preview sheet, builder steps, result sheet, paid panel (`bundle-dynamic-imports`, `bundle-conditional`); Razorpay and any analytics loaded only where used (`bundle-defer-third-party`); preload on hover/focus (`bundle-preload`, plus `next/link` prefetch); statically analysable import paths (`bundle-analyzable-paths`). |
| `server-*` | **Yes (now applies)** | `React.cache` per-request dedup for public fetchers (`server-cache-react`); Next data cache with tags for cross-request caching, `server-cache-lru` only if a gap appears; minimal props across the server/client boundary and no duplicated serialization (`server-serialization`, `server-dedup-props`); parallel fetching by component composition and nested `Promise.all` (`server-parallel-fetching`, `server-parallel-nested-fetching`); static I/O (fonts, OG assets) hoisted to module scope (`server-hoist-static-io`); **no mutable module-level request state, including in the mock layer** (`server-no-shared-module-state`); `after()` for non-blocking work (`server-after-nonblocking`); any Server Action authenticates and authorises inside the action (`server-auth-actions`); default decision is no Server Actions unless ARCH-001 justifies one. |
| `client-*` | **Yes** | TanStack Query is the client dedup layer (equivalent of `client-swr-dedup`) in `(auth)/(app)/(admin)` only; passive listeners; shared global listeners; versioned, minimal, try/catch-wrapped storage. |
| `rerender-*` | **Yes** | Derived state in render or `select`, split contexts, memoised list rows, no nested components, transitions and deferred values, refs for transient values. |
| `rendering-*` | **Yes, including hydration** | `content-visibility` for ledgers/tables/archives; hoisted static JSX; ternaries not `&&`; resource hints (hero via `priority`, `preconnect`); deferred scripts; SVG precision; `rendering-hydration-no-flicker` and `-suppress-warning` for client-only state; server and client formatters must be deterministic (explicit `timeZone`/locale); `rendering-activity` only if the React version in use supports it and state preservation is needed. |
| `js-*` | **Yes** | Maps/sets for lookups, single-pass loops, hoisted RegExp/Intl instances, `toSorted`, idle-time deferral. |
| `advanced-*` | Selectively | Only where a concrete need arises. |

**Proposals P1 to P11 and v2 status:**

| # | Proposal | v2 status |
|---|----------|-----------|
| P1 | Radix primitives (Dialog, Tabs, Switch), per-package imports | Approved. |
| P2 | In-repo mock adapter; MSW only in tests | Approved and **tightened**: mock adapter sits at the data layer and runs on the server; MSW is not used in the product build. |
| P3 | No GSAP; CSS plus tiny IntersectionObserver reveal | Approved. |
| P4 | Hand-rolled SVG rating chart | Approved. |
| P5 | `@fontsource` for fonts | **Superseded** by `next/font` (self-hosted at build). |
| P6 | Visibility-aware polling for the Event Room | Approved. |
| P7 | Browser floor driven by Tailwind v4 | Approved; audience data still wanted (Q11). |
| P8 | Access token in memory; refresh storage by ARCH-001 | Approved; Q2 resolved (refresh in storage acceptable). |
| P9 | Budget (entry JS, per-route chunk, CSS, admin never on public routes; LCP/CLS/INP) | Approved; measured as **First Load JS per route** from `next build` and the analyzer; exact numbers set in ARCH-001 after the empty-app baseline (TASK-007). |
| P10 | `src` folder layout | **Superseded** by the Next `app/` layout with route groups. |
| P11 | Tooling enforcement of the skill | Approved; Vite visualizer replaced by `@next/bundle-analyzer`; lint rules extended with server/client boundary rules. |
| (router) | react-router | **Superseded** by Next routing, layouts and route groups. |

---

## 3. Definition of Done

**DoD-S (every screen-bearing task).**

1. Loading skeleton, error state (names the failed action, retry where safe), empty state (explains and offers a next action) and data state all implemented and reachable via mock scenarios and the handoff states page.
2. No horizontal scroll at 390px and 320px; targets at least 44px (controls 48px); inputs at least 16px font; fixed/sticky bars honour `env(safe-area-inset-*)`.
3. Keyboard operable, visible `:focus-visible`, semantic heading order, labels and errors associated, no serious/critical axe violations, reduced motion respected.
4. Visually faithful to the cited `Frontend reference/screens/NN-*.html` at 1440 and 390.
5. Component or page tests plus a Playwright smoke at 390 and 320.
6. Code-split by route; the route adds nothing to another group's bundle; **public routes also satisfy DoD-P below**.

**DoD-P (public prerendered routes, in addition).** Statically prerendered or ISR (confirmed in the build output); raw HTML (JavaScript disabled) contains the page's primary content and internal links; `generateMetadata` with title, description, canonical and Open Graph; structured data where applicable; no `cookies()`, `headers()` or unbounded `searchParams` reads that make the route dynamic; revalidation tags declared; volatile data (availability) delivered by a client island with reserved space.

**DoD-G (every task).** TypeScript strict, lint (incl. jsx-a11y and boundary rules) and tests pass; no `any` without justification; no hard-coded API URL; no secrets in client code; no raw colours or off-scale spacing.

**DoD-R (every frontend-engineer task; react-best-practices, Next.js edition).**

- *Waterfalls:* independent fetches start together; slow secondary data sits behind `Suspense`.
- *Bundle:* no barrel imports; heavy or conditional features and third-party scripts load via `next/dynamic` or on intent.
- *Server/client boundary:* Server Components by default; `'use client'` only for interaction, as small islands; props crossing the boundary are minimal, serialisable and primitive; `server-only` on server modules; **no mutable module-level state written during server render, including mocks**; Server Actions, if any, authenticate inside.
- *Client data:* one cache entry per query key; polling shares one request.
- *Re-render:* derived values computed in render or `select`, never in effects; memoised list rows on stable props; transitions or deferred values for non-urgent updates.
- *Rendering:* long lists use `content-visibility` or windowing; deterministic server/client output with no hydration warnings.
Task-specific criteria are written into each task's acceptance criteria and audited in TASK-110.

---

## 4. Backend Contract (what the new backend must satisfy)

The previous Django API is **not a target**. Its code remains a reference for field semantics only. This section is the summary; TASK-004 produces `docs/architecture/ARCH-001-backend-contract.md`, TASK-113 the ISR/revalidation contract, and TASK-022 exports machine-readable schemas and examples to `docs/architecture/pgapi-contract/`. The feature list that justifies each capability is `docs/requirements/FEAT-000-feature-inventory.md` (pending, referenced by path only; TASK-004 cross-references its feature ids).

**Cross-cutting requirements**

| Requirement | Detail |
|-------------|--------|
| Envelope | Every API response uses the unified envelope `{success, message?, data, error{code, detail, fields, retry_after}, meta{request_id, timestamp, pagination}}` (`docs/decisions/2026-09-15-unified-api-response-envelope.md`). |
| Error codes | The 15 stable codes in `docs/BACKEND-CONTRACT.md` plus HTTP/transport fallbacks; copy lives in the frontend (TASK-014). |
| Slugs | `slug` on events and stories: unique, URL-safe, **immutable once published**; UUID stays the internal id; drafts have no public URL. |
| Revalidation webhook | On publish/update/unpublish/cancel/complete of events, stories, testimonials, site content, media and legal pages the backend calls `POST {site}/api/revalidate` with an HMAC-SHA256 signature, timestamp (5 minute window) and a typed payload (TASK-113). |
| Public-safe projections | Public event/story/site reads return only fields safe and needed for rendering; no private registration data. |
| Availability | A cheap live availability read for the event page island (places left, registration state) independent of the cached page. |
| Idempotency | Mutations that create orders/registrations accept an idempotency key. |
| Event-room snapshot | One per-player snapshot (check-in, current published round, my pairing, standings, result state, rating outcome, server time). |
| Auth model | Short-lived access token plus rotating refresh token; neutral password-reset responses; role from the server. |
| Money | Integer paise plus currency; the server owns price, capacity, holds and payment state. |
| Hosting (v3) | Backend runs on Railway Singapore (API, worker, scheduler) and reads Supabase Postgres (Singapore) through the pooler; the browser reaches it via the Vercel `/api/*` rewrite (single origin); Razorpay webhooks hit Railway directly; Supabase's own REST API is locked down (RLS with no policies, or disabled). |

**Screen to contract map (each row is a group of** `PgApi` **methods; features resolved against FEAT-000 by TASK-004)**

| Screens | Capability the new backend must provide | Notes |
|---------|-----------------------------------------|-------|
| 01, 06, 09-11 | Published site content (home sections, community, nav, footer, legal) with draft/publish and version | Prerendered; revalidation webhook on publish. |
| 01, 02, 03, 05 | Published events list/detail by slug, past events, media collections, first-timer counts, area/city, waitlist flag | Slug and projections required. |
| 04 | Event results: standings, winner, recap, gallery | Archive mode. |
| 07 | Stories (type, featured, slug, media) | Detail pages open (Q8). |
| 08 | Contact submission | Provider open (Q12). |
| 13-17 | Login, register, Google OAuth (flagged), callback, reset (neutral), onboarding preferences | |
| 18-21 | Reserve place, create order with server price and hold, verify, webhook reconcile, waitlist, free confirmation | Idempotent. |
| 22, 23 | My registrations and states, next-up | |
| 24-29 | Check-in, event-room snapshot, result submission, dispute, rating outcome | |
| 30 | Rating pools, ledger, trend series | |
| 31 | Private profile, public-identity flags | |
| 32-36 | Admin aggregates, CMS sections with versions and conflict handling, media upload and collections (alt, focal point), stories, testimonials with consent | |
| 37-45 | Event CRUD, drafts, slug check, full configuration (experience, registration, payment, game system, media, communications), publish | |
| 46-53 | Registrations, check-in, rounds (draft/publish/version/correct), results lifecycle, finalise (idempotent), payments, messages, gallery/recap, audit | |
| 54-56 | Players, payments ledger and reconcile, settings (no secrets) | |

**Candidate backend work (handoff only, not planned here):** implement the contract above as a new backend; deliver the revalidation webhook; deliver the conformance-suite target (`CONTRACT_BASE_URL`, TASK-092). The old Django findings (open registrations list leaking emails and Razorpay ids, 6-character minimum password, read endpoint performing writes, no pagination) are noted for that plan as things not to reproduce.

---

## 5. Task Table

Est = S/M/L. Detail is in the companion files above. Dependencies are listed by number (TASK- prefix omitted). **[file]** marks the seven schema-conformant task documents.

| ID | Title | Owner | Est | Depends On | Risk | Status |
|----|-------|-------|-----|-----------|------|--------|
| **Phase 0: gates and housekeeping** | | | | | | |
| 001 | FEAT-001 requirements (consumes FEAT-000) | product-manager | M | none | medium | complete |
| 002 | ARCH-001 Next.js architecture (incl. RBP conventions) | architect | L | 001 | high | complete |
| 003 | Web rule, skill, agent guidance (references RBP) | architect | S | 002 | medium | complete |
| 004 | Backend contract and gap matrix | architect | M | 001 | medium | complete |
| 005 | Asset inventory (next/font, imagery, image host) | product-manager | S | none | medium | complete |
| 006 | Security design review of ARCH-001 | security-reviewer | S | 002 | medium | complete |
| 124 | GATE: ARCH-001 v2 scaffold conditions absorbed (new v5) | architect | S | 006 | medium | complete |
| 125 | Dual-mode token module (localStorage/cookie; OD-01) (new v5) | frontend-engineer | M | 007, 124 | high | pending |
| 126 | Vercel Firewall rate limits and Deployment Protection ops checklist (new v5) | architect | S | 124 | medium | pending |
| 127 | Privacy purge runbook and webhook types (new v5) | architect | S | 113 | medium | pending |
| 128 | CI hardening: dependency gate, pinned actions, 2FA policy (new v5) | architect | M | 124 | medium | pending |
| 113 | ISR/revalidation strategy and webhook contract (new) | architect | M | 002, 004 | high | pending |
| 115 | Hosting/runtime note: Vercel sin1 + Railway SG + Supabase SG, env matrix, `/api` rewrite (v3: unblocked) | architect | S | 002 | medium | pending |
| 117 | Database region move runbook (Seoul to Singapore) and Supabase lockdown checklist (new in v3) | architect | S | none | medium | ready |
| **Phase 1: foundation** | | | | | | |
| 007 | Scaffold web/ (Next.js) | frontend-engineer | M | 002, 003, 124 | medium | ready |
| 008 | Lint/test tooling + RBP and boundary lint rules | frontend-engineer | S | 007 | low | pending |
| 009 | Playwright harness incl. raw-HTML helper | test-engineer | M | 007 | medium | pending |
| 010 | Tailwind v4 tokens **[file]** | frontend-engineer | M | 007 | medium | pending |
| 011 | Fonts with next/font and resource hints | frontend-engineer | S | 010, 005 | medium | pending |
| 012 | Server-safe formatters, hooks, storage | frontend-engineer | S | 007 | low | pending |
| 013 | App Router groups, layouts, noindex, skip link | frontend-engineer | M | 007 | medium | pending |
| 014 | API client core **[file]** | frontend-engineer | L | 002, 007 | high | pending |
| 015 | Query layer (client areas) | frontend-engineer | S | 014 | low | pending |
| 016 | Types and PgApi: public/player | frontend-engineer | M | 002, 004, 007 | medium | pending |
| 017 | Types and PgApi: admin | frontend-engineer | M | 002, 004, 007 | medium | pending |
| 018 | Mock adapter core (server and browser) | frontend-engineer | M | 015, 016 | medium | pending |
| 019 | Mock player fixtures, scenario switcher | frontend-engineer | M | 018 | medium | pending |
| 020 | Mock admin fixtures | frontend-engineer | M | 017, 018 | medium | pending |
| 021 | Mock auth/session/profile services | frontend-engineer | M | 014, 016, 018 | medium | pending |
| 022 | PgApi contract export for the backend plan | frontend-engineer | M | 004, 016, 017, 113 | medium | pending |
| 023 | Auth context (client areas) | frontend-engineer | M | 014, 015, 021 | high | pending |
| 024 | Route guards, return-to | frontend-engineer | M | 013, 023 | high | pending |
| 111 | Public server data layer (new) | frontend-engineer | M | 014, 016, 018 | medium | pending |
| 114 | Revalidation endpoint and mock trigger (new) | frontend-engineer | M | 007, 111, 113 | high | pending |
| 112 | SEO layer: metadata, OG, JSON-LD, sitemap, robots (new) | frontend-engineer | M | 007, 111, 113 | medium | pending |
| **Phase 2: design system and shells** | | | | | | |
| 025 | Layout/typography primitives | frontend-engineer | M | 010 | low | pending |
| 026 | Button, Icon set, StatusBadge, Avatar | frontend-engineer | M | 010, 011, 025 | low | pending |
| 027 | Form primitives | frontend-engineer | M | 025, 026 | medium | pending |
| 028 | Feedback primitives | frontend-engineer | M | 012, 025, 026 | low | pending |
| 029 | Dialog, Drawer, Sheet | frontend-engineer | M | 026 | medium | pending |
| 030 | Tabs, Stepper | frontend-engineer | M | 026 | low | pending |
| 031 | ResponsiveTable | frontend-engineer | M | 025, 026 | medium | pending |
| 032 | ResponsiveImage on next/image | frontend-engineer | S | 010 | medium | pending |
| 033 | Accessible Carousel (SSR first slide, lazy client) | frontend-engineer | M | 012, 026, 032 | medium | pending |
| 034 | Domain components | frontend-engineer | M | 026, 028, 032 | medium | pending |
| 035 | Reveal utility | frontend-engineer | S | 010, 012 | low | pending |
| 036 | PublicNav, Footer | frontend-engineer | M | 013, 023, 026, 029 | medium | pending |
| 037 | PlayerShell | frontend-engineer | M | 013, 023, 026, 029 | medium | pending |
| 038 | AdminShell | frontend-engineer | M | 013, 023, 026, 029 | medium | pending |
| 039 | Handoff routes (57, 58) | frontend-engineer | M | 013, 019, 023, 028, 034 | low | pending |
| **Phase 3: public site (prerendered)** | | | | | | |
| 040 | Home hero and upcoming (01) | frontend-engineer | L | 018, 032, 034, 035, 036, 111, 112 | medium | pending |
| 041 | Home lower sections (01) | frontend-engineer | M | 033, 040 | low | pending |
| 042 | Play (02) | frontend-engineer | M | 018, 028, 034, 036, 111, 112 | low | pending |
| 043 | Event detail open modes, ISR (03) | frontend-engineer | L | 018, 032, 033, 034, 036, 111, 112, 113 | medium | pending |
| 044 | Event detail archive (04) | frontend-engineer | M | 031, 043 | low | pending |
| 045 | Past events (05) | frontend-engineer | S | 034, 036, 111, 112 | low | pending |
| 046 | Community (06) | frontend-engineer | S | 032, 033, 036, 111, 112 | low | pending |
| 047 | Stories (07) | frontend-engineer | M | 032, 036, 111, 112 | low | pending |
| 048 | Contact (08) | frontend-engineer | M | 027, 028, 036, 112 | low | pending |
| 049 | Legal x3, not-found (09-12) | frontend-engineer | S | 013, 036, 111, 112 | low | pending |
| 116 | Prerender and SEO verification (new) | test-engineer | M | 009, 040, 042-047, 049, 112, 114 | medium | pending |
| **Phase 4: auth and conversion** | | | | | | |
| 050 | AuthLayout and Login (13) | frontend-engineer | M | 018, 024, 026, 027, 028 | medium | pending |
| 051 | Create account (14) | frontend-engineer | M | 050 | medium | pending |
| 052 | OAuth callback (15) | frontend-engineer | S | 024, 050 | low | pending |
| 053 | Reset password (16) | frontend-engineer | M | 021, 050 | low | pending |
| 054 | Welcome (17) | frontend-engineer | M | 018, 021, 024, 027 | low | pending |
| 055 | Registration frame and resolver (18-21 shell) | frontend-engineer | L | 018, 019, 024, 027, 028, 043 | high | pending |
| 056 | Registration free and success (19, 21) | frontend-engineer | M | 055 | medium | pending |
| 057 | Registration paid and Razorpay **[file]** (18) | frontend-engineer | L | 015, 022, 055 | high | pending |
| 058 | Registration waitlist (20) | frontend-engineer | S | 055 | low | pending |
| 059 | Registration scenario tests | test-engineer | M | 009, 056, 057, 058 | medium | pending |
| **Phase 5: player area** | | | | | | |
| 060 | Dashboard (22) | frontend-engineer | M | 019, 024, 034, 037 | medium | pending |
| 061 | My Events (23) | frontend-engineer | M | 019, 024, 034, 037 | medium | pending |
| 062 | Event Room data layer **[file]** | frontend-engineer | L | 015, 019, 028, 037 | high | pending |
| 063 | Event Room before/check-in (24, 25) | frontend-engineer | M | 034, 062 | medium | pending |
| 064 | Event Room pending/live **[file]** (26, 27) | frontend-engineer | L | 029, 034, 062 | high | pending |
| 065 | Event Room between/complete (28, 29) | frontend-engineer | M | 034, 062 | medium | pending |
| 066 | Rating pools and ledger (30) | frontend-engineer | M | 019, 028, 034, 037 | medium | pending |
| 067 | Rating trend chart (30) | frontend-engineer | M | 066 | medium | pending |
| 068 | Profile (31) | frontend-engineer | M | 021, 027, 029, 037 | medium | pending |
| **Phase 6: admin** | | | | | | |
| 069 | Admin patterns | frontend-engineer | M | 027, 029, 030, 031, 038 | medium | pending |
| 070 | Admin dashboard (32) | frontend-engineer | M | 020, 034, 038 | low | pending |
| 071 | Media library (34) | frontend-engineer | M | 020, 032, 069 | medium | pending |
| 072 | Media collection editor (34) | frontend-engineer | L | 033, 071 | high | pending |
| 073 | Website CMS (33) | frontend-engineer | L | 020, 069, 072, 114 | high | pending |
| 074 | Stories admin (35) | frontend-engineer | M | 020, 031, 069, 072 | medium | pending |
| 075 | Testimonials admin (36) | frontend-engineer | M | 020, 069, 071 | medium | pending |
| 076 | Admin events list (37) | frontend-engineer | M | 020, 030, 031, 038 | low | pending |
| 077 | Event Builder framework **[file]** | frontend-engineer | L | 020, 027, 029, 030, 034, 069 | high | pending |
| 078 | Builder steps 1-2 (38, 39) | frontend-engineer | M | 077 | low | pending |
| 079 | Builder steps 3-4 (40, 41) | frontend-engineer | M | 077 | medium | pending |
| 080 | Builder steps 5-6 (42, 43) | frontend-engineer | M | 072, 077 | medium | pending |
| 081 | Builder steps 7-8 (44, 45) | frontend-engineer | M | 077, 112 | medium | pending |
| 082 | Control Room frame (46-53 shell) | frontend-engineer | M | 020, 030, 034, 038, 076 | medium | pending |
| 083 | Control: Overview, Registrations (46, 47) | frontend-engineer | M | 031, 082 | low | pending |
| 084 | Control: Check-in desk (48) | frontend-engineer | M | 027, 082 | medium | pending |
| 085 | Control: Pairings **[file]** (49) | frontend-engineer | L | 029, 031, 082 | high | pending |
| 086 | Control: Payments (50) | frontend-engineer | S | 031, 082 | low | pending |
| 087 | Control: Messages (51) | frontend-engineer | M | 027, 082 | medium | pending |
| 088 | Control: Gallery/recap, Audit (52, 53) | frontend-engineer | M | 031, 071, 082 | low | pending |
| 089 | Players admin (54) | frontend-engineer | M | 020, 031, 069 | medium | pending |
| 090 | Payments admin (55) | frontend-engineer | M | 020, 031, 038 | medium | pending |
| 091 | Settings admin (56) | frontend-engineer | M | 020, 027, 069 | medium | pending |
| **Phase 7: cross-cutting QA** | | | | | | |
| 092 | Contract conformance tests | test-engineer | M | 014, 021, 022 | medium | pending |
| 093 | E2E: public/auth/registration | test-engineer | L | 009, 040, 042, 043, 050, 051, 059 | medium | pending |
| 094 | E2E: player | test-engineer | M | 009, 060, 061, 063, 064, 065, 067, 068 | medium | pending |
| 095 | E2E: admin | test-engineer | L | 009, 070, 073-075, 080, 081, 085, 088-091, 114 | medium | pending |
| 096 | Responsive matrix | test-engineer | M | 093, 094, 095 | medium | pending |
| 097 | Accessibility audit | test-engineer | M | 093, 094, 095 | medium | pending |
| 098 | Visual QA vs reference | test-engineer | M | 039, 093, 094, 095 | medium | pending |
| 110 | React best-practices audit (Next.js edition) | code-reviewer | M | 093, 094, 095, 116 | medium | pending |
| 099 | Performance budget and Lighthouse (uses 110) | frontend-engineer | M | 011, 093, 094, 095, 110 | medium | pending |
| 100 | Triage and fix QA findings | frontend-engineer | L | 096, 097, 098, 099, 110, 116 | medium | pending |
| 101 | Security review | security-reviewer | M | 006, 092, 100, 129 | high | pending |
| 102 | Code review | code-reviewer | M | 092, 100 | medium | pending |
| 103 | OPTIONAL: PWA basics | frontend-engineer | S | 099, 100 | low | pending |
| 104 | Workflow readiness gate | architect | S | 101, 102 | low | pending |
| **Phase 8: cutover (deferred, blocked on the new backend plan)** | | | | | | |
| 105 | Deployment config for the chosen host (Vercel; no longer blocked by hosting) | frontend-engineer | M | 100, 101, 115 | medium | blocked (new backend plan only) |
| 106 | GATE: user approval | product-manager | S | 104, 105 | high | blocked |
| 107 | Remove legacy src/ and old deps | frontend-engineer | M | 106 | high | blocked |
| 108 | README, runbook, rollback | architect | S | 107 | low | blocked |
| 109 | Post-deploy smoke test | test-engineer | S | 107 | medium | blocked |

**Totals (v6): 129 tasks.** By owner: frontend-engineer 99 (added TASK-129), test-engineer 11, architect 12, product-manager 3, security-reviewer 2, code-reviewer 2. By status: complete 10 (001 to 007, 124, 126, 128), ready 12, blocked 5 (105 to 109), pending 102.

### How react-best-practices is wired into the tasks

| Concern (skill rule) | Where it is a task criterion |
|----------------------|------------------------------|
| Standard named; Next.js applicability table; budgets; server/client rules | 002, 003 |
| No barrel imports; boundary lint; per-module icons | 007, 008, 026 |
| Route-level splitting and `next/dynamic` for heavy features (`bundle-dynamic-imports`, `bundle-conditional`) | 013, 033, 057, 064, 067, 072, 073, 077, 082, 085 |
| Parallel server fetching, Suspense streaming (`server-parallel-fetching`, `async-suspense-boundaries`) | 040, 041, 043, 060, 070, 111 |
| `React.cache` dedup, tagged fetchers (`server-cache-react`) | 111, 112, 043 |
| Minimal props across the boundary (`server-serialization`) | 016, 043, 055, 057, 062, 085, 111 |
| No mutable module state in server render, incl. mocks (`server-no-shared-module-state`) | 015, 018, 062, 110 |
| `server-only` and secrets separation | 007, 014, 111, 114 |
| `async-api-routes`, `after()` on revalidation | 114 |
| Server Actions authenticate inside (`server-auth-actions`) | 002 (default none), 048, 110 |
| Hydration correctness (`rendering-hydration-*`) | 012, 035, 036, 110 |
| Resource hints (`rendering-resource-hints`) | 011, 032, 040 |
| TanStack Query dedup and polling (`client-swr-dedup`) | 015, 062, 084 |
| Razorpay only on the paid panel (`bundle-defer-third-party`) | 057, 043 (negative check) |
| Transitions and deferred values | 042, 045, 062, 066, 077, 084 |
| Split state, derived subscriptions, memo rows | 023, 027, 034, 062, 068, 069, 077, 085 |
| `content-visibility` for long lists | 010 (utility), 031, 044, 066, 083, 088, 090, 071 |
| Audit in skill priority order with analyzer evidence | **110**, consumed by 099 and 100 |

---

## 6. Screen-Coverage Traceability

Screen numbers are `SCREEN-MAP.csv` numbers (equal to the `screens/NN-*.html` prefix). All 58 are covered. Next route syntax is used. Public rows (1 to 12) are additionally verified for prerendering and SEO by TASK-112 and TASK-116; tasks 111 to 115, 116 and 117 are infrastructure, ops and verification tasks with no screen of their own.

| # | Reference file | Screen / state | Route | Task(s) |
|---|----------------|----------------|-------|---------|
| 1 | 01-home | Home | `/` | 040, 041 (+112, 116) |
| 2 | 02-play | Play | `/play` | 042 (+116) |
| 3 | 03-event-open | Event, open | `/events/[slug]` | 043 (+116) |
| 4 | 04-event-completed | Event, completed | `/events/[slug]` | 044 (+116) |
| 5 | 05-past-events | Past events | `/past-events` | 045 (+116) |
| 6 | 06-community | Community | `/community` | 046 (+116) |
| 7 | 07-stories | Stories | `/stories` | 047 (+116) |
| 8 | 08-contact | Contact | `/contact` | 048 (+116) |
| 9 | 09-privacy | Privacy | `/privacy` | 049 (+116) |
| 10 | 10-terms | Terms | `/terms` | 049 (+116) |
| 11 | 11-refund-policy | Refund policy | `/refund-policy` | 049 (+116) |
| 12 | 12-404 | 404 | `not-found` | 049 |
| 13 | 13-login | Login | `/login` | 050 |
| 14 | 14-create-account | Create account | `/login?mode=signup` | 051 |
| 15 | 15-oauth-callback | OAuth callback | `/auth/callback` | 052 |
| 16 | 16-reset-password | Reset password | `/reset-password` | 053 |
| 17 | 17-welcome | First login | `/welcome` | 054 |
| 18 | 18-register-paid | Registration, paid | `/events/[slug]/register` | 055, 057 |
| 19 | 19-register-free | Registration, free | `/events/[slug]/register` | 055, 056 |
| 20 | 20-register-waitlist | Registration, waitlist | `/events/[slug]/register` | 055, 058 |
| 21 | 21-register-success | Registration, success | `/events/[slug]/register` | 055, 056 |
| 22 | 22-player-dashboard | Player dashboard | `/app` | 060 |
| 23 | 23-my-events | My events | `/app/events` | 061 |
| 24 | 24-event-room-before-checkin | Event room, before check-in | `/app/events/[id]` | 062, 063 |
| 25 | 25-event-room-checkin-open | Event room, check-in open | `/app/events/[id]` | 062, 063 |
| 26 | 26-event-room-pairing-pending | Event room, pairing pending | `/app/events/[id]` | 062, 064 |
| 27 | 27-event-room-live | Event room, live | `/app/events/[id]` | 062, 064 |
| 28 | 28-event-room-between-rounds | Event room, between rounds | `/app/events/[id]` | 062, 065 |
| 29 | 29-event-room-complete | Event room, complete | `/app/events/[id]` | 062, 065 |
| 30 | 30-rating | Ratings | `/app/rating` | 066, 067 |
| 31 | 31-profile | Profile | `/app/profile` | 068 |
| 32 | 32-admin-dashboard | Admin dashboard | `/admin` | 070 |
| 33 | 33-admin-content | Website CMS | `/admin/content` | 073 |
| 34 | 34-admin-media | Media | `/admin/media` | 071, 072 |
| 35 | 35-admin-stories | Stories admin | `/admin/stories` | 074 |
| 36 | 36-admin-testimonials | Testimonials admin | `/admin/testimonials` | 075 |
| 37 | 37-admin-events | Events admin | `/admin/events` | 076 |
| 38 | 38-event-builder-basics | Builder 1 Basics | `/admin/events/new` | 077, 078 |
| 39 | 39-event-builder-experience | Builder 2 Experience | `/admin/events/new` | 077, 078 |
| 40 | 40-event-builder-registration | Builder 3 Registration | `/admin/events/new` | 077, 079 |
| 41 | 41-event-builder-payment | Builder 4 Payment | `/admin/events/new` | 077, 079 |
| 42 | 42-event-builder-game-system | Builder 5 Game system | `/admin/events/new` | 077, 080 |
| 43 | 43-event-builder-media | Builder 6 Media | `/admin/events/new` | 077, 080 |
| 44 | 44-event-builder-communications | Builder 7 Communications | `/admin/events/new` | 077, 081 |
| 45 | 45-event-builder-review | Builder 8 Review | `/admin/events/new` | 077, 081 |
| 46 | 46-event-control-overview | Control: Overview | `/admin/events/[id]/overview` | 082, 083 |
| 47 | 47-event-control-registrations | Control: Registrations | `/admin/events/[id]/registrations` | 082, 083 |
| 48 | 48-event-control-checkin | Control: Check-in | `/admin/events/[id]/check-in` | 082, 084 |
| 49 | 49-event-control-pairings | Control: Pairings and rounds | `/admin/events/[id]/pairings` | 082, 085 |
| 50 | 50-event-control-payments | Control: Payments | `/admin/events/[id]/payments` | 082, 086 |
| 51 | 51-event-control-messages | Control: Messages | `/admin/events/[id]/messages` | 082, 087 |
| 52 | 52-event-control-gallery | Control: Gallery and recap | `/admin/events/[id]/gallery` | 082, 088 |
| 53 | 53-event-control-audit | Control: Audit | `/admin/events/[id]/audit` | 082, 088 |
| 54 | 54-admin-players | Players | `/admin/players` | 089 |
| 55 | 55-admin-payments | Payments | `/admin/payments` | 090 |
| 56 | 56-admin-settings | Settings | `/admin/settings` | 091 |
| 57 | 57-design-system | Design system | `/handoff/design-system` | 039 |
| 58 | 58-ui-states | UI states | `/handoff/states` | 039 |

Not in the 58 but required: `/handoff` index (039); shells (036, 037, 038); route error and permission states (013, 024, 028); `/api/revalidate` (114), `sitemap.xml` and `robots.txt` (112); hosting topology note (115); database region move runbook and Supabase lockdown checklist (117). **Dropped (no screen, no task):** old Gallery page, leaderboard, CSV export.

---

## 7. Critical Path

TASK-001 → 002 → 003 → 007 → 010 → 011 → 026 → 029 → 038 → 069 → 071 → 072 → 080 → 095 → 110 → 099 → 100 → 101 → 104 → 106 → 107

Build path ends at TASK-104; 106 and 107 are deferred and blocked on the new backend plan, so the practical "frontend complete" milestone is TASK-104 (readiness gate, mock-backed). TASK-110 precedes TASK-099 because the audit's analyzer evidence feeds the budget. The public-site near-critical chain is 002 → 113 → 111 → 112 → 043 → 116 → 110. The player chain is 014 → 015 → 019 → 062 → 064 → 094 → 096. TASK-115 and TASK-117 are off the critical path (TASK-117 has no dependencies and is run by the owner). Nothing but TASK-001, TASK-005 and TASK-117 can start before FEAT-001 exists, and nothing but Phase 0 before ARCH-001 is approved.

## 8. Parallel Groups

| Group | Tasks | Notes |
|-------|-------|-------|
| G0 | 003, 004, 005, 006, 115, 117 | After 001/002; 005 and 117 can start immediately (117 has no dependencies and is an owner-run ops runbook); 115 waits only on 002 (Q15 is resolved). |
| G1 | 008, 009, 010, 012, 013, 014, 016, 017, 113 | After the scaffold (113 needs only ARCH and the contract). |
| G2 | 011, 015, 018 | Fonts, query layer, mock core. |
| G3 | 019, 020, 021, 022, 111 | Mock fixtures, mock auth, contract export, public data layer. |
| G3B | 112, 114 | SEO layer and revalidation endpoint (need 111 and 113). |
| G4 | 025, 032, 035 | Need only tokens. |
| G5 | 027, 028, 029, 030, 031 | After Button/Icon (026). |
| G6 | 033, 034 | Carousel, domain components. |
| G7 | 036, 037, 038, 039 | Shells and handoff pages. |
| G8 | 040, 042, 043, 045, 046, 047, 048, 049 | Public screens (041 after 040; 044 after 043). |
| G9 | 051, 052, 053, 054 | After login layout. |
| G10 | 056, 057, 058 | After registration frame (055). |
| G11 | 060, 061, 062, 066, 068 | Player screens; 062 starts the Event Room chain. |
| G12 | 063, 064, 065 | After the Event Room data layer. |
| G13 | 070, 076, 090 | Need only the admin shell. |
| G14 | 073, 074, 075, 089, 091 | After admin patterns and media (073 also needs 114). |
| G15 | 078, 079, 080, 081 | After the builder framework. |
| G16 | 083, 084, 085, 086, 087, 088 | After the Control Room frame. |
| G17 | 092, 093, 094, 095, 116 | Contract and E2E tests, prerender/SEO verification, as areas land. |
| G18 | 096, 097, 098, 110 | After E2E; 110 also needs 116. |
| G18B | 099 | After 110. |
| G19 | 101, 102, 103 | Reviews and optional PWA after fixes. |
| G20 | 108, 109 | Blocked behind cutover. |

Phases 3 to 6 can run concurrently once Phase 2 shells exist. Test-engineer work (009, 059, 092, 116) can run alongside implementation. DoD-R is applied per task, so TASK-110 is an audit, not the first check.

---

## 9. Risks

| # | Risk | Likelihood / Impact | Mitigation | Tasks |
|---|------|---------------------|------------|-------|
| R1 | Frontend is complete against mocks while the new backend does not exist; "done" can be mistaken for "shippable". | High / High | Contract export and conformance suite; cutover tasks explicitly blocked; status reporting separates mock-complete from shippable. | 022, 092, 106 |
| R2 | Contract drift: the new backend implements something slightly different from the mocks. | Medium / High | Single exported contract, conformance suite runnable against a base URL, FEAT-000 cross-references. | 004, 022, 092 |
| R3 | Tailwind v4 needs recent browsers (Safari 16.4+, Chrome 111+). | Medium / High | Decide floor in ARCH-001; WebKit and older-Chrome testing. | 002, 009, 096 |
| R4 | Reference hot-links Google Fonts and Unsplash; licences unclear; no logo file. The `next/image` host is now decided (Supabase Storage, Q16 resolved) and must be added to `remotePatterns`. | High / Medium | Asset inventory, `next/font`, local images, `remotePatterns` for Supabase Storage. | 005, 011, 032, 115 |
| R5 | Admin complexity on mobile (builder, CMS, pairings, media). | High / High | Shared patterns, ResponsiveTable, one-step builder, early mobile E2E. | 031, 069, 077, 085, 095, 096 |
| R6 | Registration/payment correctness (duplicates, trusting browser). | Medium / Critical | Pure resolver with exhaustive tests; server-authoritative reads; scenario tests; security review. | 055, 057, 059, 101 |
| R7 | Hero type floor may overflow at 320. | Medium / Medium | Verify in tokens task; floor change only with design sign-off. | 010, 040 |
| R8 | Refresh token in browser storage is exposed to XSS. | Medium / Medium | Accepted (Q2); CSP, no tokens in URLs or logs, short-lived access token, XSS review of CMS and JSON-LD. The single-origin `/api` rewrite lets the token move to an httpOnly cookie later. | 006, 023, 101 |
| R9 | Event Room reliability on poor venue networks. | Medium / High | Deduplicated visibility-aware polling, offline banner, manual refresh. | 062, 064 |
| R10 | Repo guidance conflicts mislead engineers. | High / Medium | TASK-003 before any build task. | 003 |
| R11 | Scope size (123 tasks); fidelity drift. | Medium / Medium | Shared primitives, token lint, visual QA, DoD-S. | 008, 098 |
| R12 | Slug rules are enforced only by the new backend; duplicate or mutable slugs break URLs and SEO. | Medium / High | Slug requirements in the contract, builder slug UX, conformance tests. | 004, 017, 078, 092 |
| R13 | **ISR staleness**: published, cancelled or sold-out changes not reflected promptly; volatile data baked into HTML. | Medium / High | Tag design and webhook contract; volatile data via client island; revalidation tests; time-based safety net. | 043, 113, 114, 116 |
| R14 | Cutover destroys the only working site if the gate is skipped. | Low / Critical | Explicit gate, git tag, parallel preview, rollback plan. | 106, 107 |
| R15 | Applying the skill inconsistently across server and client (for example module state leaking between requests, over-wide RSC props). | Medium / High | Lint boundary rules, concurrency isolation test for mocks, serialization size evidence, TASK-110 audit. | 008, 018, 110 |
| R16 | Bundle regressions go unnoticed. | Medium / Medium | Budget check in `npm run check`, lint bans, analyzer evidence, TASK-110. | 007, 008, 099, 110 |
| R17 | **Hosting topology** (decided in v3): ISR persistence, image optimisation, rewrite and revalidation behaviour on Vercel must be confirmed; Vercel Pro is required for commercial use; the Vercel-to-Railway rewrite adds a hop and Railway must be reachable from Vercel `sin1`. | Low / Medium | TASK-115 records and verifies the topology; TASK-105 verifies it on staging; region pinning (`sin1`, Railway Singapore, Supabase Singapore) keeps latency low. | 115, 105 |
| R18 | Server/client confusion makes public pages accidentally dynamic (reading cookies/headers in layouts) and loses prerendering. | Medium / High | DoD-P, build-output assertion, raw-HTML tests. | 013, 036, 116 |
| R19 | Revalidation endpoint abuse (forged or replayed requests). | Low / High | HMAC, timestamp window, idempotency, secret in server env only (shared with Railway, never in client code), security review. | 006, 114, 101 |
| R20 | **Database region move and Supabase exposure** (v3): the Seoul to Singapore dump/restore can lose or corrupt data; Supabase's auto-generated REST API exposes tables if RLS is off; transaction-mode pooler breaks server-side cursors; no backups before real payments. | Medium / High | TASK-117 runbook with reconciliation and rollback, RLS with no policies (or API disabled) checklist, pooler and cursor note in TASK-115, paid plan with daily backups before real payments, separate staging project. | 117, 115 |

## 10. Rollout and Cutover Notes

- **Mock-backed until the new backend exists.** `web/` is built, previewed and tested against mocks beside the unchanged legacy app. Nothing in `src/` changes until TASK-107.
- **Cutover is deferred.** TASK-105 to 109 are `blocked` on a **new backend plan (out of scope)**. Hosting (Q15) no longer blocks TASK-105. The explicit user-approval gate (TASK-106) before deleting legacy `src/` stays.
- **Launch-gating items (v5, SEC-001 follow-ups):** before cutover (TASK-105/106), verify: cookie-mode required (OD-01, TASK-125 scaffold); Report-Only CSP clean run on staging (OD-03, TASK-105/120); Vercel Firewall rate limits configured (TASK-126); Deployment Protection on previews (TASK-126); security reviewer sign-off (TASK-101). These are distinct from the backend plan blocker.
- **Feature flags** (`feature_flag: true`): `NEXT_PUBLIC_USE_MOCKS` (never true on the production domain), `NEXT_PUBLIC_GOOGLE_AUTH`, `NEXT_PUBLIC_RAZORPAY_ENABLED`, `NEXT_PUBLIC_CONTACT_MODE`. Server-only: `API_INTERNAL_URL`, `REVALIDATE_SECRET`.
- **Environments (v3):** production, staging (separate Railway environment and Supabase project) and Vercel previews (mock mode by explicit opt-in). Details in TASK-115.
- **Migration:** no application data migration in this plan; only code removal at TASK-107. The Supabase database region move (Seoul to Singapore) is an owner-run operational task described in TASK-117; legacy-data migration into a new model belongs to the new backend plan.
- **Order when unblocked:** 115 (hosting note; can be done as soon as ARCH-001 exists) → 105 (deploy config, staging, Firewall, Deployment Protection) → 106 (user approval) → 107 (remove legacy) → 108 (docs) → 109 (smoke).
- **Rollback:** before 107, do not switch traffic. After it, redeploy the previous artifact or the tagged commit and purge the ISR cache per the runbook.
- **Backend coordination when unblocked:** the new backend must call the revalidation webhook on publish; the shared `REVALIDATE_SECRET` and `API_INTERNAL_URL` must be configured per environment in Vercel and Railway. No CORS configuration is needed because the browser reaches the API through the Vercel `/api/`* rewrite; Razorpay webhooks are configured to hit Railway directly. Backend must implement webhook types for player and result changes (TASK-127).

## 11. Open Questions

Resolved questions keep their number and show the resolution.

| # | Question | Status |
|---|----------|--------|
| Q1 | What ships at cutover? | **Resolved.** The whole codebase (backend too) is being replaced; no sliced cutover against current Django. Phase 8 deferred and blocked on a new backend plan (out of scope). The frontend ships against mocks until then; the user-approval gate before deleting `src/` stays. FEAT-000 inventory feeds the backend contract. |
| Q2 | Token storage. | **Resolved.** Refresh token in browser storage is acceptable. Keep short-lived in-memory access token, CSP, no tokens in URLs or logs; TASK-006 confirms. Cookie-first blocker removed. |
| Q3 | Old-site parity (Gallery page, leaderboard, CSV export). | **Resolved: dropped.** Event gallery/recap stays. |
| Q4 | Event URLs: slug vs UUID. | **Resolved: slugs** (delegated). New backend exposes unique `slug`, immutable once published, on events and stories; UUID internal. Recorded in the contract (TASK-004, 016, 017). |
| Q5 | Password rules. | **Superseded.** Password policy belongs to the new backend; the frontend renders the rules from the contract. Carry into the contract notes. |
| Q6 | Builder editing and draft persistence. | **Open (default assumed).** Default: the builder is reused at `/admin/events/[id]/edit` and drafts persist server-side per the contract. Confirm or veto. |
| Q7 | Hosting and SEO / SPA acceptable? | **Resolved: prerendering required.** Next.js App Router, ISR with on-demand revalidation, metadata/OG/JSON-LD, sitemap, robots. Hosting/runtime was split out as Q15, now resolved. |
| Q8 | Story detail pages. | **Resolved (v4, ARCH-001 OQ-01 approved).** Story detail at `/stories/[slug]` prerendered with closed block model, in sitemap. Added TASK-118. |
| Q9 | Content approvals (legal wording, CMS copy, photography). | **Open.** Owner to be named. |
| Q10 | Final repo layout after cutover (`web/` vs root; keep or archive `Frontend reference/`). | **Open.** Not urgent while cutover is blocked. |
| Q11 | Browser floor for Tailwind v4. | **Resolved (v4, owner approval 2026-10-21).** Last two versions of Chrome, Edge, Firefox, Safari; iOS Safari 16.4+; Chrome Android 111+. Uses `browserslist` and banned APIs per ARCH-001 section 5.2. |
| Q12 | Contact delivery and analytics. | **Open.** Neither is planned. |
| Q13 | Who may submit match results (player, host, both)? | **Resolved (v4, ARCH-001 OQ-02 approved).** Results flow: player submits, opponent or host confirms, admin resolves per capability flags. UI follows server flags. |
| Q14 | Veto any proposal P1 to P11? | **Resolved: no vetoes.** Treated as approved except where superseded by Next.js (router, P5 fonts, P10 layout). |
| **Q15** | **Hosting/runtime for Next.js.** | **Resolved (v3, owner-confirmed).** Next.js on Vercel (Pro plan for commercial use), functions pinned to Singapore (`sin1`). Backend on Railway, Southeast Asia (Singapore): API, worker and scheduler/cron services. Database: Supabase Postgres moving from Seoul to a new Singapore (ap-southeast-1) project, via the connection pooler (transaction mode; Django must disable server-side cursors), paid plan with daily backups before real payments. Environments: production, staging (separate Railway environment and Supabase project) and Vercel previews. Browser calls `/api/`* through a Vercel rewrite to Railway (single origin, no CORS); Razorpay webhooks go straight to Railway; Django-to-Vercel revalidation uses the HMAC-signed `/api/revalidate` route with a shared secret. Supabase's auto-generated REST API is locked down (RLS with no policies, or disabled). Documented by TASK-115; database move and lockdown by TASK-117. No longer blocks TASK-115 or TASK-105. |
| **Q16** | **Image hosting/CDN** for `next/image`. | **Resolved (v3, owner-confirmed).** Media uploads use Supabase Storage; its host goes into `next/image` `remotePatterns` (TASK-005, TASK-032, TASK-115). |
| **Q17** | **Draft preview mechanism** for CMS and unpublished events. | **Resolved (v4, ARCH-001 DEC-007 approved).** Next `draftMode` with single-use backend token exchange; mock-only route in mock mode; fallback `(preview)` group. Added TASK-119. |
| OD-01 | Public CSP risk (script-capable on public pages while refresh token in localStorage). | **Resolved (v5, owner decision 2026-10-22).** ACCEPTED for mock-backed build (localStorage with NEXT_PUBLIC_USE_MOCKS guard; no real tokens exist). For launch, REQUIRED: httpOnly cookie refresh token (Secure, SameSite=Strict, /api/auth, CSRF header) as target design. Frontend supports both modes behind browser/tokens.ts (TASK-125). Compensating controls: server reuse detection, no admin token in localStorage, 12h admin cap, step-up re-auth for refund/export, Report-Only CSP clean run, dated commitment to cookie move (TASK-006, SEC-001 OD-01 recommendation). |
| OD-02 | Draft mode isolation check. | **Open (v5).** Verify static output survives isolated `draftMode()` reads in scaffold (TASK-007). Fallback is `(preview)` group. |
| OD-03 | CSP browser verification. | **Open (v5).** Verify static public CSP empirically in real browser (TASK-007, TASK-120 Playwright smoke test, OD-03). Report-Only clean run on staging (TASK-105). |
| OD-04 | Font coverage. | **Open (v5).** Does `next/font/google` provide axes, weights and `₹` glyph (TASK-011)? Decide Google vs local. |
| OD-05 | Bundle budgets. | **Open (v5).** Final numbers after real scaffold baseline (TASK-007). |
| OD-06 | Global replay protection. | **Resolved (v5, owner decision 2026-10-22).** ACCEPTED per-instance dedupe (idempotent operation, 300s window, bounded replay). Enhancements: event id inside HMAC, duplicate returns 202, Vercel Firewall rate limit (TASK-126), strict format checks (TASK-124/ARCH-001 v2), tight timestamp (60s forward). Ask backend for monotonic version per entity (ARCH-001 section 31, AC-15). |
| OD-07 | Vercel constraints. | **Open (v5).** Confirm Node 24, ISR persistence, rewrite limits (TASK-115). |
| OD-CI-01 | Contract stub server location. | **Open (v6, TASK-129).** OPS-002 risk RISK-CI-03: production-profile build needs a backend at build time (ARCH-001 7.6), so CI needs a contract stub. Options: (a) implement as a separate deliverable in TASK-129, (b) fold into TASK-092 (contract conformance tests), (c) defer to backend plan. Recommend (a), in-repo small Node stub with a Dockerfile for staging/local runs. |
| OD-CI-02 | Minimum release age and security-fix exception floor. | **Open (v6, TASK-129).** OPS-002 section 6.3: proposed 7 days minimum release age with security-fix exception at 1 day. |
| OD-CI-03 | Patch SLA. | **Open (v6, TASK-129).** OPS-002 section 5.2: proposed 2/7/30 days for critical/high/moderate; framework security releases 3 days. |
| OD-CI-04 | Reviewer model. | **Open (v6, TASK-129).** For a small team: require second reviewer on main PRs, or accept bypass actor with post-hoc review and quarterly audit. |
| OD-CI-05 | Direct-dependency pinning policy. | **Open (v6, TASK-129).** ARCH-001 DEC-002 and OPS-002: exact versions or tilde (`~`) ranges for Next, React, Tailwind, Radix? |
| OD-CI-06 | Separate Vercel project for web/. | **Open (v6, TASK-129).** OPS-002 DEC-CI-09: recommended to separate `web/` project from legacy project, preventing env/region/domain changes from affecting live legacy deployment. |
| OQ-18 | (FEAT-000) Does the new backend extend the current Django app or is it rebuilt? | **Resolved 2026-10-23: extend the existing Django app** (`backend/`), local PostgreSQL for development, backend work starts after the main frontend pages. Known legacy defects (SEC-001 annex A L-1 to L-16) must be fixed as part of that work. |

## 12. References

- `Frontend reference/` (screens, `SCREEN-MAP.csv`, `route-manifest.json`, `design-tokens.json`, `assets/styles.css`, `docs/*`), especially UI-SPECIFICATION, COMPONENT-CATALOG, SCREEN-INVENTORY, RESPONSIVE-BEHAVIOR, UI-STATES, ACCESSIBILITY, STATE-MACHINES, UX-FLOWS, FRONTEND-BACKEND-INTEGRATION, BACKEND-CONTRACT, ROUTE-DATA-MATRIX, TEST-PLAN, VISUAL-QA, PAYMENTS, AUTH-SECURITY.
- `docs/requirements/FEAT-000-feature-inventory.md` (pending; written by the product-manager; source for the backend contract and handoff; precursor to FEAT-001). Version 2 records the hosting decisions (OQ-06).
- `.claude/skills/react-best-practices/` (`SKILL.md`, `AGENTS.md`, `rules/*.md`): governing React performance and quality standard; rule ids cited in task criteria.
- `docs/decisions/2026-09-15-unified-api-response-envelope.md` (target response contract).
- `backend/` (legacy Django): reference for field semantics only; not a target.
- `templates/plan.md`, `templates/task.md`, `schemas/plan.schema.yaml`, `schemas/task.schema.yaml`, `.claude/agents/planner.md`, `.claude/rules/30-planning.mdc`, `40-frontend.mdc`, `00-team.mdc`.

## 13. Validation Notes

- `plan.schema.yaml`**:** the front matter carries `id`, `type`, `feature_id`, `architecture_id`, `version` (4), `status` (draft), `tasks` (123 entries, each with `id` matching `TASK-[0-9]{3,}`, `title`, `owner` from the enum, `status` from the enum, plus `description`, `dependencies`, `risk` and optional `parallel_group`), `critical_path`, `parallel_groups` and `rollout`. Checked by hand against the schema: this planner has no execution tool, so please run a validator (for example `ajv` or `python -m jsonschema`) on the front matter before moving status to `ready`. Dependencies were re-checked after v4 changes (new tasks 118-123 added with correct dependencies; TASK-120 added to critical path).
- `task.schema.yaml`**:** the seven long-form files (`TASK-010`, `-014`, `-057`, `-062`, `-064`, `-077`, `-085`) now use the schema's field names and object forms (`acceptance_criteria` as `{id, description}`, `tests_required` as `{type, description}` with types from the schema enum, `implementation_notes` as an array of strings, `risk`, `blockers`, `verification`). They also carry non-schema keys `estimate` and `parallel_group` in the front matter because the schema has no estimate field; if the validator rejects unknown keys, remove those two lines. `TASKS-P0-P2.md`**,** `TASKS-P3-P5.md` **and** `TASKS-P6-P8.md` **are narrative companions, not schema documents.** `templates/task.md` is an older shape (`T-XXX` ids) and was not followed where it conflicts.
- **Owner enum:** `workflow-controller` is not in the enum; TASK-104 is owned by `architect`.
- **Status is** `draft` (not `ready`) because ARCH-001 is draft pending owner review (OD-01/OD-06); FEAT-001 is approved. Plan stays draft until all architecture decisions are approved and all ready-state tasks are confirmed dependable.
