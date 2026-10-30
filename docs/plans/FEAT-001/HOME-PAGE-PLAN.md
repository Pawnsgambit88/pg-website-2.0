# Home page plan (route `/`, screen 01)

Parent plan: PLAN-001 (TASK-040, TASK-041). Requirements: FEAT-001. Architecture: ARCH-001 (7.3 ISR 900 s, 9 data layer, 13 images and motion, 8 SEO).
Status: draft (addendum A1 2026-10-23 supersedes Decisions 1 and 2, Section 6 and Q1/Q2 where they differ). Scope is the Home page only. Everything not listed as a task here is reused as is.

## 1. Current state (verified in web/src)

Already built (reuse, do not recreate):
- Tokens and base CSS (TASK-010), fonts (TASK-011), formatters `lib/format/date.ts` (TASK-012), route skeleton and `(public)/layout.tsx` with skip link and main landmark (TASK-013).
- Primitives (TASK-025/026): `Shell`, `Section`, `Grid`, `Stack`, `Eyebrow`, `Heading`, `Text`, `Divider`, `Surface`, `PageIntro`, `Button`, `ActionLink`, `TextLink`, `StatusBadge`, icons (`ArrowRight` etc.).
- `ResponsiveImage` and `MediaFrame` (TASK-032): focal point to `object-position`, slot presets, blur placeholder, fallback, required alt, single-`priority` guard.
- `Reveal` (TASK-035): CSS plus shared IntersectionObserver, never hides above-the-fold content, reduced-motion safe.
- API types incl. `HomeContentDto` (hero, upcoming, firstVisit with 4 promises, stands with 3 principles, moreThanAGame, finalCta), `EventCardDto`, `PgApi.getSiteContent('home')`, `getUpcomingEvents`, `getTestimonials`, `getStories` (TASK-016).
- Security: CSP with static policy for prerendered public pages (TASK-120).

Missing (verified: no `components/domain`, no `components/public`, no `lib/api/server`, no mock adapter, no SEO helpers; `page.tsx` is still `PlaceholderPage`):
- Public server data layer (TASK-111), mock adapter and public fixtures (TASK-018), SEO helpers (TASK-112).
- `EventCard` domain component (TASK-034, pending; only needed in its card form for Home).
- `PublicNav` and `Footer` (TASK-036, pending).
- All Home section components and the page itself.

## 2. Decisions and conflicts to resolve first

1. Motion library. The reference DESIGN-SYSTEM.md says GSAP. The approved decision (PLAN-001 P3, FEAT-001 D-10, ARCH-001 13.5) is no GSAP: CSS plus the in-repo `Reveal`. This plan follows the approved decision and expresses the design-system motion list (opening copy reveal, one-time section reveal, subtle image scale, carousel fades) with CSS and `Reveal`. `gsap` is not in package.json. Needs owner confirmation (open question Q1).
2. CTA copy. Reference card CTA is "Save my board". DESIGN-SYSTEM copy rules prefer goal-stating CTAs ("Save my place"). Fixtures should use the reference text unless the owner picks one. All CTA and body copy comes from CMS DTOs, so this is fixture content, not component code (Q2).
3. Testimonials and featured story. TASK-041 lists testimonials, ARCH-001 line 740 lists `getTestimonials` and `getStories` for Home, but the reference screen 01 has no testimonial or featured-story block, and `HomeContentDto` has no testimonial section. This plan builds exactly the reference sections and does not fetch testimonials or stories. TASK-041 is narrowed accordingly (Q3).
4. Hero and card images in the reference reuse the same Unsplash photo three times. Fixtures must use distinct licensed images from the asset inventory (ASSET-INVENTORY.md); image host must be in `next.config` remotePatterns (TASK-005 decided Supabase Storage).
5. Nav auth link. TASK-036 depends on TASK-023 (auth context) for the auth-aware link. Home must not wait for auth. Proposal: ship TASK-036 with a static "Log in" link first (HOME-02 below), auth-aware swap stays in TASK-036's original scope (Q4).

## 3. Component breakdown

Page `app/(public)/page.tsx` is a Server Component, `export const revalidate = 900` (keep), no request APIs.

| Component | Path | Type | Notes |
|---|---|---|---|
| `HomePage` | `app/(public)/page.tsx` | Server | Starts `getSiteContent('home')` and `getUpcomingEvents({limit:3})` together (`Promise.all`), awaits both before render, passes DTOs down. Exports `generateMetadata`. |
| `HomeHero` | `components/public/home/HomeHero.tsx` | Server | Eyebrow, h1 (line 1 plus accent line in a `span` with `display:block`, copper-free accent uses Forest/italic Newsreader per reference class), lede, body, CTAs, proof `ul`, image with tag. LCP image uses `priority` with `slot="hero"`. No `Reveal` around LCP. |
| `HomeUpcoming` | `.../HomeUpcoming.tsx` | Server | Section head (eyebrow, h2, intro, "See all events" `TextLink`) plus 3-column border-grouped list of `EventCard`. Empty state when 0 events. |
| `EventCard` (variant `home`) | `components/domain/EventCard.tsx` (TASK-034) | Server | Date chip over image (Fragment Mono), type and audience labels, title, promise, time range and area, CTA link to `/events/[slug]`. Whole card is one link target via CTA stretched link, not nested anchors. |
| `HomeFirstVisit` | `.../HomeFirstVisit.tsx` | Server | Image, copy, CTA to `/welcome`, ordered list of 4 promises (`ol`, numerals 01 to 04 in mono, decorative numerals `aria-hidden` since `ol` supplies numbering). |
| `HomeStands` | `.../HomeStands.tsx` | Server | Forest band, image, 3 principles. White-on-forest contrast checked. Principles as `ul`. |
| `HomeStory` | `.../HomeStory.tsx` | Server | Image plus copy plus "Our story" `TextLink` to `/community`. |
| `HomeFinalCta` | `.../HomeFinalCta.tsx` | Server | Full-bleed image with dark scrim, copy, `Button` copper variant (the only copper button on the page besides hero primary; see accessibility/copper rule). |
| `PublicNav`, `Footer` | `components/layout/` (TASK-036) | Server plus small mobile-menu client island | Nav data from `getSiteContent('nav')`/`('footer')` in the public layout. Sticky; active-route state via `aria-current`. |
| Section `Reveal` wrappers | existing `Reveal` | Client (existing) | Wrap section inner content from Upcoming downward only. |

Only client code on Home: `ResponsiveImage` (existing, for onError fallback), `Reveal`, the mobile menu island. No other `'use client'` files are added.

## 4. Data fetching and caching

- Prerendered static with ISR window 900 s (`revalidate = 900`), plus on-demand tags from the revalidation webhook (TASK-114): `site:home`, `events`, and the per-event tags already mapped in ARCH-001 9 (event published/updated map to `site:home`).
- Fetchers come from TASK-111 (`getHomeContent`, `getUpcomingEventsForHome`), server-only, tagged, `React.cache` deduplicated, returning minimal DTOs (home needs only card fields plus `cover`).
- Parallelism: one `Promise.all` in the page for the two independent fetches (nav/footer are fetched by the layout in parallel by Next, not by the page). No waterfalls: event cover media is already in `EventCardDto.cover`.
- Failure behaviour: if `getUpcomingEvents` fails, `HomeUpcoming` renders an inline ErrorState-lite message (not a page error) while the rest renders; if `getSiteContent('home')` fails the route `error.tsx` handles it. Use `Promise.allSettled` for the events branch only.
- Upcoming list: server filters status upcoming/open, sorted by `startsAt`, limit 3; date and time formatted server-side in IST with `lib/format/date.ts` (no client date logic, no hydration mismatch).

## 5. Images

- All images through `ResponsiveImage` with `MediaRef` props from the DTO (src, width, height, focal, blurDataUrl, alt).
- Slots (sizes.ts presets; add presets only if missing): hero 4:5 on mobile to 5:4 desktop (`slot="hero"`, `priority`), event card 4:3 (`slot="card"`), first-visit and story 4:3 or 1:1, stands 4:5, final CTA full-bleed 16:9 with `sizes="100vw"`. Only the hero image is `priority`; everything else lazy.
- Focal points: every fixture MediaRef carries a `focal` so the hero crop on mobile keeps faces; verified visually at 360, 768, 1280 widths.
- Alt text: meaningful sentences describing the scene, supplied in CMS data (reference alts are good as a starting set). Event card cover alt describes the photo, not repeats the title as the reference does. Decorative treatment (`decorative: true`) only for the final-CTA background if the copy fully carries meaning; otherwise real alt.
- Hero tag ("REAL BOARDS / REAL PEOPLE") is text inside the figure, not part of the image, so it is translatable and readable.
- Performance: no image larger than the slot needs; LCP element is the hero image or h1 (target LCP under 2.5 s on mobile profile); CLS 0 via aspect boxes.

## 6. Motion (CSS plus `Reveal`)

- Opening copy reveal: CSS-only keyframe on hero copy (opacity and translateY, 500 ms, staggered by `reveal-delay-*`), applied through a class that is disabled under `prefers-reduced-motion: reduce`. Must not delay LCP: image is not animated, h1 stays visible in server HTML.
- One-time section reveal: `Reveal` around section content from Upcoming downward; stagger event cards and promises (`delay` 0 to 3).
- Subtle image scale: CSS `transform: scale(1.04)` to `1` on hover/reveal for the final CTA and story images, transform only; parallax is skipped (not required where performance is uncertain).
- Reduced motion: all of the above collapse to final state with no transition; verified by test that no `data-reveal` hidden state is applied and CSS animation is `none`.
- No motion carries information; no autoplay media; no carousel on Home (reference has none).

## 7. Accessibility

- One `h1` (hero), `h2` per section, `h3` for cards, promises and principles, no skipped levels. `Heading` primitive enforces levels.
- Landmarks: `header` (nav) with `nav aria-label="Primary"`, single `main` (from `MainLandmark`), each section labelled by its h2 (`aria-labelledby`), `footer`.
- Links have unique accessible names: the three card CTAs add visually hidden context ("Save my board for Saturday Social"). Arrows are decorative (`aria-hidden`).
- Colour: body Ink on Parchment, light text on Forest band and on the photo scrim (scrim guarantees 4.5:1 for body text, 3:1 large). Copper used for the primary CTA and final CTA only; no copper body text.
- Focus: visible focus ring from tokens on all links and buttons, skip link already exists, no focus traps.
- Touch targets at least 44 px on mobile for nav, CTAs and card links.
- axe test (`src/test/axe.ts`) on the rendered page with zero violations; manual keyboard and screen reader pass.

## 8. SEO metadata

- `generateMetadata` using TASK-112 helpers: title absolute "Pawn's Gambit | Social chess in Hyderabad" (from `meta` section `titleTemplate` and `defaultCity`), description from `meta.description` or hero lede plus body (max 160 chars), canonical `/`, Open Graph and Twitter card with the hero image (1200x630 derived), `robots` index/follow inherited from the public layout.
- JSON-LD `Organization` (name, url, logo) and `WebSite` on Home, produced with the safe JSON-LD serialiser from TASK-112 (escapes `<`); no `Event` JSON-LD on Home (belongs to event detail).
- Home in the sitemap with priority 1.0 and `lastmod` from the `site:home` `updatedAt`.
- All content present in the raw server HTML (verified by TASK-116 style assertion).

## 9. Task list (dependency ordered)

Legend: REUSE means existing TASK-ID, no new work for Home beyond the stated check. Owner is frontend-engineer unless stated.

### Prerequisites from PLAN-001 (must be done; not re-planned here)
- TASK-018 mock adapter core and public fixtures (pending). Home adds fixtures in HOME-01.
- TASK-111 public server data layer (pending, depends on TASK-018).
- TASK-112 SEO layer (pending).
- TASK-034 domain components; only `EventCard` is a Home blocker. Recommend splitting out `EventCard` as TASK-034a so Home does not wait for BoardCard, RatingPoolCard, ResultRow, Timeline, MetricTile (Q5).
- TASK-036 PublicNav and Footer (pending). Auth-aware part deferred (see Decisions 5).
- Reused and complete: TASK-010, 011, 012, 013, 025, 026, 032, 035, 120.

### HOME-01 Home fixtures and image set
- Goal: a `home` site-section fixture and 3 upcoming-event fixtures matching the reference copy, with distinct licensed images, alt text and focal points.
- Dependencies: TASK-018, TASK-016, TASK-005 (ASSET-INVENTORY).
- Files: mock public fixtures (`lib/api/mock/fixtures/home.ts`, `events.ts`), `next.config` remotePatterns check, `/public` or Storage references.
- Notes: copy exactly from 01-home.html; dates relative to build time not hard-coded 24 Oct; fixtures validated by `siteSectionDtoSchema` and `eventSummarySchema` in a test. Hero, 3 card covers, first-visit, stands, story, final CTA = 8 MediaRefs, no repeats of the same photo within a viewport.
- Acceptance: fixture parses with the zod schemas; every MediaRef has non-empty alt and a focal; image hosts allowed by `next.config`; copy lint finds none of the banned phrases in DESIGN-SYSTEM.
- Tests: unit (schema parse, alt present, banned phrases).
- Risk: low. Status: pending.

### HOME-02 Nav and Footer for Home (refine TASK-036)
- Goal: sticky `PublicNav` and `Footer` rendered by the public layout, static log-in link, mobile menu island.
- Dependencies: TASK-013, TASK-026, TASK-029, HOME-01 (nav and footer fixtures; extend HOME-01 to include `nav` and `footer` sections), TASK-111 (nav/footer fetch). Drops the TASK-023 dependency for first delivery.
- Files: `components/layout/PublicNav.tsx`, `MobileMenu.tsx` (client), `Footer.tsx`, `app/(public)/layout.tsx`.
- Notes: brand mark "PG" plus "PAWN'S GAMBIT", links Play, Community, Stories, Past events, "Log in", primary CTA "Find my next game". `aria-current="page"` from pathname in the client island only (keeps nav server-rendered). Mobile menu uses existing Dialog/Sheet.
- Acceptance: nav sticky with border-bottom (no shadow card); keyboard-operable mobile menu with focus return and Escape; footer tagline and links from CMS; axe clean.
- Tests: component tests for menu open/close and focus; axe.
- Risk: medium. Status: pending (this is TASK-036 refined).

### HOME-03 EventCard home variant (refine TASK-034, or TASK-034a)
- Goal: border-based event card matching `approved-card`.
- Dependencies: TASK-026, TASK-032, TASK-012.
- Files: `components/domain/EventCard.tsx` and test.
- Notes: props are `EventCardDto`; date chip "SAT 24 OCT" and time range "5:00 PM - 8:30 PM" via IST formatters; type and audience as mono labels; no rounded SaaS card (hairline borders, square corners per tokens); stretched CTA link with visually hidden event title; `placesLeftHint` and `firstTimerCount` not shown on Home variant.
- Acceptance: renders from fixture; one tab stop per card; accessible CTA name includes the title; snapshot at three widths; no client JS.
- Tests: unit and axe.
- Risk: low. Status: pending.

### HOME-04 Hero section
- Goal: `HomeHero` per reference including LCP image.
- Dependencies: HOME-01, TASK-025, TASK-026, TASK-032.
- Files: `components/public/home/HomeHero.tsx`, CSS utilities if needed.
- Notes: accent line style from tokens (no extra copper); proof list as `ul` with separators; CSS opening reveal class (Section 6); hero `ResponsiveImage priority`; tag text overlay.
- Acceptance: single h1; hero image is the only `priority` image; CTAs link `/play` and `/community`; server HTML contains all hero text; reduced motion shows static state; layout stable (CLS 0) at 360, 768, 1280.
- Tests: component test, axe, reduced-motion CSS assertion.
- Risk: low. Status: pending.

### HOME-05 Upcoming games section
- Goal: `HomeUpcoming` with 3 `EventCard`s, head, see-all link, empty and partial-failure states.
- Dependencies: HOME-03, HOME-04 (shared section styles), TASK-028 (EmptyState/ErrorState), TASK-035.
- Files: `HomeUpcoming.tsx`.
- Notes: grid 1 col mobile, 3 col from 960 px with hairline dividers; `Reveal` with stagger; handles 0, 1, 2, 3 events.
- Acceptance: renders 3 cards from fixture; empty state links to `/play`; failed fetch shows inline message while page still renders; no layout break with 1 or 2 events.
- Tests: component tests for each count and error branch.
- Risk: low. Status: pending.

### HOME-06 Lower sections: first visit, stands, story, final CTA (refines TASK-041)
- Goal: `HomeFirstVisit`, `HomeStands`, `HomeStory`, `HomeFinalCta`.
- Dependencies: HOME-01, HOME-04 (shared styles), TASK-032, TASK-035. TASK-033 (carousel) dependency from TASK-041 is dropped because screen 01 has no carousel (Decisions 3).
- Files: four server components under `components/public/home/`.
- Notes: Forest band contrast; final CTA scrim; `ol` for promises; `Reveal` per section; subtle image scale on hover/reveal (transform only). Copper limited to final CTA button.
- Acceptance: all four render from fixture; h2/h3 order correct; contrast checks pass (4.5:1 body); images lazy; reduced-motion removes scale and reveal; no extra `'use client'`.
- Tests: component tests, axe, contrast token test.
- Risk: low. Status: pending.

### HOME-07 Page composition, data fetching and metadata (refines TASK-040)
- Goal: replace `PlaceholderPage` with the real page: parallel fetch, section composition, `generateMetadata`, JSON-LD.
- Dependencies: HOME-02, HOME-04, HOME-05, HOME-06, TASK-111, TASK-112.
- Files: `app/(public)/page.tsx`, `app/(public)/loading.tsx` check (skeleton only needed for dev; prerendered), `lib/api/server/home.ts` (if TASK-111 did not provide a composed helper).
- Notes: `Promise.all`/`allSettled` as in Section 4; keep `revalidate = 900`; metadata per Section 8; no request APIs.
- Acceptance: `next build` reports `/` as static (prerendered, revalidate 900); `check:build-output` passes; raw HTML contains h1, 3 event titles, all section headings and JSON-LD; metadata, canonical and OG present; fetches start concurrently (test with delayed mocks showing total time near max, not sum).
- Tests: integration render test with mock adapter, build-output check, concurrency test.
- Risk: medium. Status: pending.

### HOME-08 Home verification: a11y, performance, visual, SEO (feeds TASK-116)
- Goal: prove acceptance end to end. Owner: test-engineer.
- Dependencies: HOME-07, TASK-009 (test harness), TASK-116 (extend with Home cases).
- Files: Playwright specs `e2e/home.spec.ts`; axe; Lighthouse CI config.
- Notes: viewports 360, 768, 1280; reduced-motion emulation; no-JS render (content visible); CSP check shows no violations on `/`; keyboard walk-through; bundle budget (public content page 170 KB, fonts on Home 150 KB).
- Acceptance: axe zero violations; Lighthouse mobile Performance at least 90, Accessibility 100, SEO 100; LCP under 2.5 s, CLS under 0.05 on the mock build; route JS within `budgets.json`; visual diff against 01-home.html screenshot reviewed by owner; revalidation test (publish `site:home` and see change on next request) passes.
- Risk: medium. Status: pending.

## 10. Dependency graph and parallel work

```
TASK-018 -> TASK-111 -> (HOME-07)
TASK-018 -> HOME-01 -> HOME-02 (also TASK-111)
                    -> HOME-04 -> HOME-05 (needs HOME-03)
                    -> HOME-06
TASK-112 -----------------------> HOME-07
HOME-02, 04, 05, 06 -> HOME-07 -> HOME-08
HOME-03 (EventCard) can start now (no data dependency)
```

Parallel groups once TASK-018 lands: [HOME-01, HOME-03] first (HOME-03 can start immediately); then [HOME-02, HOME-04, HOME-06] together; HOME-05 after HOME-03 and HOME-04; HOME-07 is the join; HOME-08 last. Critical path: TASK-018, TASK-111, HOME-01, HOME-04, HOME-05, HOME-07, HOME-08.

## 11. Mapping to existing TASK-IDs

| Existing | Action |
|---|---|
| TASK-010/011/012/013/025/026/032/035/120 | Reuse, complete |
| TASK-018, 111, 112 | Prerequisite, unchanged |
| TASK-034 | Refine: split `EventCard` out as TASK-034a (HOME-03) |
| TASK-036 | Refine: ship without TASK-023 dependency (HOME-02) |
| TASK-040 | Replaced by HOME-04, HOME-05, HOME-07 (hero, upcoming, composition) |
| TASK-041 | Replaced by HOME-06; drop TASK-033 dependency; testimonials out of scope unless Q3 says otherwise |
| TASK-116 | Extend with HOME-08 cases |

## 12. Open questions

- Q1. Confirm no GSAP (approved P3 / D-10) versus the DESIGN-SYSTEM.md mention of GSAP. This plan assumes CSS plus `Reveal`.
- Q2. Card CTA wording: "Save my board" (reference) or "Save my place" (copy rules)?
- Q3. Should Home include testimonials or a featured story (TASK-041, ARCH-001 line 740) even though screen 01 does not show them? `HomeContentDto` would need a testimonials field.
- Q4. Ok to ship nav with a static "Log in" link first and add the auth-aware state when TASK-023 lands?
- Q5. Ok to split `EventCard` out of TASK-034 as TASK-034a?
- Q6. Image source for fixtures and production: the reference uses Unsplash URLs; confirm licensed PG photography will replace them and which host is in `remotePatterns`.

## Addendum A1 (2026-10-23): owner decisions and architect verdicts

Authority: DEC-029 (`docs/decisions/2026-10-23-gsap-motion-library.md`). Where this addendum and sections 2, 6, 12 differ, the addendum wins.

### A1.1 Resolved
- Q1 resolved: GSAP approved with constraints (DEC-029). CSS plus `Reveal` stays the default and the fallback.
- Q2 resolved: event card CTA is "Save my board" (fixture/CMS content, not component code). Accessible name still adds the event title via visually hidden text.

### A1.2 Motion changes to this plan
- Hero opening reveal: stays CSS keyframes (no GSAP, no LCP risk).
- Section reveal (Upcoming downward) and subtle image scale (story, final CTA): server components mark elements with `data-motion="reveal"` / `data-motion="scale"`; they are NOT wrapped in `Reveal` on Home. One `HomeMotion` client island (renders null) is mounted in `page.tsx`; it dynamically imports `gsap` core at idle, only when motion is allowed. No ScrollTrigger, no parallax.
- Section 3 "Only client code on Home" becomes: `ResponsiveImage`, mobile menu island, `HomeMotion`. The `Reveal` row in the component table becomes "not used on Home".
- Section 6 "CSS plus Reveal" bullets for section reveal and image scale are replaced by the GSAP behaviour above; the reduced-motion and no-JS rules are unchanged and now also include "gsap chunk is not requested".

### A1.3 New task HOME-09 GSAP motion island (before HOME-06 acceptance; parallel with HOME-04)
- Owner: frontend-engineer | Risk: medium | Status: pending
- Goal: `components/ui/motion/gsap/HomeMotion.tsx` per DEC-029; pinned `gsap` exact version; licence exception in policy-exceptions; ESLint restricted import; budget keys in `web/budgets.json`; `check:bundle` assertions.
- Dependencies: TASK-010 (tokens), TASK-035 (Reveal kept), TASK-007 baseline, OPS-002 supply-chain task (for the exception).
- Acceptance: gsap absent from `/` initial chunks; motion chunk at or under `other.motionChunkGzip` and requested only after idle; no chunk request under reduced motion; page complete with JS disabled and with the chunk blocked; no element in the first viewport ever gets `opacity:0`; CLS unchanged; StrictMode safe (`revert`); live reduced-motion toggle reverts tweens.
- Tests: unit with mocked `gsap` (matchMedia, revert), Playwright (no-JS, blocked chunk, reduced-motion emulation, network log), bundle check.
- HOME-04, HOME-06 add `data-motion` markers; HOME-08 adds the cases above and a TBT comparison to the CSS-only build.

### A1.4 Architect verdicts on other open points
- Q5 split `EventCard` as TASK-034a: APPROVED. Server component, no client JS (already TASK-034 acceptance), no data dependency, unblocks Home. TASK-034 keeps the remaining domain components and depends on 034a. Update TASKS-P0-P2.md and TASKS-P3-P5.md dependency lists (TASK-040 uses 034a).
- Q4 static "Log in" link until TASK-023: APPROVED. Constraints: link to `/login` as a plain `TextLink`; nav stays a Server Component and prerendering of `/` must not change (no cookies/headers read); the later auth-aware swap is the client island already specified in ARCH-001 line 917 and must not make the layout dynamic. TASK-036 keeps TASK-023 only for the swap.
- Q6 image host / remotePatterns: `web/next.config.ts` allows exactly one host (`NEXT_PUBLIC_SUPABASE_STORAGE_HOST`) and one bucket path; mock builds use local `/placeholders/*`. Verdict: do NOT add Unsplash or any wildcard to `remotePatterns` or CSP `img-src`. Mock/fixture images are local files in `web/public/placeholders/` (distinct per slot, 8 files); production images are PG photography uploaded to the Supabase bucket. The reference's repeated Unsplash photo is a prototype artefact only. Focal points: required on every `MediaRef` (schema clamps 0 to 1, per SEC F-14), set by the editor in the media library; fixtures give each of the 8 refs an explicit focal; hero verified at 360/768/1280 (HOME-04 acceptance). Owner must supply licensed photos (decision below).
- Q3 omitting testimonials from Home: ACCEPTABLE ARCHITECTURALLY for first delivery (the reference has no block, `HomeContentDto` has no testimonials field, no cost to add later), but it deviates from FR-16 ("none means the section is omitted" implies Home may show testimonials) and TASK-041/ARCH-001 line 740. Not an architecture call: needs a product ruling. Recommended handling if omitted: amend FR-16 wording to "when the Home design includes a testimonials block", edit ARCH-001 line 740 to drop `getTestimonials`/`getStories` from the Home `Promise.all`, and move the testimonial layout (1 to 3 grid, 4+ carousel) to the Community/preview tasks (TASK-075), keeping `testimonialLayout(count)`. Also drop TASK-033 from TASK-041 as planned.
