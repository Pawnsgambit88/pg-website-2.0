# PLAN-001 v3 Task Details: Phases 6 to 8 (TASK-069 to TASK-110)

Narrative companion to `docs/plans/PLAN-001-frontend-rewrite.md` (version 3). Not a `task.schema.yaml` document; the schema-shaped files are `TASK-077` and `TASK-085` in this folder. DoD-S, DoD-G and DoD-R (Next.js edition) are in section 3 of the plan. "RBP" = `.claude/skills/react-best-practices`. Est = S/M/L. Paths relative to `C:\work\PG_Website`.

**Conventions:** The admin area is `(admin)`, client-rendered behind auth, `noindex`, using TanStack Query. Route pages are thin Server Components that pass only ids and primitive strings to client features (`server-serialization`). Heavy editors load with `next/dynamic`. Every screen-bearing task also meets DoD-S. Data comes through `PgAdminApi` and the mock adapter; the new backend must satisfy that contract (TASK-022 export). FEAT-000 (`docs/requirements/FEAT-000-feature-inventory.md`, pending) is the product feature source.

## Phase 6: Admin

### TASK-069 Admin patterns
- **Owner:** frontend-engineer | **Est:** M | **Risk:** medium | **Status:** pending
- **Goal:** `SplitWorkspace` (side by side at 960px+; on mobile master-detail navigation with back, never a cramped two-pane), `FilterBar`, `SaveBar` (dirty / saved / published / validation-blocked / conflict; sticky bottom on mobile with safe area), `ConfirmAction` (consequence copy, pending/success/failure), `UnsavedChangesGuard` (in-app navigation via a Next router wrapper plus `beforeunload`).
- **Dependencies:** TASK-027, TASK-029, TASK-030, TASK-031, TASK-038
- **Files:** `web/src/features/admin/patterns/*` (no barrel)
- **Notes (RBP):** SaveBar subscribes to a derived `status`, not the whole form (`rerender-derived-state`); selection kept in the URL or a ref so rows do not re-render on selecting another row (`rerender-memo`).
- **Acceptance:** [ ] SaveBar renders every CMS state in `docs/UI-STATES.md` and is shown on `/handoff/states` [ ] SplitWorkspace has no horizontal scroll at 320 and preserves selection on back [ ] unsaved-changes guard works for in-app navigation and tab close
- **Tests:** component tests; Playwright 320/1024

### TASK-070 Admin dashboard (screen 32)
- **Owner:** frontend-engineer | **Est:** M | **Risk:** low | **Status:** pending
- **Goal:** `/admin` today/next event with operational status, attention list (payments, CMS, content), CMS health, "no upcoming event".
- **Dependencies:** TASK-020, TASK-034, TASK-038
- **Files:** `web/src/app/(admin)/admin/page.tsx`, `web/src/features/admin-dashboard/*`
- **Notes (RBP):** three independent queries start together, each section in its own `Suspense` boundary (`async-parallel`, `async-suspense-boundaries`).
- **Acceptance:** [ ] DoD-S incl. no upcoming event, nothing needs attention, capacity warning, payment mismatch, error [ ] every alert links to the screen that resolves it [ ] no waterfall in the trace
- **Tests:** component tests; Playwright

### TASK-071 Media library and upload (screen 34, assets)
- **Owner:** frontend-engineer | **Est:** M | **Risk:** medium | **Status:** pending
- **Goal:** `/admin/media` asset grid with lazy thumbnails, search, missing-alt filter, upload (picker; drag and drop on desktop; camera roll on mobile) with client MIME/size validation, per-file progress, interrupted-upload retry, asset detail (alt, credit/rights, dimensions).
- **Dependencies:** TASK-020, TASK-032, TASK-069
- **Files:** `web/src/app/(admin)/admin/media/page.tsx`, `web/src/features/media/{Library,UploadButton,AssetDetail}.tsx`
- **Notes (RBP):** grid tiles use `cv-auto`; thumbnails requested at tile size; per-tile upload progress held in refs or the query cache so one file's progress does not re-render the grid (`rerender-use-ref-transient-values`); search via `useDeferredValue`. (v3: uploaded media is stored in Supabase Storage; the upload path, API versus signed upload URL, is fixed in TASK-115.)
- **Acceptance:** [ ] DoD-S incl. empty library, uploading, failed/interrupted, invalid type/oversize, missing alt [ ] phone upload works (`accept="image/*"`), progress announced, retry without re-picking [ ] 44px actions, no hover-only controls [ ] 500-asset fixture scrolls without long tasks
- **Tests:** component tests (validation, retry); Playwright file upload

### TASK-072 Media collection editor and focal point (screen 34, collection)
- **Owner:** frontend-engineer | **Est:** L | **Risk:** high | **Status:** pending
- **Goal:** Display mode (static/carousel), ordering with keyboard-accessible reorder (drag plus up/down buttons), autoplay and interval, per-asset alt, focal point picker (tap/click, large touch area, numeric inputs, arrow nudge) with live crop previews at hero, card and square, 0/1-item degrade preview. Focal point values feed `object-position` in TASK-032.
- **Dependencies:** TASK-033, TASK-071
- **Files:** `web/src/features/media/{CollectionEditor,FocalPointPicker,Reorder}.tsx`
- **Notes (RBP):** drag-and-drop and focal-point code loaded with `next/dynamic` when the editor opens (`bundle-conditional`); pointer move handlers are passive and write to refs/CSS variables, committing React state on pointer up (`rerender-use-ref-transient-values`, `client-passive-event-listeners`).
- **Acceptance:** [ ] DoD-S incl. empty collection, 1 item degrades to static, interval validation, save failure [ ] reorder achievable without drag [ ] focal point settable by touch at 320 (44px targets) and keyboard [ ] autoplay option warns that reduced-motion visitors will not autoplay [ ] editor code absent from the media list chunk until opened
- **Tests:** component tests (reorder, focal math); Playwright 390 touch

### TASK-073 Website CMS (screen 33)
- **Owner:** frontend-engineer | **Est:** L | **Risk:** high | **Status:** pending
- **Goal:** `/admin/content` section navigator (Home Hero, Upcoming, First Visit, Community, Story, Final CTA, Navigation, Footer), structured field editor with guidance, media collection selector, preview link, SaveBar states (draft/dirty/validation/saved-not-published/published/conflict), version history, protected-composition note. Mobile: section picker, then editor, then separate preview. **Publishing calls the contract's publish method; the new backend then calls the revalidation webhook (TASK-113). In mock mode the mock publish calls the dev trigger from TASK-114.**
- **Dependencies:** TASK-020, TASK-069, TASK-072, TASK-114
- **Files:** `web/src/app/(admin)/admin/content/page.tsx`, `web/src/features/cms/*`
- **Notes:** plain text or constrained markup only, never raw HTML. Draft preview needs a draft-aware read (a preview route in `(handoff)` or `draftMode`, decided in ARCH-001). Each section editor loaded with `next/dynamic`; form state per section (`rerender-split-combined-hooks`, `rerender-defer-reads`).
- **Acceptance:** [ ] DoD-S incl. clean/published, dirty, validation blocked, saved not published, published, conflict, missing alt, load error [ ] publish blocked with specific reasons [ ] conflicting edit offers resolve, never silent overwrite [ ] unsaved changes prompt [ ] only the opened section's editor chunk is requested [ ] mock publish makes the public Home change in raw HTML without redeploy (with TASK-116)
- **Tests:** component tests per SaveBar state; Playwright journey (replace hero, switch to carousel, publish)

### TASK-074 Stories admin (screen 35)
- **Owner:** frontend-engineer | **Est:** M | **Risk:** medium | **Status:** pending
- **Goal:** `/admin/stories` list via ResponsiveTable and editor (title, **slug with availability check and immutability once published**, type, body, media, featured), create/edit/publish/unpublish, media-missing validation.
- **Dependencies:** TASK-020, TASK-031, TASK-069, TASK-072
- **Files:** `web/src/app/(admin)/admin/stories/page.tsx`, `web/src/features/stories-admin/*`
- **Acceptance:** [ ] DoD-S incl. empty, draft, published, media missing, save/publish failure [ ] slug is editable only while draft and shown read-only once published with an explanation [ ] published stories unpublished or archived before deletion
- **Tests:** component tests; Playwright

### TASK-075 Testimonials admin (screen 36)
- **Owner:** frontend-engineer | **Est:** M | **Risk:** medium | **Status:** pending
- **Goal:** `/admin/testimonials` metric strip, editor rows (photo, name, descriptor, exact quote, consent record, sort order), publish blocked unless quote + photo + consent, live preview using the public layout rule (1 to 3 grid; 4+ carousel).
- **Dependencies:** TASK-020, TASK-069, TASK-071
- **Files:** `web/src/app/(admin)/admin/testimonials/page.tsx`, `web/src/features/testimonials-admin/*`
- **Acceptance:** [ ] DoD-S incl. empty, incomplete, missing consent, publishable, publish failure [ ] publish disabled with visible text naming exactly what is missing [ ] a fourth published testimonial switches the preview to the carousel
- **Tests:** component tests (gating matrix); Playwright

### TASK-076 Admin events list (screen 37)
- **Owner:** frontend-engineer | **Est:** M | **Risk:** low | **Status:** pending
- **Goal:** `/admin/events` filters (draft, open, live, completed, cancelled) via Tabs, ResponsiveTable (Event, Date, Type, Capacity, Price, Pairing, Status), search, "New event", row opens the Control Room.
- **Dependencies:** TASK-020, TASK-030, TASK-031, TASK-038
- **Files:** `web/src/app/(admin)/admin/events/page.tsx`
- **Notes (RBP):** filter computed in render from one cached list; row hover/focus prefetches the Control Room route (`next/link` prefetch) and event query.
- **Acceptance:** [ ] DoD-S incl. no events, filter with no results, loading, error [ ] at 390 each event is a labelled stacked row with capacity and status and a reachable primary action [ ] switching filters causes no refetch when cached
- **Tests:** component tests; Playwright

### TASK-077 Event Builder framework **[schema-form task file]**
- **Owner:** frontend-engineer | **Est:** L | **Risk:** high | **Status:** pending
- **Goal/notes/criteria:** see `docs/plans/FEAT-001/TASK-077.md`. Summary: 8 steps, split form state, deferred preview, one step at a time on mobile, slug proposal and uniqueness check.
- **Dependencies:** TASK-020, TASK-027, TASK-029, TASK-030, TASK-034, TASK-069

### TASK-078 Builder steps 1-2: Basics and Experience (screens 38, 39)
- **Owner:** frontend-engineer | **Est:** M | **Risk:** low | **Status:** pending
- **Goal:** Basics (title, **slug**, type, city, area, venue, starts, ends, summary) and Experience (first-timer welcome, hospitality, what to expect, audience).
- **Dependencies:** TASK-077
- **Files:** `web/src/features/event-builder/steps/{Basics,Experience}.tsx`
- **Acceptance:** [ ] DoD-S incl. empty, validation, loaded draft [ ] slug auto-suggested from the title, editable until publish, with uniqueness feedback, and locked after publish [ ] date/time inputs usable on mobile (native pickers, 16px), end after start, not past for publish
- **Tests:** component tests; Playwright

### TASK-079 Builder steps 3-4: Registration and Payment (screens 40, 41)
- **Owner:** frontend-engineer | **Est:** M | **Risk:** medium | **Status:** pending
- **Goal:** Registration (capacity, window, waitlist on/off, eligibility) and Payment (free/paid, price, member price, refund policy link, provider status).
- **Dependencies:** TASK-077
- **Files:** `web/src/features/event-builder/steps/{Registration,Payment}.tsx`
- **Acceptance:** [ ] DoD-S incl. free vs paid, provider not connected warning, validation [ ] rupees entered, stored as integer paise, no float arithmetic [ ] paid event cannot be ready when payments are not connected
- **Tests:** money unit tests; component tests

### TASK-080 Builder steps 5-6: Game system and Media (screens 42, 43)
- **Owner:** frontend-engineer | **Est:** M | **Risk:** medium | **Status:** pending
- **Goal:** Game system (pairing method per type, rounds, time control, rating pool, no FIDE-compliance claim) and Media (event collection via the TASK-072 editor).
- **Dependencies:** TASK-072, TASK-077
- **Files:** `web/src/features/event-builder/steps/{GameSystem,EventMedia}.tsx`
- **Acceptance:** [ ] DoD-S incl. type-specific fields, no media, validation [ ] only mechanics relevant to the type shown [ ] missing alt blocks ready-to-publish
- **Tests:** component tests; Playwright

### TASK-081 Builder steps 7-8: Communications and Review/publish (screens 44, 45)
- **Owner:** frontend-engineer | **Est:** M | **Risk:** medium | **Status:** pending
- **Goal:** Communications (confirmation, reminder, check-in templates and channels) and Review (public preview, issues checklist linking to steps, "Ready to publish", Publish with confirm, Save draft). Review also shows the **SEO preview** (title, description, canonical URL, OG image) the public page will use.
- **Dependencies:** TASK-077, TASK-112
- **Files:** `web/src/features/event-builder/steps/{Communications,Review}.tsx`
- **Acceptance:** [ ] DoD-S incl. issues present, ready, publishing, publish failure, published [ ] every issue links to and focuses the offending field [ ] publish confirmation names what becomes public and the public URL [ ] SEO preview matches `buildMetadata` output
- **Tests:** component tests; journey in TASK-095

### TASK-082 Event Control Room frame (screens 46 to 53 shell)
- **Owner:** frontend-engineer | **Est:** M | **Risk:** medium | **Status:** pending
- **Goal:** `/admin/events/[id]/[tab]` header, summary strip (2x2 on mobile), eight route-linked tabs, shared event query, per-tab lazy code, not-found/forbidden.
- **Dependencies:** TASK-020, TASK-030, TASK-034, TASK-038, TASK-076
- **Files:** `web/src/app/(admin)/admin/events/[id]/[tab]/page.tsx`, `web/src/features/event-control/{ControlFrame,SummaryStrip}.tsx`
- **Notes (RBP):** one shared event query key across tabs (dedup); summary strip subscribes via `select` to counts only; tab content loaded with `next/dynamic`; tab links are `next/link` (prefetch).
- **Acceptance:** [ ] DoD-S incl. loading, unknown event, error, each status [ ] all eight tabs reachable by touch at 320 and keyboard [ ] tab content lazy, active tab deep-linkable [ ] switching tabs does not refetch the shared event
- **Tests:** component tests; Playwright 320

### TASK-083 Control: Overview and Registrations (screens 46, 47)
- **Owner:** frontend-engineer | **Est:** M | **Risk:** low | **Status:** pending
- **Goal:** Run-of-show timeline with owners, pairing engine summary; registrations ResponsiveTable (player, rating, first-time, payment, registration status, actions), filters, counts.
- **Dependencies:** TASK-031, TASK-082
- **Files:** `web/src/features/event-control/{Overview,Registrations}.tsx`
- **Acceptance:** [ ] DoD-S incl. none, filter empty, loading, error, near-full capacity warning [ ] at 390 row shows player, status, payment with reachable actions [ ] 300-row fixture uses `cv-auto` with no long tasks
- **Tests:** component tests; Playwright

### TASK-084 Control: Check-in desk, phone-first (screen 48)
- **Owner:** frontend-engineer | **Est:** M | **Risk:** medium | **Status:** pending
- **Goal:** Search by name, phone or registration ID; one-tap check in with undo; counters; host queue with "Mark welcomed"; designed for one-handed phone use.
- **Dependencies:** TASK-027, TASK-082
- **Files:** `web/src/features/event-control/CheckinDesk.tsx`
- **Notes (RBP):** search filters the cached registration list via `useDeferredValue` with a pre-built lookup map (`js-index-maps`, `js-set-map-lookups`); polling shares one request like the Event Room.
- **Acceptance:** [ ] DoD-S incl. no results, already checked in, failure, offline [ ] results reachable by thumb, 48px actions, check-in without opening detail [ ] counts update only after server confirmation; offline blocks with clear copy [ ] typing stays responsive with a 500-registration fixture
- **Tests:** component tests; Playwright 390 touch

### TASK-085 Control: Pairings and rounds **[schema-form task file]**
- **Owner:** frontend-engineer | **Est:** L | **Risk:** high | **Status:** pending
- **Goal/notes/criteria:** see `docs/plans/FEAT-001/TASK-085.md`. Summary: round lifecycle, board cards on mobile, edit dialog, results review, publish and finalise confirmations.
- **Dependencies:** TASK-029, TASK-031, TASK-082

### TASK-086 Control: Payments tab (screen 50)
- **Owner:** frontend-engineer | **Est:** S | **Risk:** low | **Status:** pending
- **Goal:** Event payments table (Player, Amount, Status, Provider ID, Updated) with totals; gated, confirmed refund action.
- **Dependencies:** TASK-031, TASK-082
- **Files:** `web/src/features/event-control/Payments.tsx`
- **Acceptance:** [ ] DoD-S incl. none, free event, mismatch, loading, error [ ] provider IDs mono, copyable, wrap at 320 [ ] status is text plus colour [ ] totals computed in one pass (`js-combine-iterations`)
- **Tests:** component tests

### TASK-087 Control: Messages (screen 51)
- **Owner:** frontend-engineer | **Est:** M | **Risk:** medium | **Status:** pending
- **Goal:** Audience selection, templates, composer, send with confirmation, delivery results with partial failure and per-channel health.
- **Dependencies:** TASK-027, TASK-082
- **Files:** `web/src/features/event-control/Messages.tsx`
- **Acceptance:** [ ] DoD-S incl. no channel connected, sending, sent, partial failure with retry for failed recipients, error [ ] send confirms audience size; message stored first, delivery honest
- **Tests:** component tests; Playwright

### TASK-088 Control: Gallery and recap, Audit (screens 52, 53)
- **Owner:** frontend-engineer | **Est:** M | **Risk:** low | **Status:** pending
- **Goal:** Gallery uploader (reusing the media library/collection editor), recap editor, publish to archive (triggers revalidation of the archive page via the contract); Audit ResponsiveTable (time, actor, action, object) with filters and an audit-unavailable state (safe read-only; blocks unverifiable sensitive mutations). This is the event gallery/recap from the reference design, not the dropped legacy Gallery page.
- **Dependencies:** TASK-031, TASK-071, TASK-082
- **Files:** `web/src/features/event-control/{GalleryRecap,Audit}.tsx`
- **Acceptance:** [ ] DoD-S incl. no gallery, recap draft vs published, audit empty, audit unavailable [ ] audit is read-only [ ] audit rows use `cv-auto`; 1,000-row fixture without long tasks [ ] publishing the recap updates the public archive page in the mock revalidation test
- **Tests:** component tests

### TASK-089 Players admin (screen 54)
- **Owner:** frontend-engineer | **Est:** M | **Risk:** medium | **Status:** pending
- **Goal:** `/admin/players` search, list (Player, PG rating, Events, Attendance), selected record (history, rating and attendance context, permitted private fields). Desktop master-detail; mobile list then pushed detail.
- **Dependencies:** TASK-020, TASK-031, TASK-069
- **Files:** `web/src/app/(admin)/admin/players/page.tsx`, `web/src/features/players-admin/*`
- **Acceptance:** [ ] DoD-S incl. no results, no selection, loading, error, permission-limited [ ] sensitive fields only where permitted, never in list rows [ ] search responsive (deferred value) with 1,000 players
- **Tests:** component tests; Playwright

### TASK-090 Payments admin (screen 55)
- **Owner:** frontend-engineer | **Est:** M | **Risk:** medium | **Status:** pending
- **Goal:** `/admin/payments` ledger with status filters, reconciliation mismatch banner/rows, "Reconcile provider" with confirm and pending/success/failure; no UI to set payment status by hand.
- **Dependencies:** TASK-020, TASK-031, TASK-038
- **Files:** `web/src/app/(admin)/admin/payments/page.tsx`
- **Acceptance:** [ ] DoD-S incl. empty, mismatch, reconcile in progress, reconcile failure, loading, error [ ] currency right-aligned in table form and labelled in stacked form [ ] ledger rows use `cv-auto`
- **Tests:** component tests; Playwright

### TASK-091 Settings admin (screen 56)
- **Owner:** frontend-engineer | **Est:** M | **Risk:** medium | **Status:** pending
- **Goal:** `/admin/settings` sections (Brand and site, Auth, Ratings, Payments, Notifications, Event defaults), integration status, provider enabled/disabled, save with errors; secrets never rendered or editable.
- **Dependencies:** TASK-020, TASK-027, TASK-069
- **Files:** `web/src/app/(admin)/admin/settings/page.tsx`, `web/src/features/settings/*`
- **Acceptance:** [ ] DoD-S incl. provider disabled, not connected, save failure, dirty [ ] no settings type, form or log contains a secret
- **Tests:** component tests; type test that settings cannot carry secrets

## Phase 7: Cross-cutting QA

### TASK-092 Contract tests for the PgApi and envelope
- **Owner:** test-engineer | **Est:** M | **Risk:** medium | **Status:** pending
- **Goal:** Run the exported contract (TASK-022) against the mock adapter and the shared envelope/error code, and ship a reusable conformance suite the new backend can be pointed at later (`CONTRACT_BASE_URL`). Replaces the former Django-shape contract tests.
- **Dependencies:** TASK-014, TASK-021, TASK-022
- **Files:** `web/src/lib/api/__tests__/contract/*`, `web/scripts/contract-conformance.ts`
- **Acceptance:** [ ] every PgApi method has a conformance test that passes against the mock [ ] the same suite can run against an HTTP base URL [ ] envelope and error-code cases covered [ ] extra response fields tolerated; missing required fields give a typed error
- **Tests:** this task is the tests (contract)

### TASK-093 E2E journeys: public, auth, registration
- **Owner:** test-engineer | **Est:** L | **Risk:** medium | **Status:** pending
- **Goal:** Stranger finds an event, registers (free and paid mock), is sent through login and returned; create account to welcome to registration; reset password; legal and 404.
- **Dependencies:** TASK-009, TASK-040, TASK-042, TASK-043, TASK-050, TASK-051, TASK-059
- **Files:** `web/e2e/journeys/public-*.spec.ts`
- **Acceptance:** [ ] 390 and 1440 in Chromium, 390 in WebKit [ ] each step asserts no horizontal scroll and no serious axe violations [ ] records per-route request waterfalls and script requests for TASK-110
- **Tests:** this task is the tests (e2e)

### TASK-094 E2E journeys: player
- **Owner:** test-engineer | **Est:** M | **Risk:** medium | **Status:** pending
- **Goal:** Newcomer arrives, checks in, sees pairing, submits result, sees completion and rating; regular goes dashboard to next event to rating history; profile edit with unsaved guard.
- **Dependencies:** TASK-009, TASK-060, TASK-061, TASK-063, TASK-064, TASK-065, TASK-067, TASK-068
- **Files:** `web/e2e/journeys/player-*.spec.ts`
- **Acceptance:** [ ] primary viewport 390x844 with live-round essentials assertion [ ] polling transition tested without manual refresh [ ] request log shows one Event Room request per interval
- **Tests:** this task is the tests (e2e)

### TASK-095 E2E journeys: admin
- **Owner:** test-engineer | **Est:** L | **Risk:** medium | **Status:** pending
- **Goal:** Admin builds an event through 8 steps at 390 and 1440, publishes (then the public page and sitemap reflect it), runs the control room (registrations, check-in, pairings draft to publish to finalise); editor replaces hero, switches to carousel, publishes; adds a fourth testimonial; payments reconcile; settings save.
- **Dependencies:** TASK-009, TASK-070, TASK-073, TASK-074, TASK-075, TASK-080, TASK-081, TASK-085, TASK-088, TASK-089, TASK-090, TASK-091, TASK-114
- **Files:** `web/e2e/journeys/admin-*.spec.ts`
- **Acceptance:** [ ] builder journey completed at 390 using only the one-step UI [ ] non-admin denied with the permission state on every admin route [ ] publish-to-public visibility verified
- **Tests:** this task is the tests (e2e)

### TASK-096 Responsive matrix, all routes
- **Owner:** test-engineer | **Est:** M | **Risk:** medium | **Status:** pending
- **Goal:** Table-driven over every route and key scenario at 1440, 1280, 1024, 768, 390, 320: no horizontal scroll, touch targets at least 44px, no clipped primary action, screenshots stored; 200% zoom at 320; landscape phone spot-check for Event Room and check-in desk.
- **Dependencies:** TASK-093, TASK-094, TASK-095
- **Files:** `web/e2e/responsive/*.spec.ts`
- **Acceptance:** [ ] route list generated from the file-system routes so new routes are covered automatically [ ] zero horizontal-scroll failures; target failures triaged with justified exceptions
- **Tests:** this task is the tests (e2e)

### TASK-097 Accessibility audit
- **Owner:** test-engineer | **Est:** M | **Risk:** medium | **Status:** pending
- **Goal:** Axe across all routes and states; manual protocol from `docs/ACCESSIBILITY.md` (keyboard-only, VoiceOver/Safari, NVDA/Firefox or Chrome, 200% zoom, 320px, reduced motion); WCAG 2.2 AA checks (focus not obscured, target size, dragging alternatives, consistent help, accessible authentication).
- **Dependencies:** TASK-093, TASK-094, TASK-095
- **Files:** `docs/reviews/a11y-audit-FEAT-001.md`, `web/e2e/a11y/*.spec.ts`
- **Acceptance:** [ ] no serious or critical automated violations [ ] manual findings recorded with severity [ ] carousel pause, dialog focus return, live regions and reorder alternatives verified manually
- **Tests:** this task is the tests (e2e and manual)

### TASK-098 Visual QA against reference
- **Owner:** test-engineer | **Est:** M | **Risk:** medium | **Status:** pending
- **Goal:** Compare each screen to the reference over the `docs/VISUAL-QA.md` matrix and complete its checklists.
- **Dependencies:** TASK-039, TASK-093, TASK-094, TASK-095
- **Files:** `docs/reviews/visual-qa-FEAT-001.md`
- **Acceptance:** [ ] every checklist item pass or linked finding [ ] token-drift script shows no colour or spacing outside tokens
- **Tests:** manual with evidence

### TASK-110 React best-practices audit, Next.js edition (updated)
- **Owner:** code-reviewer | **Est:** M | **Risk:** medium | **Status:** pending
- **Goal:** Audit the finished `web/` against `.claude/skills/react-best-practices` in its priority order: (1) async waterfalls, (2) bundle size, (3) **server-side performance**, (4) client-side data fetching, (5) re-render, (6) rendering (including hydration), (7) JavaScript, plus selected advanced rules. For this Next.js app `server-*` and Next-specific rules **apply**. Produces `docs/reviews/rbp-audit-FEAT-001.md` (shape per `schemas/review.schema.yaml`) with a per-rule pass/fail/NA table, severity-rated findings and evidence.
- **Dependencies:** TASK-093, TASK-094, TASK-095, TASK-116
- **Files:** `docs/reviews/rbp-audit-FEAT-001.md`, `docs/reviews/rbp-bundle-stats/` (`@next/bundle-analyzer` HTML and the `next build` route-size table)
- **Notes (evidence per category):**
  1. *Waterfalls:* server-side timing traces for Home, Play, Event detail (parallel `generateMetadata` and page work, `React.cache` dedup), Past events; client request-timing traces for Registration, Dashboard, Event Room, Admin dashboard, Control Room; `Suspense` boundaries isolate slow secondary data and stream; no fetch-in-effect; `async-api-routes` checked on `/api/revalidate`.
  2. *Bundle:* `ANALYZE=true next build` report; First Load JS per route against the ARCH-001 budget; no barrel imports (lint report plus grep); `next/dynamic` used for chart, carousel client implementation, drag/focal picker, preview sheet, builder steps, result sheet and paid panel; Razorpay only on the paid panel; TanStack Query absent from `(public)` bundles; mock and handoff absent from production; no duplicated dependencies.
  3. *Server:* every public fetcher is `server-only`, `React.cache`-wrapped and tagged; independent fetches parallel (`server-parallel-fetching`, `server-parallel-nested-fetching`); props crossing the boundary are minimal (`server-serialization`, `server-dedup-props`) with measured RSC payload size per route; static assets and fonts hoisted (`server-hoist-static-io`); **no mutable module-level state written during server render, including the mock layer (`server-no-shared-module-state`), proven by the concurrent-request isolation test from TASK-018**; any Server Action authenticates inside the action (`server-auth-actions`), or the audit records that none exist; `after()` used for non-blocking work in the revalidation handler (`server-after-nonblocking`).
  4. *Client fetching:* one cache entry per key (dedup test results); polling shares one request; passive listeners; versioned storage keys; no tokens in unversioned storage.
  5. *Re-render:* profiler render-count evidence for Event Room, Builder, CMS and Profile; no nested components; derived state not in effects; stable props for memoised rows.
  6. *Rendering:* `cv-auto` on ledgers, tables and archives; hoisted static JSX; ternaries not `&&` on numbers; resource hints (preload hero via `priority`, `preconnect` to API origin where browser-called); **hydration: no mismatch warnings in the dev console on any route, theme or client-only state handled without flicker (`rendering-hydration-no-flicker`), and any `suppressHydrationWarning` justified**.
  7. *JS:* hot paths use maps/sets and single-pass loops; hoisted RegExp/Intl; `toSorted`.
- **Acceptance:** [ ] every rule has pass, fail-with-finding or documented waiver, with NA reasons for rules that genuinely do not apply (for example `rendering-activity` if unused) [ ] route-size table and bundle analyzer report committed [ ] RSC payload size per public route recorded [ ] no open critical/high findings in categories 1 to 3 before TASK-100 closes [ ] findings filed to TASK-100 with rule ids
- **Tests:** review artifact validates against `schemas/review.schema.yaml`

### TASK-099 Performance budget and Lighthouse (consumes TASK-110)
- **Owner:** frontend-engineer | **Est:** M | **Risk:** medium | **Status:** pending
- **Goal:** Measure and enforce the P9 budget using TASK-110 evidence: First Load JS per route (from `next build` output and the analyzer), Lighthouse mobile on Home, Play, Event detail, Login, Dashboard, Event Room; confirm admin and handoff never in public bundles; font payload; hero `priority`/sizing; lazy images; no layout shift; INP in Event Room and Builder; a size check wired into `npm run check` (for example `size-limit` or a script reading the build manifest).
- **Dependencies:** TASK-011, TASK-093, TASK-094, TASK-095, TASK-110
- **Files:** `web/package.json`, `web/scripts/check-budget.ts`, `docs/reviews/perf-FEAT-001.md`
- **Acceptance:** [ ] Home meets LCP under 2.5s, CLS under 0.1, INP under 200ms on the mobile profile (numbers recorded) [ ] budget violations fail the check script [ ] reveal and carousel do not delay first paint [ ] budget values match ARCH-001 and reference the TASK-110 table
- **Tests:** Lighthouse runs recorded; budget check

### TASK-100 Triage and fix QA findings
- **Owner:** frontend-engineer | **Est:** L | **Risk:** medium | **Status:** pending
- **Goal:** Fix blocker and major findings from TASK-096 to TASK-099, TASK-110 and TASK-116. Re-split by area once findings are known; minor items deferred only with product-manager agreement.
- **Dependencies:** TASK-096, TASK-097, TASK-098, TASK-099, TASK-110, TASK-116
- **Files:** as required
- **Acceptance:** [ ] all blocker and major findings closed and retested by the originating suite [ ] deferred items listed with owner and rationale [ ] RBP waterfall, bundle and server findings closed
- **Tests:** rerun E2E, responsive, a11y, SEO and performance suites

### TASK-101 Security review of the web app
- **Owner:** security-reviewer | **Est:** M | **Risk:** high | **Status:** pending
- **Goal:** Final review (`templates/security-review.md`): token handling (confirms Q2 resolution), XSS (CMS/story/testimonial rendering, JSON-LD, URL params), open redirect in `returnTo`, guards UX-only, **revalidation endpoint (HMAC, replay window, secret handling)**, CSP and third-party scripts (Razorpay), server-only secrets not in client bundles, mock and handoff absent from production, `npm audit` and dependency provenance, logging, error messages, `.ics`, upload client validation, Server Actions (if any) authenticate internally.
- **Dependencies:** TASK-006, TASK-092, TASK-100
- **Files:** `docs/reviews/SEC-FEAT-001.md`
- **Acceptance:** [ ] validates against `schemas/security-review.schema.yaml` [ ] no open critical/high at cutover; backend-side findings listed for the backend plan
- **Tests:** security checks per the review

### TASK-102 Code review
- **Owner:** code-reviewer | **Est:** M | **Risk:** medium | **Status:** pending
- **Goal:** Review `web/` against ARCH-001, the web rule, DoD-G and the COMPONENT-CATALOG new-component rule; look for duplicated primitives, `any`, dead code, inconsistent query keys, wrong `'use client'` placement. React performance is covered by TASK-110 and referenced, not repeated.
- **Dependencies:** TASK-092, TASK-100
- **Files:** `docs/reviews/CR-FEAT-001.md`
- **Acceptance:** [ ] validates against `schemas/review.schema.yaml`, verdict recorded, blocking comments resolved
- **Tests:** n/a (review)

### TASK-103 OPTIONAL: installable PWA basics
- **Owner:** frontend-engineer | **Est:** S | **Risk:** low | **Status:** pending
- **Goal:** `app/manifest.ts`, icons (incl. maskable), theme colours from tokens, standalone display, offline fallback page, install handling. No service-worker caching of authenticated API or payment responses; the service worker must not interfere with ISR HTML freshness.
- **Dependencies:** TASK-099, TASK-100
- **Files:** `web/src/app/manifest.ts`, `web/public/icons/*`, `web/public/sw.js`, `web/src/pwa/*`
- **Notes (RBP):** service-worker registration deferred until after first paint/idle (`js-request-idle-callback`, `bundle-defer-third-party`).
- **Acceptance:** [ ] Lighthouse installable checks pass; offline navigation shows fallback [ ] service worker never serves stale authenticated, payment or revalidated-HTML data [ ] cutover does not depend on it
- **Tests:** Lighthouse PWA audit; manual offline test

### TASK-104 Workflow readiness gate
- **Owner:** architect | **Est:** S | **Risk:** low | **Status:** pending
- **Goal:** Verify (via workflow-controller; the owner enum has no such value) that FEAT-001 and ARCH-001 are approved, all tasks complete or skipped, QA, SEO verification, RBP audit and reviews passed, and the traceability table is satisfied.
- **Dependencies:** TASK-101, TASK-102
- **Files:** `docs/plans/PLAN-001-frontend-rewrite.md` (status updates)
- **Acceptance:** [ ] all 58 screens verified [ ] no open critical/high review findings [ ] TASK-110 and TASK-116 artifacts present
- **Tests:** n/a (gate)

## Phase 8: Cutover (deferred, blocked on the new backend plan)

**Status for all of Phase 8: `blocked`.** The user is replacing the whole codebase, backend included, so cutover cannot happen against the current Django API. These tasks are kept so the work is not lost, but none may start until a **new backend plan (out of scope for PLAN-001)** delivers an implementation of the `PgApi` contract. Until then `web/` ships against mocks. The explicit user-approval gate before deleting legacy `src/` stays. (v3: the hosting decision is no longer a blocker; see TASK-115.)

### TASK-105 Deployment configuration
- **Owner:** frontend-engineer | **Est:** M | **Risk:** medium | **Status:** blocked
- **Blockers:** new backend plan (out of scope) only. The hosting decision (TASK-115 / Q15) is resolved and documented, so it no longer blocks this task; TASK-115 remains a dependency for its content.
- **Goal:** Per TASK-115 (Vercel production with functions in `sin1`, Railway Singapore backend, Supabase Singapore, staging and preview environments): Vercel project and region config, env split (server vs public, per environment, including `API_INTERNAL_URL` and the shared `REVALIDATE_SECRET`), the `/api/*` rewrite to the Railway API service (one origin, no CORS; `/api/revalidate` stays a local route), `next/image` `remotePatterns` for Supabase Storage, security headers and CSP (self-hosted fonts via `next/font`, Razorpay checkout origin, Supabase Storage image host, nonce strategy for Next inline scripts), HSTS, `Referrer-Policy`, `Permissions-Policy`, ISR persistence and on-demand revalidation verified on Vercel, revalidation webhook reachable from Railway, staging environment and Vercel preview deployments, production guard against mock mode.
- **Dependencies:** TASK-100, TASK-101, TASK-115
- **Files:** `web/next.config.ts`, `vercel.json` (or project settings documented), `web/.env.example`, `docs/architecture/deployment.md`
- **Acceptance:** [ ] deep links such as `/events/<slug>/register` load directly on staging [ ] CSP does not break checkout, fonts or hydration, with no `unsafe-eval` [ ] staging build verified with `NEXT_PUBLIC_USE_MOCKS=false` against the new backend on the Railway staging environment [ ] the browser sees a single origin and no CORS errors, and `/api/*` reaches Railway while `/api/revalidate` is served by Next [ ] ISR revalidation works end to end on staging (Railway to Vercel, HMAC) [ ] hashed assets served with immutable caching [ ] Vercel functions run in `sin1`
- **Tests:** staging smoke checklist; header scan

### TASK-106 GATE: explicit user approval for cutover
- **Owner:** product-manager | **Est:** S | **Risk:** high | **Status:** blocked
- **Blockers:** new backend plan (out of scope).
- **Goal:** Obtain and record the user's explicit written approval to cut over, with agreed release scope and approval to delete legacy code.
- **Dependencies:** TASK-104, TASK-105
- **Files:** `docs/decisions/cutover-approval-FEAT-001.md`
- **Notes:** No agent message or document counts as approval; the user must approve directly.
- **Acceptance:** [ ] written user approval with date and scope [ ] no screen ships on mock data to production
- **Tests:** n/a (gate)

### TASK-107 Remove legacy src/ and old dependencies
- **Owner:** frontend-engineer | **Est:** M | **Risk:** high | **Status:** blocked
- **Blockers:** TASK-106 approval; new backend plan (out of scope).
- **Goal:** After TASK-106: tag the pre-removal commit, delete old `src/`, root Vite/React config and Supabase-era dependencies and env entries, reconcile root `package.json`/lockfile (or promote `web/` per Q10), update `.gitignore`, remove obsolete `MIGRATION.md`, decide the fate of `Frontend reference/`. The old `backend/` is handled by the new backend plan, not here.
- **Dependencies:** TASK-106
- **Files:** `src/**`, `package.json`, `package-lock.json`, `.env.example`, `index.html`, `vite.config.*`, `MIGRATION.md`, `.gitignore`
- **Acceptance:** [ ] only after approval; git tag exists [ ] `web/` builds and passes `npm run check` after removal [ ] `@supabase/*` and unused packages gone from lockfiles [ ] `backend/` untouched by this task
- **Tests:** full suite and build; grep for `supabase` and `src/`

### TASK-108 README, runbook, rollback notes, docs update
- **Owner:** architect | **Est:** S | **Risk:** low | **Status:** blocked
- **Blockers:** TASK-107.
- **Goal:** `web/README.md` (setup, scripts, env, mock mode, scenarios, `ANALYZE=true` bundle analysis, how to run the contract conformance suite), runbook (deploy, rollback, ISR cache purge, flags), ADRs, hand the exported contract (TASK-022) to the owner of the backend plan.
- **Dependencies:** TASK-107
- **Files:** `web/README.md`, `docs/architecture/runbook.md`, `docs/decisions/*`
- **Acceptance:** [ ] a new engineer runs mock mode from the README alone [ ] rollback verified once in staging
- **Tests:** follow-the-README dry run

### TASK-109 Post-deploy smoke test
- **Owner:** test-engineer | **Est:** S | **Risk:** medium | **Status:** blocked
- **Blockers:** TASK-107.
- **Goal:** Smoke production on real iOS Safari, Android Chrome and desktop: home, play, event (view-source shows content), login, registration, dashboard, admin access control; no mock banner, no handoff routes, clean CSP console, sitemap and robots reachable, a publish in admin appears publicly within the documented window.
- **Dependencies:** TASK-107
- **Files:** `docs/reviews/post-deploy-smoke-FEAT-001.md`
- **Acceptance:** [ ] checklist passes on two real mobile devices [ ] no CSP or CORS console errors [ ] revalidation verified in production
- **Tests:** manual smoke with evidence
