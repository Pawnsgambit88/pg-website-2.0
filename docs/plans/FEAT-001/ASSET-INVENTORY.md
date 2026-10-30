# ASSET-INVENTORY (TASK-005)

Status: complete, v1 (pending owner input on section 6 and verification items in section 8)
Date: 2026-10-21
Owner: product-manager
Plan: PLAN-001 / FEAT-001 (task entry in `docs/plans/FEAT-001/TASKS-P0-P2.md`)
Consumers: TASK-010/011 (tokens, fonts), TASK-026 (Icon set), TASK-032 (ResponsiveImage, `remotePatterns`), TASK-033 (Carousel), TASK-099 (CLS), TASK-103 (PWA icons), TASK-112 (OG image), TASK-115 (hosting)

Note on location: the task entry says `docs/designs/asset-inventory.md`; this file is at the path requested for this run. Move or link it if the plan path must stay literal.

Method: grep extraction over `Frontend reference/assets/styles.css`, all 58 files in `Frontend reference/screens/`, `design-tokens.json`, and the DESIGN-HANDOFF, DESIGN-SYSTEM, UI-SPECIFICATION, CONTENT-GUIDE, COPY-BASELINE, OWNER-LAUNCH-INPUTS, CMS-SPEC, COMPONENT-CATALOG, LAUNCH-CHECKLIST and QUALITY-REPORT docs, plus `docs/requirements/FEAT-000-feature-inventory.md` for the hosting decision (OQ-06). Nothing was downloaded or fetched. Licence statements below are expectations from general knowledge, not verified against the live sources.

## 0. Summary

| Asset class | Count found | Headline |
|---|---|---|
| Font families | 3 | Newsreader, Anek Latin, Fragment Mono, all hot-linked from Google Fonts in every screen. Reference requests no Newsreader italic file, so its italics are browser-synthesised. |
| Distinct external photos | 7 | All Unsplash (`images.unsplash.com`), 37 uses across 15 screens (33 `<img>` + 4 CSS `background-image`). None is PG photography. |
| Photographs of real PG people or spaces in the reference | 0 | Owner must supply. A "REAL BOARDS / REAL PEOPLE" tag currently sits on a stock photo. |
| In-house SVG icons shipped in the handoff | 0 | `Icon.tsx` is described in COMPONENT-CATALOG but is not in the folder. Screens use text glyphs and CSS shapes. 3 observed, about 9 implied. |
| Inline SVG graphics | 1 | Rating sparkline (`30-rating.html`), data visual, not an icon. |
| Logo files in the reference | 0 | Brand is a CSS roundel "PG" plus text wordmark "PAWN'S GAMBIT". A different legacy logo exists in `public/`. |
| Favicon, OG image, manifest icons in the reference | 0 | No `<link rel=icon>`, no `og:*` meta in any screen. |
| Video, audio, embeds | 0 | The only "autoplay" hits are the carousel autoplay select in the admin media editors. |

## 1. Fonts

Source of truth: `assets/styles.css` `:root` (`--font-display`, `--font-ui`, `--font-mono`), `design-tokens.json`, DESIGN-SYSTEM.md. No `@font-face` and no `@import` exist. Every screen loads one Google Fonts CSS2 URL:

`https://fonts.googleapis.com/css2?family=Anek+Latin:wdth,wght@75..125,300..800&family=Fragment+Mono:ital@0;1&family=Newsreader:opsz,wght@6..72,300..800&display=swap`

plus `preconnect` to `fonts.googleapis.com` and `fonts.gstatic.com`.

| Family | Role (token) | Reference fallback | Weights / styles actually used in CSS | Axes requested vs needed |
|---|---|---|---|---|
| Newsreader | Display: headlines, quotes, large numerals, card titles, brand name (`--font-display`) | `Georgia, serif` | Roman: 300, 350 (only on `em` in manifesto/auth-story/type-spec rules), 390, 400, 430 (main H1/H2), 450 (big numerals), 480, 500 (H3/card titles), 520, 550, 600 (brand name). Italic: hero accent word (390), `<i>` between players in live pairing, `em` in headlines. | Requested `opsz 6..72` and `wght 300..800`. Max weight used is 600, so 700-800 are unused. `opsz` is useful for the large headlines. **No `ital` axis requested, so the reference italics are faux oblique.** |
| Anek Latin | UI: body (17px, 400 by default), nav, forms, dense tables (`--font-ui`) | `'Arial Narrow', sans-serif` | 400 (implicit), 600 (field labels, builder steps), 650 (UI headings, active nav, admin links), 700 (event-card CTA). | Requested `wdth 75..125` and `wght 300..800`. No `font-stretch` anywhere in the CSS, so the **width axis is unused**. Weights 300-399 and 800 are unused for Anek. |
| Fragment Mono | Utility: eyebrows, dates, ratings, board numbers, buttons, badges (`--font-mono`) | `ui-monospace, monospace` | 400 only in practice, set through `font: .Nrem var(--font-mono)` shorthand. `.status-badge` sets 600, which has no real face (see decisions). | Requested `ital 0;1`. No mono italic usage found. Fragment Mono is expected to ship Regular and Italic only (verify). |

| Item | Recommendation |
|---|---|
| Licence | All three are expected to be SIL Open Font License 1.1 (listed on Google Fonts). **Verify on each family's Google Fonts page or upstream repository before launch**, and commit each OFL text beside the font config (TASK-011 acceptance: "licences committed"). OFL permits self-hosting and subsetting; it forbids selling the fonts on their own. If the subset is renamed or modified, check the Reserved Font Name clause for that family. |
| Self-host approach | Default: `next/font/google` in `web/src/app/fonts.ts`. It downloads at build, serves from our own origin, makes no runtime request to Google, splits `unicode-range` subsets and generates size-adjusted fallbacks automatically. Switch to `next/font/local` with committed woff2 files only if (a) CI cannot reach Google at build time, (b) deterministic offline builds are required, or (c) the 150 KB Home font budget needs tighter axis trimming than Google's variable files allow. Final choice belongs to ARCH-001 (open decision D1). |
| Newsreader config (indicative) | Variable, `style: ['normal','italic']` (italic file only if the designer approves the true italic), `axes: ['opsz']`, `display: 'swap'`, CSS variable `--font-display`. |
| Anek Latin config (indicative) | Variable weight, **omit the `wdth` axis**, `display: 'swap'`, CSS variable `--font-ui`. |
| Fragment Mono config (indicative) | `weight: '400'`, `style: ['normal']`, `display: 'swap'`, CSS variable `--font-mono`. |
| Preload | Preload Newsreader roman and Anek Latin roman (both above the fold). Fragment Mono is also above the fold (eyebrow, proof strip, buttons); preload it only if the swap flash is visible in measurement. Do not preload italic or latin-ext files. |
| Subsetting | `latin` required. `latin-ext` is **needed only if** the brand fonts must render `₹` (U+20B9). In Google's split, `₹` is expected to sit in latin-ext, not latin (verify). Prices appear on every event card, so either include latin-ext for Newsreader and Anek Latin, or accept a system-font `₹`. Recommendation: include latin-ext where the family actually contains the glyph; do not add other subsets. |
| Glyph coverage checks (all three families) | `₹` U+20B9, `−` U+2212 (rating deltas), `→` U+2192 (used in 46 of 58 screens), `✓` U+2713 (event-room timeline), `·` U+00B7, `’` U+2019, `—` U+2014, `•` U+2022. Expect `→` and `✓` to be missing from the fonts and fall back to system glyphs. Use the in-house Icon set for arrow and check instead of text glyphs. |
| Fallback metrics | Let `next/font` generate the size-adjusted fallback faces (default `adjustFontFallback`). Do not hand-copy the reference fallbacks: `Arial Narrow` is not present on macOS/Android/iOS and would give a different layout per device. Expected fallbacks: Times New Roman metrics for Newsreader, Arial for Anek Latin, Courier New for Fragment Mono. Acceptance from TASK-011: font-swap CLS under 0.02 on Home; confirm by measurement. |
| Budget | TASK-011 target: font payload on Home under 150 KB. Three variable families plus an italic could exceed this. Measure early; levers in order: drop Newsreader italic, drop latin-ext for Fragment Mono, restrict axes through local files. |
| OG image fonts | `next/og` (Satori) needs raw font bytes (TTF/OTF/WOFF; WOFF2 is not expected to work, verify). The OG route needs its own committed font file(s) regardless of the `next/font` choice (TASK-112 loads them at module level). |
| CSP / security | AUTH-SECURITY.md line 36 lists Google Fonts in the CSP. After self-hosting, remove `fonts.googleapis.com` and `fonts.gstatic.com` from `style-src`/`font-src`. |
| Non-Latin scripts | Not in scope by default (Latin-only families). If the owner expects Telugu, Hindi or Urdu names or content, those fall back to system fonts. Open question Q-A1 in section 8. |

## 2. Images

All images in the reference are Unsplash URLs of the form `https://images.unsplash.com/photo-<id>?auto=format&fit=crop&fm=jpg&q=82&w=<2200|1800>` (the two older ones use `w=1800&q=88` with no `fm`). No local image files exist in the reference. No `srcset`, `<picture>` or `loading` attributes are used; all `<img>` have empty `class=""` and an `alt`.

### 2.1 Distinct images

| Key | Unsplash photo id | Param set | Roles in the reference (slot) | Screens | Uses | Reference alt text (examples) |
|---|---|---|---|---|---|---|
| IMG-01 | `photo-1734467358727-1061f433212d` | w=2200, q=82, fm=jpg | Home hero (`hero` slot); "Saturday Social" event card; Home final CTA (`final_cta` slot); event detail hero; registration side-panel backdrop (CSS `background-image`); admin media "Home hero"; event-builder media; control-room gallery | 01, 02, 03, 18, 19, 20, 21, 34, 43, 52 | 12 | "People enjoying a chess game together in a warm cafe" |
| IMG-02 | `photo-1729023454822-f7bd987a59cb` | w=1800, q=82, fm=jpg | "Beginner Circle" event card; Home community slot; Community page; Stories thumbnail; My events card; admin media "Community" | 01, 02, 06, 07, 23, 34 | 7 | "A group gathered around chess boards"; "PG regulars around a chess table" |
| IMG-03 | `photo-1762744594797-bcfd17a8c032` | w=1800, q=82, fm=jpg | "After Work Blitz" event card; "Midnight Blitz" past event; My events card; admin media | 01, 02, 05, 23, 34 | 5 | "After Work Blitz"; "Midnight Blitz" |
| IMG-04 | `photo-1771584189767-1c9984005bc0` | w=1800, q=82, fm=jpg | Home hospitality slot ("First visit"); Community page; admin media | 01, 06, 34 | 3 | "A relaxed chess game over coffee" |
| IMG-05 | `photo-1741926677819-c7543a44d2f2` | w=1800, q=82, fm=jpg | Home story slot ("Our story"); admin media | 01, 34 | 2 | "A warm cafe filled with people playing chess" |
| IMG-06 | `photo-1543092587-d8b8feaf4df1` | w=1800, q=88 | "Monsoon Open" completed-event hero; Past events card; Stories thumbnail; My events card | 04, 05, 07, 23 | 4 | "Players concentrating during Monsoon Open" |
| IMG-07 | `photo-1560174038-da43ac74f01b` | w=1800, q=88 | "Coffeehouse Rapid" past event; Stories thumbnail; admin media; control-room gallery | 05, 07, 34, 52 | 4 | "Coffeehouse Rapid"; "Event gallery image" |

Totals: 7 distinct photos, 37 uses (33 `<img>`, 4 CSS backgrounds), 15 of 58 screens (01, 02, 03, 04, 05, 06, 07, 18, 19, 20, 21, 23, 34, 43, 52). Slot mapping for Home was inferred from document order and confirmed by the admin media screen (34) labels: hero = IMG-01, hospitality ("First visit") = IMG-04, community = IMG-02, story ("Our story") = IMG-05, final CTA = IMG-01.

### 2.2 Status of each image

| Key | Stock or real PG | Source host | Licence / attribution | Photographer, model release | Ship / replace / placeholder |
|---|---|---|---|---|---|
| IMG-01 to IMG-07 (all) | Stock. Not PG photography. Alt text describes generic "a warm cafe", not PG's venues. | `images.unsplash.com` (Unsplash CDN) | Unsplash License is expected (free use, no attribution required). **Unverified per photo**: no photographer or page URL is recorded anywhere in the handoff. The Unsplash License does not provide model or property releases, so identifiable people are not cleared for brand-claim use. | Unknown for all 7. | **Replace before launch.** Never ship the hot-linked URLs. In development, use neutral placeholders (section 6.2). |

Specific content problems to resolve when replacing:

| Issue | Where | Action |
|---|---|---|
| "REAL BOARDS / REAL PEOPLE" tag overlays IMG-01 | Home hero (`approved-media__tag`, COPY-BASELINE "Media note") | The tag is a factual claim. Do not launch it over a stock photo. Gate launch on real photo (section 6.1). |
| Alt text asserts identity: "PG regulars around a chess table" (IMG-02), "Players concentrating during Monsoon Open" (IMG-06) | 06, 04 | Alt text must describe the actual replacement photo. Do not carry reference alt text into production. |
| Sample events (Saturday Social, Monsoon Open, Midnight Blitz, Coffeehouse Rapid) are mock content paired with stock photos | 01, 02, 04, 05, 23 | Mock only. Real event media comes from each event's media collection (CMS-SPEC). |
| Design brief forbids isolated chess-piece stock as the dominant language | DESIGN-SYSTEM, UI-SPECIFICATION, DESIGN-HANDOFF | The 7 images are people-and-cafe scenes and match the brief visually. Replacements must also be people-first (hands, clocks, faces, post-game conversation). |

### 2.3 Non-photo imagery

| Asset | Where | Note |
|---|---|---|
| Avatar | `avatar-static`, `.avatar` (initials, e.g. "KR", "AM") on 27 and elsewhere | Initials only. No avatar photos exist. COMPONENT-CATALOG says Avatar is photo with initials fallback; real photos need consent. |
| Testimonial photo | `photo-placeholder` "ADD PHOTO" (1:1) in `36-admin-testimonials` | Placeholder only. Public testimonial cards (`.testimonial-card img`, 4:3) have no sample photo. Real photos need consent (Keerthy Ganta, Parth Thakkar per OWNER-LAUNCH-INPUTS). |
| Empty media frame | `.media-frame--empty` gradient `paper-2` to `#d4cab9`, min-height 280px | Reuse as the no-photo state (CMS-SPEC: 0 assets = placeholder). |
| Gradient scrims | `.final-photo-cta:after`, `.registration-static__event:before` | CSS only, no asset. |

### 2.4 Target dimensions and `next/image` approach

Aspect ratios and sizes are derived from `styles.css` (shell = `min(1440px, 100vw - 72px)`; stacking breakpoints in the CSS are 1180, 960, 900, 720, 640, 520 px; confirm the exact stacking point per slot in TASK-032). The reference gives no pixel sources (only requested widths 1800 and 2200 with unknown native ratios), so ratios below are slot-driven recommendations, not extracted values.

| Slot | Reference CSS | Displayed ratio (desktop) | Recommended master upload | `sizes` preset (indicative) | Loading |
|---|---|---|---|---|---|
| Home hero | `.approved-media`: height `min(54vh,620px)`, min-height 400px, in the 1.1fr column of a .9fr/1.1fr grid | about 1.3:1, varies with viewport height | 2400 x 1600 (3:2), focal point required | `(min-width:1512px) 800px, (min-width:961px) 55vw, 100vw` | **`priority`** (LCP). Only this image is eager on Home. |
| Event card (Home, Play) | `.approved-card__media`: aspect `16/8.8`, 3 columns | 1.82:1 | 1600 x 880 | `(min-width:1512px) 480px, (min-width:961px) 33vw, 100vw` (use `85vw` on mobile if the cards become a horizontal scroller) | lazy |
| Hospitality | `.hospitality-static__media`: min-height 500px, .9fr column | about 5:4 | 1600 x 1280 | `(min-width:961px) 47vw, 100vw` | lazy |
| Community | `.community-static__image`: min-height 430px, 1fr/1fr | about 16:10 | 1600 x 1000 | `(min-width:961px) 48vw, 100vw` | lazy |
| Story | `.story-static__image`: min-height 480px, 1fr/1fr | about 7:5 | 1600 x 1120 | `(min-width:961px) 48vw, 100vw` | lazy |
| Final CTA | `.final-photo-cta > img`: min-height 620px, full bleed, cover | about 21:9 desktop, near-portrait on mobile | 2560 x 1440 (16:9), strong focal point | `100vw` | lazy (below the fold) |
| Event detail hero (03, 04) | `.event-hero__media`: aspect `4/3`, 1fr / 1.12fr | 4:3 | 1600 x 1200 | `(min-width:961px) 52vw, 100vw` | **`priority`** on event detail (LCP) |
| Past event, story, my-events cards | `.media-frame` fixed 280px height or 4/3 | 4:3 to 5:3 | 1200 x 900 | `(min-width:961px) 33vw, 100vw` | lazy |
| Gallery / admin media tile | `.media-tile` aspect `4/3` | 4:3 | same master as source | `(min-width:961px) 20vw, 50vw` | lazy |
| Testimonial photo | `.testimonial-card img` aspect `4/3`; admin placeholder 1:1 | 4:3 (card) | 1200 x 900; allow square crop | `(min-width:961px) 33vw, 100vw` | lazy |
| Avatar | 1:1 circle, 34-44px | 1:1 | 400 x 400 | fixed small sizes | lazy |
| Registration backdrop (18-21) | CSS `background-image` with gradient scrim | cover of a half-width panel | reuse event hero master | use `next/image` `fill`, not CSS `url()` | lazy |

Rules for `ResponsiveImage` / `MediaFrame` (TASK-032):

| Rule | Detail |
|---|---|
| Never use CSS `background-image: url()` for content photos | The reference uses it on 18-21. Use `next/image` with `fill` so the optimiser, `sizes` and `alt` apply. |
| Aspect-ratio container, then `fill` | Prevents layout shift (acceptance: no CLS). |
| Focal point | CMS stores focal X/Y (FEAT-000 F-ACMS-005); apply as `object-position`. |
| Alt text | Required. Explicit "decorative" option. Missing alt is a type error. |
| One `priority` image per page | The LCP image only. |
| Formats and quality | WebP by default; AVIF is a cost versus size trade-off for TASK-115. If using Next 16 the `images.qualities` allow-list must include any non-default quality (reference used 82 and 88; recommend a single value around 75-80). Verify in TASK-032. |
| Blur placeholders | See section 6.2. |
| Source constraints at upload (backend ask) | Accept JPEG/PNG/WebP; recommend max long edge 4000 px; **strip EXIF (GPS, device) on upload** because real phone photos from private venues carry location data. |

### 2.5 Image host / CDN decision (Q16)

| Question | Recommendation |
|---|---|
| Where do real images live? | Supabase Storage (already decided in FEAT-000 OQ-06; public bucket for published media). |
| What goes in `remotePatterns`? | One entry: `protocol: 'https'`, `hostname: '<supabase-project-ref>.supabase.co'`, `pathname: '/storage/v1/object/public/<bucket>/**'`. Exact host and path, no wildcards. Supply the host from an environment variable so it can change. |
| What must not be in `remotePatterns`? | `images.unsplash.com` (never in production), wildcard `**` hosts (open optimiser proxy, cost and abuse risk). |
| Who optimises? | Vercel image optimisation through `next/image` (default loader). Supabase image transformations are an add-on and are not needed. Check Vercel plan quotas and cost for source-image count in TASK-115. |
| Host will change | FEAT-000 says Postgres is moving from Seoul to a new Singapore project, so the Storage host will change. Do not store absolute image URLs in content. Store the object key or path and compose the URL at the edge of the API, so the migration is a config change. Alternatively front Storage with a custom domain (for example `media.<domain>`) so the hostname is stable. Open decision D2. |
| Mock mode | No remote host. Mock data points at local files under `web/public/placeholders/` (section 6.2), so `remotePatterns` is not exercised in mock mode. |
| Guard | Add a CI/Playwright assertion that built HTML and network traffic contain no `images.unsplash.com`, `fonts.googleapis.com` or `fonts.gstatic.com` request. |

## 3. Icons

Finding: the handoff folder contains no `Icon.tsx`, no `.svg` and no `.tsx` files. COMPONENT-CATALOG.md describes an "in-house SVG icon set" at `src/components/Icon.tsx`, but the static screens contain **zero icon SVGs**. The only inline `<svg>` is the rating sparkline in `30-rating.html` (a `polyline`, viewBox `0 0 600 250`, `preserveAspectRatio="none"`, stroke `#B86A3B` width 4). The icon list below is therefore reconstructed from glyphs, CSS shapes and spec requirements, not copied from a real set. The designer or TASK-026 owner must confirm the list against the screens.

Style language (from COMPONENT-CATALOG): 24px viewBox, stroke-based, same language for any additions, no unrelated icon family. Not specified anywhere: stroke width, cap and join style, corner radius. Assumption for TASK-026 to fix once: `viewBox="0 0 24 24"`, `fill="none"`, `stroke="currentColor"`, stroke width 1.5, square or butt caps to suit the 2px radius language, coordinates at 1-2 decimals (TASK-026 note `rendering-svg-precision`). Decorative icons use `aria-hidden`; icon-only buttons need an accessible name (UI-SPECIFICATION).

| Icon (proposed module name) | Evidence | Confidence |
|---|---|---|
| `arrow-right` | Text glyph `→` in link labels ("See all events →", "Save my board →", "Our story →"); present in 46 of 58 screens | Observed |
| `check` | Text glyph `✓` in event-room timeline `.timeline-static .done b` (27) | Observed |
| `chevron-down` | CSS-drawn select arrow (two `linear-gradient` triangles on `select`) | Observed |
| `chevron-left`, `chevron-right` | `.carousel-actions button` (42 x 42 boxes with no glyph); carousel previous/next required by ACCESSIBILITY and TASK-033 | Implied |
| `pause`, `play` | Visible pause/play control required for carousel autoplay (WCAG 2.2.2, ACCESSIBILITY.md, TASK-033) | Implied |
| `menu`, `close` | Mobile menu trigger (`.menu-toggle`, `.icon-button`), RESPONSIVE-BEHAVIOR "menu trigger"; the reference shows a text label | Implied |
| Empty-state glyph | `.empty-state-v2__icon` (52px circle holding an icon) | Implied, content undefined |
| `calendar-add`, `map-pin`, `clock` | Add to calendar (UX-FLOWS), venue/map link (OWNER-LAUNCH-INPUTS), time control and clocks (event facts) | Candidate, confirm |

Counts: 0 icons shipped, 3 observed, about 5 implied (counting pairs as one family), 3 candidates. Treat roughly 14 modules as the starting set. Not icons, keep out of the set: the 8px `status-dot` (CSS, ok/warn), the `PG` roundel (brand), the sparkline (data visual; build as a small SVG component), `−` and `₹` (text characters, section 1). Also note carousel buttons are 42px in the reference but TASK-033 requires 44px hit areas.

Social/third-party marks: footer links are text-only in Home. If social or payment logos (Google sign-in, Razorpay) are wanted, they are third-party trademarks with their own brand guidelines and are not part of the in-house set. Confirm the Google sign-in button treatment against Google's branding rules in TASK-024 or the auth task (not verified here).

## 4. Brand mark, logo, favicon, OG image

| Asset | In the reference | Legacy repo (`public/`, not part of the new design) | Gap |
|---|---|---|---|
| Wordmark | Text: `<span class="brand__name">PAWN'S GAMBIT</span>` in Newsreader 600, 1.14rem, tracking -.03em | none | No vector wordmark. Rendered as live text, so it depends on the font loading. |
| Brand mark | CSS roundel: 34px circle, `--forest` (#243228) fill, "PG" in Newsreader, paper colour | `logo.png` (10417 x 10417 px, blue rounded square, grey chess pieces and a pawn cut-out), `logo.svg` (5000 x 5000 viewBox), `favicon.svg` (same 5000 viewBox and identical header, likely the same artwork; not diffed) | The legacy mark is a different identity: blue rather than the Parchment / Deep Forest / Burnished Copper system, and chess-piece imagery that the design brief moves away from. Owner must decide which identity is the production brand. |
| Production logo files | None. OWNER-LAUNCH-INPUTS: "Final production logo/brand assets if different from current wordmark treatment" | n/a | Needed if the wordmark treatment is not final: SVG, one-colour and reversed variants, minimum size and clear space. |
| Favicon set | None (no `<link rel="icon">` in any screen) | `favicon.svg` (5000 viewBox, too detailed for 16px) | Missing: `icon.svg` or `.ico`, 32 px, `apple-touch-icon` 180 px. App Router file conventions can host these. |
| PWA icons (optional, TASK-103) | None | none | 192, 512 and maskable 512, only if TASK-103 proceeds. Theme colour from tokens. |
| Default OG / share image | None; no `og:*` or `twitter:*` meta in any screen | none | Needed: default 1200 x 630 image for pages without event media; event pages use the event cover (TASK-112 generates cards). Needs the brand mark and an approved line of copy. |
| Brand colours | `design-tokens.json` and `:root` | n/a | Complete: paper #f4efe6, forest #243228, copper #b86a3b, ink #171614 and others. No action. |
| Third-party sports/club logos (legacy `lichess.svg`, `PCA.png`, `rmz.png`, `panda-chess.png`) | none in reference | present in legacy | Not in the new design; do not carry over unless the owner confirms and holds the rights. |

Other legacy items found in the old repo, not in the new design and not reviewed for content or rights: `public/anirudh.jpeg`, `public/sairam.jpeg` (appear to be named-person photos), `src/assets/carousel-home-s3/pic1-3.jpeg` and `src/assets/hero.png` (deleted in the working tree, present in git history), `public/chess-pawn/` (`pawn.obj`, `diffuse.jpg`, used by the legacy 3D pawn component). Treat all as candidates for the owner to review, never as shipped assets. The 3D pawn conflicts with the brief; do not port it.

## 5. Video and other media

| Media | Found | Note |
|---|---|---|
| Video (`<video>`, YouTube, Vimeo) | None | Nothing to host or poster. |
| Audio | None | |
| Iframes / map embeds | None | Venue links are plain URLs (owner input). |
| Animated/Lottie/canvas | None | Motion is CSS (reveal-on-scroll, hover scale 1.015, reduced-motion honoured). |
| Documents (PDF) | None | Legal pages are HTML routes. |
| Generated | Sparkline SVG; OG images (to be generated in TASK-112) | |

## 6. Needs from owner, and safe to use now

### 6.1 Needs from owner

| # | Item | Why / acceptance | Needed by |
|---|---|---|---|
| O1 | Real PG photographs with rights. Minimum set from the reference: 5 homepage slots (hero, hospitality, community, story, final CTA) plus 1 cover per published upcoming event (at least 3 to fill the 3-up grid), plus recap photos for any completed event shown. Roughly 8 distinct photos minimum for a credible launch. | LAUNCH-CHECKLIST "real PG photography uploaded"; people-first, real PG spaces; the hero tag "REAL BOARDS / REAL PEOPLE" must be true. | Before launch; placeholders cover development |
| O2 | Rights evidence per photo: photographer and credit line, written permission or release from identifiable people, **guardian consent for anyone under 18**, venue permission if required. | Unsplash-style licences do not cover this. Recorded in the media library's credit/rights field (F-ACMS-005). | With O1 |
| O3 | Brand decision and files: keep the "PG" roundel plus text wordmark, or supply a final logo; vector SVG (full colour, one colour, reversed), minimum sizes. Decide the fate of the legacy blue pawn logo. | Header, footer, favicon, OG. | Before TASK-010 closes the brand component; interim treatment is safe |
| O4 | Favicon / app icon source art and default share image (1200 x 630) with approved copy. | Section 4 gaps. | Before launch |
| O5 | Testimonial content: exact quotes, photos and consent for Keerthy Ganta and Parth Thakkar (and any others). | OWNER-LAUNCH-INPUTS. Unpublished records do not render, so not blocking development. | Optional at launch |
| O6 | Legal copy: privacy policy, terms, refund/cancellation, any waiver or conduct text, tax/invoice wording. | Routes and layout exist; wording requires owner or legal approval. | Before launch |
| O7 | Venue addresses and map links, public social and contact URLs. | Event pages, footer, JSON-LD. | Before launch |
| O8 | Licence decisions: confirm the three Google fonts are the final brand typefaces; confirm no hot-linked Unsplash image ships; decide whether to display photographer credits; decide whether the legacy photos and third-party logos in section 4 are owner-owned and wanted. | Section 8. | Before TASK-011 / TASK-032 close |
| O9 | Media storage details: Supabase Singapore project, bucket name, public versus signed access, and whether to use a custom media domain. | Fixes the `remotePatterns` entry (section 2.5). | Before TASK-032 close |
| O10 | Confirmation of expected non-Latin content (Telugu, Hindi, Urdu names or copy). | Font coverage (Q-A1). | Any time before TASK-011 |

### 6.2 Safe to use now for development (placeholder strategy)

No mock, story, Storybook page or test may reference an external image or font host. Everything below is local and licence-free.

| Item | Use |
|---|---|
| Fonts through `next/font` | Safe now (OFL expected, section 1). Commit licence texts. |
| Colour tokens, spacing, radius, shadows | Safe now (`design-tokens.json`). |
| Interim brand | The CSS "PG" roundel plus text wordmark, exactly as in the reference ("current wordmark treatment"). Safe now. Replace if O3 supplies a logo. |
| In-house icons | Draw fresh modules (section 3). Do not import a third-party icon package. |
| Neutral placeholder tiles | Generate local images or CSS-only tiles under `web/public/placeholders/`, one per slot ratio in section 2.4 (16:8.8, 4:3, 5:4, 16:10, 7:5, 21:9, 1:1), flat or gradient in palette tones (`paper-2` #e7ded0 to #d4cab9, optionally forest #243228 for dark sections), with a small mono label such as "PHOTO 16:8.8". They must not look like real PG people. |
| Existing no-photo state | Reuse `.media-frame--empty` for 0-asset collections. |
| Blur placeholders | For local placeholders, a static tiny `blurDataURL` in the palette tone. For CMS images, ask the backend to return a small `blur_data_url` (or dominant colour) computed at upload and to store `width`, `height`, `alt`, `decorative`, `focal_x`, `focal_y`. When absent, fall back to a palette-tone constant so there is never layout shift or a flash. |
| Optional design-fidelity fixtures | If designers want the reference look in staging, the 7 Unsplash photos could be self-hosted as dev-only fixtures, **only after** the per-photo licence check in section 8 and with a CI guard that fails the production build if any fixture file is referenced. Default: do not do this. Placeholders are enough for engineering. |
| Mock data | Mock events point at the local placeholders and carry alt text such as "Placeholder image", never reference captions like "PG regulars". |
| Not safe | Any `images.unsplash.com` URL; legacy `logo.png` / `logo.svg` / `favicon.svg` as shipped (identity mismatch, 10417 px); legacy member photos and third-party logos; the `.obj` 3D pawn; `fonts.googleapis.com` links. |

## 7. Risks

| ID | Risk | Likelihood / impact | Mitigation |
|---|---|---|---|
| AR-1 | **Hot-linking** Unsplash URLs: third-party availability and rate limiting, URL changes or removed photos, user IP disclosure to a third party, no control over format or caching, LCP depends on an external host, CSP must allow the host. | High / High | No external image hosts in production. Local placeholders in mock mode. CI network and HTML assertion. Exact-host `remotePatterns` for Supabase only. |
| AR-2 | **Google Fonts CDN dependence** if the reference `<link>` is copied: render-blocking CSS, third-party requests and IP disclosure, extra CSP allowances. | Medium / Medium | `next/font` self-hosting; remove Google origins from CSP; Playwright assertion of zero requests to Google font hosts (TASK-011). |
| AR-3 | **Licensing of stock imagery**: licence unverified per photo, no model release for identifiable people, no recorded photographer. | High / High | Replace with owner-supplied photography; keep rights and credit in the media record (O1, O2). |
| AR-4 | **False claims**: "REAL BOARDS / REAL PEOPLE" tag, "PG regulars" and event-named alt text on stock images. | High / High | Launch gate on real photos; rewrite alt text per photo; do not copy reference captions. |
| AR-5 | Privacy: EXIF GPS in uploaded phone photos; photos of minors without guardian consent. | Medium / High | Strip metadata on upload (backend ask); consent evidence (O2). |
| AR-6 | Brand identity unresolved: the CSS roundel and the legacy blue logo conflict. | Medium / Medium | Owner decision O3; use the roundel and wordmark meanwhile. |
| AR-7 | Font fidelity drift: faux italic in the reference versus the real Newsreader italic; faux bold on Fragment Mono 600 badges; `→` and `✓` falling back to system glyphs; `₹` fallback. | High / Low-Medium | Designer sign-off on true italic (D3) and mono badge weight (D4); Icon set for arrow and check; glyph coverage test (section 1). |
| AR-8 | Font payload or CLS over budget (150 KB, CLS 0.02) with three variable families. | Medium / Medium | Drop `wdth`, restrict italics, measure early, trim axes with local files if needed. |
| AR-9 | Storage host changes with the Seoul to Singapore migration; absolute URLs stored in content break. | Medium / Medium | Store object keys or relative paths, or a stable custom media domain (D2). |
| AR-10 | Open `remotePatterns` or heavy source images increase optimiser cost and abuse surface. | Low / Medium | Exact host and path, upload size limits, formats and quality set in `next.config`, cost check in TASK-115. |
| AR-11 | CMS editors upload ratios that break the editorial crops. | Medium / Medium | Focal point per image, `object-fit: cover`, recommended master ratios shown in the media library, cropping verified in TASK-032. |
| AR-12 | OG image generation lacks a usable font file (WOFF2 not accepted by the generator). | Medium / Low | Commit a separate TTF/OTF for `next/og` (TASK-112). |

## 8. Open decisions and verification items

| ID | Item | Proposed default | Decider |
|---|---|---|---|
| D1 | `next/font/google` versus `next/font/local` | Google; local if CI is offline or axis trimming is needed | architect (ARCH-001) |
| D2 | Media URL strategy: stable custom media domain versus store keys and compose URL | Store keys; compose in the API layer; custom domain optional | architect with backend |
| D3 | Reference italics are faux (no `ital` axis requested). Approve the true Newsreader italic or keep headlines roman | Load the true italic, designer to approve the look; drop it if over budget | designer |
| D4 | Fragment Mono has no 600 face (expected, verify); `.status-badge` and some `strong` use it | Set badge weight to 400 (or accept synthesis) | designer |
| D5 | Include `latin-ext` for `₹` | Include where the family has the glyph | architect / frontend |
| D6 | Dev-only Unsplash fixtures | No; use neutral placeholders | product-manager |
| D7 | Carousel control size 42px (reference) versus 44px (TASK-033) | 44px | frontend |
| Q-A1 | Non-Latin content expected? | Latin only | owner |
| V1 | Confirm OFL 1.1 for Newsreader, Anek Latin, Fragment Mono and capture licence texts | Expected, not verified | frontend-engineer (TASK-011) |
| V2 | Confirm Unsplash licence terms and per-photo status for the 7 ids, if any fixture is kept | Expected, not verified | product-manager |
| V3 | Confirm glyph coverage list in section 1 | Not tested | frontend-engineer |
| V4 | Confirm Fragment Mono axes/weights, Newsreader `opsz` support in `next/font/google`, and `qualities` allow-list behaviour for the Next version in use | Not tested | frontend-engineer |
| V5 | Confirm the Google sign-in button brand rules and any payment logo usage | Not verified | frontend-engineer |
| V6 | Review legacy files in section 4 for rights and relevance | Not reviewed | owner |

## Acceptance check against TASK-005

| Criterion | Where met |
|---|---|
| Each font has source, licence, file plan | Section 1 (licence is expected, flagged for verification V1) |
| Each image has a status | Section 2.2 and 2.1 (all 7: replace before launch) |
| Hot-linking and image host decisions recorded | Section 2.5, 6.2, 7 (host details pending O9) |
