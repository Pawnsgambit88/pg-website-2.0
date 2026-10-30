# PLAN-001 v2 Task Details: Phases 3 to 5 (TASK-040 to TASK-068)

Narrative companion to `docs/plans/PLAN-001-frontend-rewrite.md` (version 2). Not a `task.schema.yaml` document; the schema-shaped files are `TASK-057`, `-062`, `-064` in this folder. DoD-S, DoD-G and DoD-R (Next.js edition) are defined in section 3 of the plan. "RBP" = `.claude/skills/react-best-practices`. Est = S/M/L. Paths relative to `C:\work\PG_Website`.

**Conventions for this file**
- Public tasks (Phase 3) are **Server Components, prerendered** (static or ISR with tags from TASK-113), fetch through `web/src/lib/data/public/*` (TASK-111) and export `generateMetadata` using helpers from TASK-112. Interactive parts are small `'use client'` islands. They must not read cookies, headers or search params in a way that opts the route into dynamic rendering; filter/search state on client islands uses `useSearchParams` inside a `Suspense` boundary.
- Phases 4 and 5 are client-rendered behind auth, `noindex`, and use TanStack Query (TASK-015).
- Every screen-bearing task also meets DoD-S (loading/error/empty/data states, no horizontal scroll at 390 and 320, keyboard and focus, fidelity to the cited reference screen) and DoD-R.
- Backend is out of scope: all data comes from the `PgApi` interface through the mock adapter until the new backend exists. FEAT-000 (`docs/requirements/FEAT-000-feature-inventory.md`, pending) is the product feature source.

## Phase 3: Public site (prerendered)

### TASK-112 SEO: metadata helpers, Open Graph, JSON-LD, sitemap, robots, canonical rules (NEW)
- **Owner:** frontend-engineer | **Est:** M | **Risk:** medium | **Status:** pending
- **Goal:** Shared SEO layer for `(public)`: `buildMetadata()` helper (title template, description, canonical, `alternates`, Open Graph and Twitter cards, `robots`), `eventJsonLd()` producing schema.org `Event` (name, startDate/endDate with +05:30 offset, location `Place`/`PostalAddress`, `eventStatus`, `eventAttendanceMode`, `offers` with price/priceCurrency/availability/url, image, organizer), plus `Organization`/`WebSite` JSON-LD for Home and `BreadcrumbList` for event pages; `app/sitemap.ts` (static routes, published upcoming and completed events, published stories; excludes `(auth)`, `(app)`, `(admin)`, `(handoff)`, `/api`), `app/robots.ts` (allow public, disallow non-public groups and `/api`, reference sitemap), dynamic OG image route (`opengraph-image.tsx`) for events and a default brand OG image, and the `noindex` metadata helper reused by TASK-013.
- **Dependencies:** TASK-007, TASK-111, TASK-113
- **Files:** `web/src/lib/seo/{metadata,jsonld,site}.ts`, `web/src/app/sitemap.ts`, `web/src/app/robots.ts`, `web/src/app/(public)/events/[slug]/opengraph-image.tsx`
- **Notes (RBP):** metadata and sitemap use the same cached fetchers as pages, so there is one upstream call per request (`server-cache-react`); JSON-LD is serialised with a helper that escapes `<`, `>` and `&` before `dangerouslySetInnerHTML` (XSS, reviewed by TASK-101); OG image fonts/assets loaded once at module level as immutable data (`server-hoist-static-io`); no per-request mutable module state.
- **Acceptance:** [ ] event JSON-LD validates against Google's Event structured-data requirements (rich-results test recorded) [ ] canonical URL uses slug and `NEXT_PUBLIC_SITE_URL` [ ] sitemap lists only indexable URLs with `lastmod` and updates after revalidation [ ] robots disallows non-public groups and `/api` [ ] OG image renders with the event title/date within 1200x630 and brand fonts [ ] drafts, unpublished and cancelled events are excluded from the sitemap (cancelled page is `noindex`) [ ] JSON-LD escaping test with a hostile title
- **Tests:** unit tests for metadata/JSON-LD builders; snapshot of sitemap; XSS escape test

### TASK-040 Home: hero and upcoming games (screen 01, top half)
- **Owner:** frontend-engineer | **Est:** L | **Risk:** medium | **Status:** pending
- **Goal:** `/` Server Component: hero (eyebrow, "Good games." + accent "Better company.", lede, body, primary action, text link, proof list, media with tag) and Upcoming games (3 `EventCard`s). Mobile order: promise, supporting copy, action and proof, media, upcoming. Never a 100vh gate.
- **Dependencies:** TASK-018, TASK-032, TASK-034, TASK-035, TASK-036, TASK-111, TASK-112
- **Files:** `web/src/app/(public)/page.tsx`, `web/src/features/home/{Hero,Upcoming}.tsx`
- **Notes (RBP):** `getSiteContent()` and `getUpcomingEvents()` are called from separate async Server Components so they fetch in parallel, with `Suspense` around Upcoming so a slow events call streams after the hero (`server-parallel-fetching`, `async-suspense-boundaries`). Hero image uses `priority` (adds preload) with explicit dimensions. Content falls back to bundled copy when CMS content is missing. Static ISR with tags `site:home`, `events`.
- **Acceptance:** [ ] DoD-S states incl. 0 events with next action [ ] mobile order per RESPONSIVE-BEHAVIOR [ ] headline never clips at 320 or 200% zoom [ ] **raw HTML (no JS) contains the headline, lede, hero image tag and the upcoming event titles and links** [ ] LCP element is the hero image, no layout shift [ ] network trace shows no server-side fetch waterfall in the mock-latency test [ ] page is statically prerendered (build output marker) and `generateMetadata` plus Organization JSON-LD present [ ] Home First Load JS within budget and excludes TanStack Query, carousel (for single image), admin and mock code
- **Tests:** component tests per state; Playwright 390/320/1440; Lighthouse mobile and SEO runs recorded; raw-HTML assertion

### TASK-041 Home: first-visit, community, story, testimonials, final CTA (screen 01, lower half)
- **Owner:** frontend-engineer | **Est:** M | **Risk:** low | **Status:** pending
- **Goal:** Promise block (four items), community principles, story block, final image CTA, testimonials (1 to 3 grid, 4+ carousel) via shared `testimonialLayout(count)` also used by TASK-075 preview.
- **Dependencies:** TASK-033, TASK-040
- **Files:** `web/src/features/home/{FirstVisit,CommunityBlock,StoryBlock,FinalCta,Testimonials}.tsx`
- **Notes (RBP):** below-fold sections use `cv-auto`; testimonials fetched in parallel with other sections (`server-parallel-fetching`); carousel client island only when 4+ testimonials or a multi-image collection, with the first item server-rendered.
- **Acceptance:** [ ] DoD-S [ ] every media collection static or carousel; 0/1 item degrades with no broken controls [ ] fourth testimonial switches to carousel; photos have name-based alt [ ] below-fold images lazy and sized [ ] testimonial text present in raw HTML [ ] no carousel chunk on pages with only static collections
- **Tests:** component tests (1, 3, 4 testimonials); Playwright 390/320

### TASK-042 Play: event discovery (screen 02)
- **Owner:** frontend-engineer | **Est:** M | **Risk:** low | **Status:** pending
- **Goal:** `/play` Server Component renders hero, the full upcoming list and a first-time band; a client filter island (All, Social, Beginner friendly, Rated, Free) plus optional search narrows the already-delivered list; empty result with reset; filter state in the URL.
- **Dependencies:** TASK-018, TASK-028, TASK-034, TASK-036, TASK-111, TASK-112
- **Files:** `web/src/app/(public)/play/page.tsx`, `web/src/features/events/EventFilters.tsx`
- **Notes (RBP):** the full list is in the prerendered HTML (SEO and no-JS), filtering is client-side over the delivered list as a derived value (`rerender-derived-state-no-effect`), `startTransition` for filter changes (`rerender-transitions`), `useDeferredValue` for search (`rerender-use-deferred-value`), functional state updates (`rerender-functional-setstate`); `useSearchParams` wrapped in `Suspense` so the route stays static; props to the island are a small DTO list (`server-serialization`). Tags `events`.
- **Acceptance:** [ ] DoD-S, empty result has reset [ ] chips wrap or scroll without hiding options at 320, 44px targets [ ] back button restores filters; result count announced politely [ ] raw HTML lists all upcoming events with links [ ] changing a filter makes no network request [ ] typing in search stays responsive with a 200-event fixture [ ] prerendered (build output) with metadata
- **Tests:** component tests; Playwright; raw-HTML assertion

### TASK-043 Event detail: open, full, closed, sold-out modes (screen 03)
- **Owner:** frontend-engineer | **Est:** L | **Risk:** medium | **Status:** pending
- **Goal:** `/events/[slug]` prerendered via `generateStaticParams` (upcoming plus latest completed) with `dynamicParams` for the rest: decision essentials first, media, experience list, at-a-glance card, logistics, arrival anchor, `generateMetadata`, Event JSON-LD, canonical URL. Live availability and the registration action state come from a small **client island** that fetches current availability and the signed-in user's registration (the HTML shows last-known availability text in reserved space). Action adapts to open, last places, full+waitlist, sold out (next event), closed (explains date), already registered, cancelled. Desktop sticky decision panel; mobile essentials under the hero and a sticky bottom CTA (safe area).
- **Dependencies:** TASK-018, TASK-032, TASK-033, TASK-034, TASK-036, TASK-111, TASK-112, TASK-113
- **Files:** `web/src/app/(public)/events/[slug]/page.tsx`, `web/src/features/events/{EventHero,DecisionPanel,LiveAvailability,StickyCta,EventExperience}.tsx`
- **Notes (RBP):** `getEventBySlug` shared by `generateMetadata` and the page via `React.cache` (`server-cache-react`); related "next event" fetched in parallel (`server-parallel-fetching`); only the slug, event id and a few primitives cross into `LiveAvailability` (`server-serialization`); registration route chunk prefetched via `next/link`; **Razorpay and the registration panels are not loaded here**. Tags `event:{slug}`, `events`. Unpublished/unknown slug returns `notFound()`; completed event renders archive mode (TASK-044); cancelled renders a cancelled page with `noindex`.
- **Acceptance:** [ ] DoD-S incl. not-found [ ] raw HTML contains title, date/time, place, price, last-known availability, experience copy and the register link [ ] each availability state reachable by mock scenario with correct action/copy [ ] sticky bar 48px, safe-area padding, bottom padding so nothing is hidden, not announced twice [ ] signed-out CTA goes to login with `returnTo` registration [ ] Event JSON-LD and OG metadata correct [ ] changing availability does not require redeploy or page revalidation (client island updates) [ ] metadata and page cause one upstream fetch [ ] no Razorpay request on this page
- **Tests:** component tests per state; Playwright 390/320 sticky-bar overlap; intent preservation; raw-HTML and JSON-LD assertions

### TASK-044 Event detail: completed/archive mode (screen 04)
- **Owner:** frontend-engineer | **Est:** M | **Risk:** low | **Status:** pending
- **Goal:** Same route in archive mode: past-event eyebrow, recap, facts (players, rounds, format, winner), final standings via ResponsiveTable, results/gallery/recap when available, no registration CTA, optional next-event link. Event JSON-LD shows `EventCompleted`-appropriate status (or omits offers).
- **Dependencies:** TASK-031, TASK-043
- **Files:** `web/src/features/events/{ArchiveHero,Standings,EventGallery}.tsx`
- **Acceptance:** [ ] DoD-S incl. no standings / no gallery [ ] no element offers registration [ ] standings collapse to labelled rows at 390 and appear in raw HTML [ ] URL unchanged from the open state (permanent archive) [ ] gallery images lazy; standings rows use `cv-auto` over 50 rows [ ] revalidation on `completed` or `updated` event refreshes this page (TASK-114 test)
- **Tests:** component tests; Playwright; revalidation integration test

### TASK-045 Past events archive (screen 05)
- **Owner:** frontend-engineer | **Est:** S | **Risk:** low | **Status:** pending
- **Goal:** `/past-events` prerendered list of completed events with result/gallery/recap indicators; client search island; pagination via `?page=` rendered statically for page 1 and on demand for others.
- **Dependencies:** TASK-034, TASK-036, TASK-111, TASK-112
- **Files:** `web/src/app/(public)/past-events/page.tsx`
- **Notes (RBP):** debounced search with `useDeferredValue`; archive rows use `cv-auto`; paginated pages canonicalised.
- **Acceptance:** [ ] DoD-S incl. empty archive and no match [ ] search labelled, result count announced [ ] 500-row fixture scrolls without long tasks [ ] page 1 in raw HTML; paginated pages have self-canonical [ ] tag `past-events`
- **Tests:** component tests; Playwright

### TASK-046 Community (screen 06)
- **Owner:** frontend-engineer | **Est:** S | **Risk:** low | **Status:** pending
- **Goal:** `/community` static editorial composition, media with fallback, border-based principles, CTA to Play, metadata.
- **Dependencies:** TASK-032, TASK-033, TASK-036, TASK-111, TASK-112
- **Files:** `web/src/app/(public)/community/page.tsx`
- **Acceptance:** [ ] DoD-S incl. CMS fallback and media unavailable [ ] no rounded-card wall [ ] full copy in raw HTML [ ] tag `site:community`
- **Tests:** component tests; Playwright

### TASK-047 Stories (screen 07)
- **Owner:** frontend-engineer | **Est:** M | **Risk:** low | **Status:** pending
- **Goal:** `/stories` featured story plus chronological grid, prerendered; types story, rivalry, member profile, recap; no-featured and empty states; story bodies rendered through a structured/sanitised renderer (never raw HTML). Stories carry a `slug` in the contract (unique, immutable once published); story detail pages are not in the 58 screens (Q8).
- **Dependencies:** TASK-032, TASK-036, TASK-111, TASK-112
- **Files:** `web/src/app/(public)/stories/page.tsx`, `web/src/features/stories/*`
- **Acceptance:** [ ] DoD-S [ ] no `dangerouslySetInnerHTML` of unsanitised content [ ] grid images lazy, grid uses `cv-auto` [ ] stories in raw HTML [ ] tags `stories`
- **Tests:** component tests incl. XSS payload fixture

### TASK-048 Contact (screen 08)
- **Owner:** frontend-engineer | **Est:** M | **Risk:** low | **Status:** pending
- **Goal:** `/contact` static page with a client form island (name, email, topic, message): validation, pending, success, service-error states preserving input; side panel with WhatsApp/email from site content; no-provider fallback shows direct options. Submits through the contract's contact method from the browser (no Server Action unless ARCH-001 adopts one; if so, `server-auth-actions` rules apply).
- **Dependencies:** TASK-027, TASK-028, TASK-036, TASK-112
- **Files:** `web/src/app/(public)/contact/page.tsx`, `web/src/features/contact/ContactForm.tsx`
- **Acceptance:** [ ] DoD-S [ ] duplicate submits prevented [ ] honeypot present, no third-party script [ ] page is static with metadata; form island is the only client code
- **Tests:** component tests (validation, success, failure); Playwright

### TASK-049 Legal template and 404 (screens 09 to 12)
- **Owner:** frontend-engineer | **Est:** S | **Risk:** low | **Status:** pending
- **Goal:** `/privacy`, `/terms`, `/refund-policy` through one `LegalPage` with published-content-only behaviour, "not yet published" state (`noindex` until published) and last-updated; global `not-found.tsx` and route error pages.
- **Dependencies:** TASK-013, TASK-036, TASK-111, TASK-112
- **Files:** `web/src/app/(public)/{privacy,terms,refund-policy}/page.tsx`, `web/src/app/not-found.tsx`, `web/src/features/legal/LegalPage.tsx`
- **Notes:** placeholder wording visibly marked (Q9). Tags `legal:{page}`.
- **Acceptance:** [ ] DoD-S [ ] semantic headings, readable measure [ ] 404 returns the correct HTTP status, focus on main heading, links to Play and Home [ ] legal copy in raw HTML [ ] revalidates on `legal` publish
- **Tests:** component tests; Playwright

### TASK-116 Prerender and SEO verification suite (NEW)
- **Owner:** test-engineer | **Est:** M | **Risk:** medium | **Status:** pending
- **Goal:** Automated and recorded proof that public pages are prerendered and indexable: for every `(public)` route, fetch HTML with JavaScript disabled and assert that headline, key content, internal links, `<title>`, meta description, canonical, Open Graph tags and (for events) valid JSON-LD are present; assert response headers (`x-nextjs-cache` HIT after warm-up or equivalent), build output marks the routes static/ISR, `(auth)/(app)/(admin)/(handoff)` carry `noindex` and are absent from the sitemap; run Lighthouse SEO and Accessibility on Home, Play, an event and an archived event; verify the revalidation path end to end in mock mode (publish in the admin mock, then raw HTML shows the change without redeploy).
- **Dependencies:** TASK-009, TASK-040, TASK-042, TASK-043, TASK-044, TASK-045, TASK-046, TASK-047, TASK-049, TASK-112, TASK-114
- **Files:** `web/e2e/seo/*.spec.ts`, `docs/reviews/seo-prerender-FEAT-001.md`
- **Acceptance:** [ ] raw-HTML assertions pass for all public routes [ ] Lighthouse SEO score 100 on listed pages (or documented waiver) [ ] sitemap and robots verified [ ] draft/unknown slugs return 404 and never appear in sitemap [ ] publish-to-visible revalidation test passes within the documented window [ ] results recorded in the review file
- **Tests:** this task is the tests (e2e, manual Lighthouse evidence)

## Phase 1.5: Follow-ups from ARCH-001 section 30 (public and CMS tier)

### TASK-118 Story detail page `/stories/[slug]`
- **Owner:** frontend-engineer | **Est:** M | **Risk:** medium | **Status:** pending
- **Goal:** `/stories/[slug]` Server Component, prerendered via `generateStaticParams` (published stories), with `dynamicParams` for unpublished/unknown. Story title, body with structured blocks (paragraph, heading, quote, image, list only), author and date, back link to `/stories`, `generateMetadata`, optional JSON-LD `Article` schema. Closed block model: the story body structure is restricted to a fixed set of block types to prevent ad-hoc layout drift. Slug immutability enforced (backend responsibility); unpublished or invalid slugs return 404. Include the story detail route in the sitemap (TASK-112 update).
- **Rationale:** ARCH-001 section 30 F-01 (OQ-01 approved). Stories are a published content type; the detail page is part of the prerendered public site. AC-28a requires the page to be prerendered with story title, body in structured blocks, open-graph metadata and JSON-LD Article.
- **Dependencies:** TASK-047, TASK-111, TASK-112
- **Files:** `web/src/app/(public)/stories/[slug]/page.tsx`, `web/src/features/stories/{StoryBody,StoryBlock}.tsx`, `web/src/lib/seo/jsonld.ts` (Article schema)
- **Notes (RBP):** `getStoryBySlug` is shared by `generateMetadata` and the page via `React.cache`; body rendering is a client boundary handling the structured blocks; story images use `ResponsiveImage` with lazy loading below the fold. Tags `story:{slug}`, `stories`. Closed block model means the CMS editor (TASK-074) restricts block types to the allowed set, and the frontend renders only those types safely (no arbitrary HTML).
- **Acceptance:** [ ] DoD-S incl. not-found [ ] raw HTML contains title, body text, author, date and back link [ ] each block type (paragraph, heading, quote, image, list) renders correctly at 320/390/1440 [ ] JSON-LD Article validates against schema.org (headline, description, author, datePublished, image) [ ] image captions alt text required [ ] unpublished/invalid/draft story slugs return 404 (no noindex redirect) [ ] sitemap includes published story URLs with `lastmod` [ ] metadata and page cause one upstream fetch [ ] First Load JS excludes admin, builder, and CMS chunks
- **Tests:** component tests per block type; Playwright 390/320; JSON-LD validation; raw-HTML assertion
- **Risk:** Medium (closed block model requires CMS and frontend alignment; block rendering bugs affect all story pages).
- **DoD-R:** Block rendering is deterministic (no hydration flicker); images use `ResponsiveImage` with correct `sizes`.

### TASK-119 Draft preview: `/api/draft`, `/api/draft/exit`, preview banner, `createPreviewLink` in PgAdminApi, mock preview route
- **Owner:** frontend-engineer | **Est:** M | **Risk:** medium | **Status:** pending
- **Goal:** Draft mode implementation per ARCH-001 section 8.4 (OQ-03 approved). Routes: `GET /api/draft?token=<opaque>` exchanges the token with the backend and enables Next `draftMode`; `POST /api/draft/exit` disables draft mode. Data layer in `lib/data/public/preview.ts` switches fetchers to `cache: 'no-store'` and adds `X-Preview-Key` header when draft mode is active. A persistent banner renders when draft mode is on ("Preview. Not published.") with an Exit button. `PgAdminApi.admin.createPreviewLink({ kind, id })` returns `{ url }` for the CMS (TASK-073) and builder (TASK-081) to link to. Mock implementation of the exchange in preview mode. Draft pages carry `noindex` metadata and `Cache-Control: private, no-store`. Fallback: if reading `draftMode()` in `(public)` breaks prerendering, use a separate `(preview)` group for the same pages.
- **Rationale:** ARCH-001 section 8.4 and section 30 F-02. Plan Q17 resolved (owner approval). Draft preview is essential for the CMS and builder workflows; implemented early to avoid last-minute complications.
- **Dependencies:** TASK-114, TASK-073
- **Files:** `web/src/app/api/draft/route.ts`, `web/src/app/api/draft/exit/route.ts`, `web/src/lib/data/public/preview.ts`, `web/src/components/layout/DraftBanner.tsx`, `web/src/lib/api/types.ts` (PgAdminApi update)
- **Notes (RBP):** data layer is server-only (`import 'server-only'`); the banner is a small client island that reads draft mode through a tiny probe rather than calling `draftMode()` to keep `(public)` routes deterministic for static generation. Redirect is taken from the backend response, not the query string (open-redirect safe). Token expires in 5 minutes; preview key cookie is `httpOnly; Secure; SameSite=Lax; Path=/; Max-Age=1800`.
- **Acceptance:** [ ] `GET /api/draft?token=valid-token` enables draft mode and redirects to the provided path [ ] invalid token returns 401 [ ] `/api/draft/exit` disables draft mode and clears the preview cookie [ ] draft pages render `noindex` and `Cache-Control: private, no-store` [ ] draft pages are not cached by the CDN (confirm via cache headers) [ ] `createPreviewLink` is exported from `PgAdminApi.admin` [ ] draft banner is visible at the top of the page and has an Exit button [ ] NEXT_PUBLIC_USE_MOCKS shows a mock preview token exchange [ ] build output confirms `(public)` routes remain static (no `draftMode()` call breaks prerendering)
- **Tests:** route tests for `/api/draft` (valid/invalid tokens, redirect); banner component test; end-to-end draft workflow in mock mode; prerender build assertion
- **Risk:** Medium (draft mode misconfiguration can break static generation or leak unpublished content; redirect mishandling is an open-redirect risk).

### TASK-123 Public availability island hook: `useAvailability(slug)` without Query
- **Owner:** frontend-engineer | **Est:** S | **Risk:** low | **Status:** pending
- **Goal:** `web/src/hooks/useAvailability.ts` client hook for `(public)` routes that fetches live availability (places left, registration state) for an event without TanStack Query: a simple wrapper over `fetch` with a 30-second visibility-aware polling interval and error resilience. Used by TASK-043 `LiveAvailability` island to keep the prerendered HTML current. The hook respects `document.hidden` and pauses polling when the page is backgrounded.
- **Rationale:** ARCH-001 section 9.6 and section 30 F-06. Query is a client-side dedup layer used in `(auth)`, `(app)` and `(admin)`, but `(public)` pages avoid TanStack Query to keep the bundle small and the data layer simple. `useAvailability` is a lightweight alternative for volatile data that must be kept fresh.
- **Dependencies:** TASK-111
- **Files:** `web/src/hooks/useAvailability.ts`
- **Notes (RBP):** the hook manages one fetch request at a time using a simple state machine (idle, loading, success, error); it does not cache across component instances (each caller gets its own poll). Polling is deferred by `useDeferredValue` if updates happen too fast; `startTransition` prevents blocking the UI. Failures are logged and the last-known value is kept on screen (resilient).
- **Acceptance:** [ ] hook fetches availability immediately on mount and every 30 seconds while the page is visible [ ] polling pauses when `document.hidden` is true [ ] changes in availability are rendered within 30 seconds [ ] errors do not break the UI; the last-known value is shown [ ] 390px and 320px tests confirm polling fires and updates the DOM
- **Tests:** hook tests (visibility, polling intervals, error recovery); Playwright 390/320 with mock delay
- **Risk:** Low (simple polling mechanism with no cache complexity).

## Phase 4: Auth and conversion (client-rendered, noindex)

### TASK-050 AuthLayout and Login (screen 13)
- **Owner:** frontend-engineer | **Est:** M | **Risk:** medium | **Status:** pending
- **Goal:** `/login` split layout, mobile form first; email/password, forgot link, create-account link, Google button only when `NEXT_PUBLIC_GOOGLE_AUTH`; states loading, invalid credentials, rate limit, network error; preserves `returnTo`.
- **Dependencies:** TASK-018, TASK-024, TASK-026, TASK-027, TASK-028
- **Files:** `web/src/app/(auth)/login/page.tsx`, `web/src/components/layout/AuthLayout.tsx`
- **Notes (RBP):** page shell is a Server Component; the form is a client island; Login link in the public nav uses `next/link` prefetch.
- **Acceptance:** [ ] DoD-S [ ] Google button (when enabled) at least 44px at 320 to 390 [ ] wrong-credentials copy does not disclose account existence [ ] signed-in users redirected; `returnTo` validated [ ] `autocomplete` for password managers [ ] `noindex` present
- **Tests:** component tests; Playwright login and return-to-event; WebKit zoom check

### TASK-051 Create account (screen 14)
- **Owner:** frontend-engineer | **Est:** M | **Risk:** medium | **Status:** pending
- **Goal:** Create-account mode (`/login?mode=signup` per ARCH-001) with fields from the contract (name, email, password; progressive profile later); server field errors mapped; flows to `/welcome` then `returnTo`.
- **Dependencies:** TASK-050
- **Files:** `web/src/features/auth/SignupForm.tsx`
- **Acceptance:** [ ] DoD-S incl. submitting, field errors, confirmation notice, network error [ ] password rules shown before submit [ ] no Elo/rating questions
- **Tests:** component tests (error mapping); Playwright flow

### TASK-052 OAuth callback (screen 15)
- **Owner:** frontend-engineer | **Est:** S | **Risk:** low | **Status:** pending
- **Goal:** `/auth/callback` processing, success redirect (`returnTo`, `/welcome` on first sign-in), failure recovery; live only when `NEXT_PUBLIC_GOOGLE_AUTH`, otherwise redirects to `/login`.
- **Dependencies:** TASK-024, TASK-050
- **Files:** `web/src/app/(auth)/auth/callback/page.tsx`
- **Acceptance:** [ ] DoD-S [ ] timeout, never an endless spinner [ ] query/hash not logged or persisted
- **Tests:** component tests per outcome

### TASK-053 Reset password (screen 16)
- **Owner:** frontend-engineer | **Est:** M | **Risk:** low | **Status:** pending
- **Goal:** `/reset-password` request mode with neutral response; confirm mode when `?token=` is present (new password + confirm), expired/invalid states.
- **Dependencies:** TASK-021, TASK-050
- **Files:** `web/src/app/(auth)/reset-password/page.tsx`
- **Acceptance:** [ ] DoD-S [ ] token removed from the URL after reading (history replace), never logged [ ] success routes to login with notice [ ] `Referrer-Policy: no-referrer` for this route
- **Tests:** component tests

### TASK-054 Welcome / first-login preferences (screen 17)
- **Owner:** frontend-engineer | **Est:** M | **Risk:** low | **Status:** pending
- **Goal:** `/welcome` two choice-card questions, "Save and continue", "Skip for now"; returns to `returnTo` or `/app`.
- **Dependencies:** TASK-018, TASK-021, TASK-024, TASK-027
- **Files:** `web/src/app/(auth)/welcome/page.tsx`
- **Acceptance:** [ ] DoD-S [ ] cards are a radio group (arrows, single tab stop) [ ] skipping never blocks the app or a pending registration
- **Tests:** component tests; Playwright

### TASK-055 Registration frame, state resolver, ineligible states (screens 18 to 21 shell)
- **Owner:** frontend-engineer | **Est:** L | **Risk:** high | **Status:** pending
- **Goal:** `/events/[slug]/register` shell: auth guard, split layout (compact summary above the action on mobile), loads event and current registration in parallel, pure `resolveRegistrationView(event, registration, user)` returning free, paid, hold-active, waitlist, sold-out, closed, already-registered, pending-payment-resume, confirming-payment, payment-failed, refund-pending, refunded, cancelled. Implements the non-transactional views; panels from 056 to 058 plug in.
- **Dependencies:** TASK-018, TASK-019, TASK-024, TASK-027, TASK-028, TASK-043
- **Files:** `web/src/app/(auth)/events/[slug]/register/page.tsx`, `web/src/features/registration/{resolveView.ts,RegistrationLayout.tsx,states/*}`
- **Notes (RBP):** server shell passes only the slug (`server-serialization`); panels loaded with `next/dynamic` so a free-event user never downloads paid-flow code (`bundle-dynamic-imports`); client queries for event and registration start together (`async-parallel`).
- **Acceptance:** [ ] DoD-S, every state reachable by mock scenario [ ] resolver pure with exhaustive table test [ ] unauthenticated entry redirects to login and returns [ ] at 390 the action is visible without scrolling past a hero image [ ] free-event path loads no paid-panel chunk [ ] `noindex`
- **Tests:** exhaustive resolver unit test; component tests per view; Playwright

### TASK-056 Registration: free confirmation and success (screens 19, 21)
- **Owner:** frontend-engineer | **Est:** M | **Risk:** medium | **Status:** pending
- **Goal:** Free action panel confirming on server response; shared success screen ("You're playing.", badge, summary, add-to-calendar, links to My Events and Event Room).
- **Dependencies:** TASK-055
- **Files:** `web/src/features/registration/{FreePanel,SuccessPanel}.tsx`
- **Acceptance:** [ ] DoD-S [ ] success only after server confirms; double tap creates one registration [ ] success announced, focus moves to heading [ ] `.ics` valid in Asia/Kolkata [ ] calendar helper loaded on click (`bundle-conditional`) [ ] successful registration triggers invalidation of availability and My events queries
- **Tests:** component tests; `.ics` unit test; Playwright

### TASK-057 Registration: paid flow and Razorpay hook **[schema-form task file]**
- **Owner:** frontend-engineer | **Est:** L | **Risk:** high | **Status:** pending
- **Goal/notes/criteria:** see `docs/plans/FEAT-001/TASK-057.md`. Summary: server price, hold countdown, lazily loaded Razorpay, server verification, confirming reconciliation, no duplicates.
- **Dependencies:** TASK-015, TASK-022, TASK-055

### TASK-058 Registration: waitlist join (screen 20)
- **Owner:** frontend-engineer | **Est:** S | **Risk:** low | **Status:** pending
- **Goal:** Waitlist panel (position, "Payment: Not taken", next step, join), joined confirmation, offer-of-place variant.
- **Dependencies:** TASK-055
- **Files:** `web/src/features/registration/WaitlistPanel.tsx`
- **Acceptance:** [ ] DoD-S incl. joining, joined, already on waitlist, offer pending [ ] no payment control rendered in any waitlist state
- **Tests:** component tests; Playwright

### TASK-059 Registration and payment scenario tests
- **Owner:** test-engineer | **Est:** M | **Risk:** medium | **Status:** pending
- **Goal:** One scenario per `docs/UI-STATES.md` registration state plus observable failures from `docs/TEST-PLAN.md` (offline at return, duplicate verification, closed checkout, captured-then-browser-closed reconcile, event fills during hold, session expiry mid-registration).
- **Dependencies:** TASK-009, TASK-056, TASK-057, TASK-058
- **Files:** `web/e2e/registration/*.spec.ts`
- **Acceptance:** [ ] one test per state and failure at 390 and 1440 [ ] no sleeps [ ] gaps the mock cannot simulate are recorded for the contract (TASK-022 export)
- **Tests:** this task is the tests

## Phase 5: Player area (client-rendered, noindex)

### TASK-060 Player dashboard (screen 22)
- **Owner:** frontend-engineer | **Est:** M | **Risk:** medium | **Status:** pending
- **Goal:** `/app` next-up hero adapting to no next event, upcoming, check-in open, pairing pending, live, post-event; rating snapshot, three pool cards, recent games, people block.
- **Dependencies:** TASK-019, TASK-024, TASK-034, TASK-037
- **Files:** `web/src/app/(app)/app/page.tsx`, `web/src/features/dashboard/*`
- **Notes (RBP):** next event, ratings and recent games are independent queries issued together, each section in its own `Suspense` boundary so the hero renders first; hero state derived in render from one query.
- **Acceptance:** [ ] DoD-S incl. no next event, each hero variant, new player [ ] at 390 hero and action are in the first viewport [ ] deltas shown with sign and text [ ] no sequential waterfall in the network trace
- **Tests:** component tests per hero variant; Playwright

### TASK-061 My Events (screen 23)
- **Owner:** frontend-engineer | **Est:** M | **Risk:** medium | **Status:** pending
- **Goal:** `/app/events` upcoming with badges (Confirmed, Payment pending with resume, Waitlist with position, Refund pending/Refunded), cancellation where policy allows (confirm dialog), completed history linking to archive/recap and rating movement.
- **Dependencies:** TASK-019, TASK-024, TASK-034, TASK-037
- **Files:** `web/src/app/(app)/app/events/page.tsx`, `web/src/features/my-events/*`
- **Acceptance:** [ ] DoD-S incl. empty with Play CTA, each state, cancel failure [ ] payment-pending row resumes without duplicate [ ] cancel needs confirmation, honest pending/success/failure [ ] history list uses `cv-auto`
- **Tests:** component tests; Playwright

### TASK-062 Event Room data layer **[schema-form task file]**
- **Owner:** frontend-engineer | **Est:** L | **Risk:** high | **Status:** pending
- **Goal/notes/criteria:** see `docs/plans/FEAT-001/TASK-062.md`. Summary: pure state derivation, deduplicated polling, manual refresh, offline banner, single announcement per transition.
- **Dependencies:** TASK-015, TASK-019, TASK-028, TASK-037

### TASK-063 Event Room: before check-in and check-in open (screens 24, 25)
- **Owner:** frontend-engineer | **Est:** M | **Risk:** medium | **Status:** pending
- **Goal:** Header and status badge; "Check-in opens ..." state; "You're at the venue. Tell us." with a single action; checked-in confirmation; host check-in required variant; timeline and "Need help?" with "Message event desk".
- **Dependencies:** TASK-034, TASK-062
- **Files:** `web/src/features/event-room/{BeforeCheckin,CheckinOpen,HelpPanel}.tsx`
- **Acceptance:** [ ] DoD-S incl. not open, open, checking in, checked in, window closed, host check-in required [ ] action 48px, one tap, success only after server confirms [ ] `CHECKIN_WINDOW_CLOSED` and `REGISTRATION_NOT_CONFIRMED` have specific copy
- **Tests:** component tests; Playwright 390

### TASK-064 Event Room: pairing pending and live round **[schema-form task file]**
- **Owner:** frontend-engineer | **Est:** L | **Risk:** high | **Status:** pending
- **Goal/notes/criteria:** see `docs/plans/FEAT-001/TASK-064.md`. Summary: five essentials visible without scrolling at 390x844 and 320x568, result sheet, all result states.
- **Dependencies:** TASK-029, TASK-034, TASK-062

### TASK-065 Event Room: between rounds and event complete (screens 28, 29)
- **Owner:** frontend-engineer | **Est:** M | **Risk:** medium | **Status:** pending
- **Goal:** Between rounds (previous result, standings, next-round time, waiting copy); complete (summary, rating delta, "See rating movement", rating-processing-pending, games list).
- **Dependencies:** TASK-034, TASK-062
- **Files:** `web/src/features/event-room/{BetweenRounds,EventComplete}.tsx`
- **Acceptance:** [ ] DoD-S incl. complete with rating, rating pending, unrated/social with no delta [ ] unrated games never show a manufactured delta [ ] a processed round never shows two different deltas after refresh
- **Tests:** component tests; Playwright

### TASK-066 Rating: pools, cards, RD explanation, ledger (screen 30)
- **Owner:** frontend-engineer | **Est:** M | **Risk:** medium | **Status:** pending
- **Goal:** `/app/rating` Blitz/Rapid/Classical as independent pools (no blended rating), selected pool state, games and RD, plain-language provisional/high-RD text, per-pool ledger of `ResultRow`s with pagination, social games without delta.
- **Dependencies:** TASK-019, TASK-028, TASK-034, TASK-037
- **Files:** `web/src/app/(app)/app/rating/page.tsx`, `web/src/features/rating/*`
- **Notes (RBP):** ledger rows use `cv-auto`; ledgers beyond 200 rows paginate or window; pool switch in a transition; other pools prefetched on hover/focus of the selector (`bundle-preload` spirit); totals in a single pass (`js-combine-iterations`).
- **Acceptance:** [ ] DoD-S incl. empty pool, provisional, ledger loading and error [ ] selector is radio/tab pattern with 44px targets, not colour-only [ ] no blended rating anywhere [ ] 500-row ledger fixture: first paint under 100 ms on throttled CPU and no long task while scrolling
- **Tests:** component tests; Playwright; ledger perf fixture

### TASK-067 Rating: accessible trend chart (screen 30)
- **Owner:** frontend-engineer | **Est:** M | **Risk:** medium | **Status:** pending
- **Goal:** Hand-rolled SVG movement chart over a selectable window (default 90 days) without the reference's `preserveAspectRatio="none"` distortion; text summary, "view as table" toggle, keyboard-reachable points, empty and one-point states.
- **Dependencies:** TASK-066
- **Files:** `web/src/features/rating/TrendChart.tsx`
- **Notes (RBP):** loaded with `next/dynamic` (`ssr: false` is acceptable here because the route is client-rendered) only when the pool has 2+ points; path coordinates at 1 decimal (`rendering-svg-precision`); animate the wrapper, not the SVG (`rendering-animate-svg-wrapper`); scales computed once per data change with `useMemo`.
- **Acceptance:** [ ] DoD-S incl. no data, one point, many points, loading, error [ ] understandable without colour or pointer [ ] no chart code in any other route chunk (bundle report) [ ] copper line and axes match screen 30
- **Tests:** component tests; Playwright 320; chunk assertion

### TASK-068 Profile (screen 31)
- **Owner:** frontend-engineer | **Est:** M | **Risk:** medium | **Status:** pending
- **Goal:** `/app/profile` private account form and public chess identity switches, "Never public" statement for email/phone/birthday, dirty-state indicator, unsaved-changes guard, save with field errors.
- **Dependencies:** TASK-021, TASK-027, TASK-029, TASK-037
- **Files:** `web/src/app/(app)/app/profile/page.tsx`, `web/src/features/profile/*`
- **Notes:** phone shown masked from a server-provided value. Uncontrolled RHF form; dirty flag subscribed at the save bar only (`rerender-defer-reads`).
- **Acceptance:** [ ] DoD-S incl. save success, field errors, save failure retaining edits, unsaved-changes dialog [ ] private and public sections cannot be confused [ ] typing in a field does not re-render the public-identity section
- **Tests:** component tests (dirty guard, validation); Playwright
