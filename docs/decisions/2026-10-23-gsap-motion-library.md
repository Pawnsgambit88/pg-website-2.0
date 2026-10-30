# DEC-029 - GSAP as the editorial motion library (reverses P3 "no GSAP")

**Date:** 2026-10-23
**Status:** accepted with constraints (owner decision 2026-10-23; architect constraints below)
**Supersedes:** PLAN-001 P3, FEAT-001 D-10 (the "no GSAP" clause only), ARCH-001 sections 13.5 and 17 (P3 row), and the "Animation" row of the ARCH-001 alternatives table
**Applies to:** `web/` public routes on an explicit allow-list (initially `/` only)
**Feature:** FEAT-001 (Home page, HOME-PAGE-PLAN.md)

## Context

The reference `DESIGN-SYSTEM.md` ("Motion") specifies GSAP for four effects: opening copy reveal, one-time section reveal, subtle image scale/parallax, and carousel fades. The earlier approved decision (P3, D-10, ARCH-001 13.5) chose CSS transitions plus the in-repo `Reveal` (TASK-035, one shared IntersectionObserver). The product owner has now chosen GSAP.

Facts from the repo that bound the decision:
- `gsap` is not installed. `Reveal` (`components/ui/motion/Reveal.tsx`, `lib/motion/revealObserver.ts`, `@utility reveal` in `styles/utilities.css`) is built and tested. Content is visible in server HTML; the observer sets `data-reveal="pending"` only on below-the-fold nodes after hydration.
- `web/budgets.json`: `publicContent` First Load JS 170 000 gzip bytes; measured baseline for `/` is 134 780 (headroom about 35 KB); `other.lazyChunkGzip` is 60 000; growth tolerance 5 000 bytes per PR.
- CSP (`lib/security/csp.ts`): public static policy has `script-src 'self' 'unsafe-inline'`, `style-src-attr 'unsafe-inline'`; nonce policy for client groups also allows inline style attributes. A first-party GSAP chunk and GSAP's inline `style` writes need no CSP change.
- ARCH-001 17/alternatives and TEST-PLAN/VISUAL-QA already require "GSAP must not block first paint" and no scroll lag on mid-range mobile.

## Decision

GSAP is approved as an optional progressive enhancement, not as the base layer. Constraints (all mandatory):

1. **Content never depends on GSAP.** Server HTML renders every element in its final visible state. No-JS, JS-failed, chunk-failed, reduced-motion and crawler users see the finished page.
2. **Hero stays CSS.** The opening copy reveal is a CSS keyframe class (opacity/translateY, 500 ms, staggered with the existing delay utilities), so it runs before JS, causes no flash and cannot affect LCP. GSAP never touches the LCP element (hero image, or h1 if that is the candidate) and never sets `opacity:0` on anything in the first viewport.
3. **One island, off the critical path.** A single side-effect client component `HomeMotion` (no children, renders `null`) under `components/ui/motion/gsap/`. It queries `[data-motion]` markers that server components place on their own elements, so no server content is wrapped in a client boundary and no props are serialised. Pattern: `useEffect` -> check `matchMedia('(prefers-reduced-motion: no-preference)')` -> wait for idle (`requestIdleCallback`, fallback `setTimeout`) -> `await import('gsap')`. The static import graph of the route must not contain `gsap`.
4. **Core only; ScrollTrigger is not approved for Home.** Section reveal and image scale are triggered by the existing shared IntersectionObserver logic plus `gsap.to`/`fromTo`. Parallax is dropped (design says "where performance allows"; it does not on mid-range mobile and needs ScrollTrigger). Adding ScrollTrigger or any other plugin requires an amendment to this ADR with its own measured budget. Import only `{ gsap } from 'gsap'` (no `gsap/all`, no `registerPlugin` calls unless amended).
5. **Transform and opacity only.** No animation of width, height, top, margin or font properties. Image scale is applied to an inner element inside an `overflow:hidden` aspect box, so CLS stays 0. `will-change` only during the tween, cleared on complete (`clearProps`).
6. **Reduced motion is checked before loading.** If `prefers-reduced-motion: reduce` matches, the chunk is not requested, no pending state is set, and the page is static. Use `gsap.matchMedia()` inside the island so a live preference change reverts running tweens (`ctx.revert()`), and always call `revert()` on unmount (React StrictMode double-effect safe).
7. **Same look as CSS.** Durations, easing and distance are read from the existing tokens (`--duration-reveal`, `--ease-brand`, `--reveal-distance`) so GSAP and CSS paths are visually identical; no second set of magic numbers. Pre-hide (`data-reveal`-style pending state) is set only after hydration, only for nodes whose `getBoundingClientRect().top` is below the viewport, and never twice (no CSS and GSAP both animating one element).
8. **Allow-list, not a global.** `gsap` may be imported only from `components/ui/motion/gsap/**` (ESLint `no-restricted-imports` plus dependency-cruiser style test). Routes allowed to mount the island: `/` now. Other routes keep `Reveal`. Extending the list (Community, Welcome) is a one-line change to this ADR and a budget check, not a new decision.
9. **Carousel fades stay CSS.** There is no carousel on Home; `Carousel` (TASK-033) uses CSS opacity transitions. GSAP is permitted there later but not required.
10. **Supply chain.** Pin an exact version (no caret), record it in the lockfile, pass the existing release-age and signature gates (OPS-002).

### Licence

The `gsap` npm package is not MIT. Since GSAP became free (2025) it ships under GreenSock's "Standard No Charge" licence, covering all plugins including ScrollTrigger for commercial use, with a restriction on use inside tools that compete with Webflow-style visual animation builders (not applicable here) and no right to redistribute modified copies as a competing library. Consequence: OPS-002 gate G15 (licence allow-list, `web/security/policy-exceptions.json`) will flag it. Add a typed, owned exception naming `gsap`, the exact version, the licence URL and an owner reviewer. The implementing engineer must read the licence text bundled with the pinned version and confirm these terms before merging; if the text differs from the summary above, stop and escalate to the owner. This ADR is architecture guidance, not legal advice.

### Budget (web/budgets.json)

Estimates, to be replaced by measurement in the spike task: gsap core about 25-28 KB gzip; ScrollTrigger about 11-12 KB (not used).

- `routeClasses.publicContent.firstLoadJsGzip`: **unchanged at 170 000**. GSAP must not be in First Load JS. Expected First Load delta for `/` is the island loader only (under 2 000 bytes gzip).
- Add `other.motionChunkGzip: 32000` (lazy chunk containing gsap core plus island code; tighten to measured size plus 10 percent).
- Add `other.motionLoaderGzip: 2500` (the island's own code in First Load).
- `check:bundle` (TASK-007 follow-up) must additionally fail if any module path matching `gsap` appears in a route's initial chunk list, or if the motion chunk loads on a route outside the allow-list.
- Re-measure `baseline` for `/` after the island lands; the 5 000-byte growth rule applies to the First Load number only.

### Existing CSS `Reveal`

Kept, unchanged API. It remains the default for every route and the engine for all pages not on the allow-list. On Home, section reveal elements carry `data-motion="reveal"` instead of being wrapped in `Reveal` (no double animation). `Reveal`, `revealObserver.ts` and `@utility reveal` are not removed, so the no-GSAP path stays tested and available as the fallback if the chunk is dropped later. The hero keyframe class is new CSS in `utilities.css`, disabled under reduced motion.

### LCP and CLS

- LCP: hero image is `priority`, never animated; hero copy animates by CSS from visible-by-default markup (keyframe `from` only affects the animated run; verified in a Lighthouse trace that the LCP element is painted at first paint). GSAP loads at idle after LCP.
- CLS: transforms only, aspect boxes fixed, no insertion of elements; target CLS under 0.05 (unchanged).
- INP/jank: no scroll listeners; IntersectionObserver only; at most 12 simultaneously tweened nodes; tweens are one-shot and killed on completion.
- Acceptance numbers stay as in HOME-08: Lighthouse mobile Performance at least 90, LCP under 2.5 s. Add: motion chunk requested only after `load`/idle, Total Blocking Time not worse than 50 ms versus the CSS-only build.

## Alternatives considered

1. **Keep CSS plus `Reveal` (previous decision).** Smallest, zero new dependency, everything on Home is expressible. Rejected only because the owner chose GSAP; it remains the fallback and the default off the allow-list. Honest note: with ScrollTrigger and parallax excluded, GSAP adds about 27 KB lazy JS for effects CSS can already do; the benefit is timeline sequencing and design-system fidelity for later screens.
2. **GSAP with ScrollTrigger site-wide, statically imported.** Rejected: puts about 40 KB in First Load, consumes the 35 KB headroom, enables scroll-linked work on mid-range phones.
3. **Motion One / `motion` (WAAPI) or Framer Motion.** Smaller or React-native, but not the design-system choice and a different API from the reference; not selected by the owner.
4. **Replace `Reveal` internals with GSAP.** Rejected: puts GSAP on every route's path and removes the proven no-JS-safe implementation.

## Consequences

- Positive: design-system fidelity; sequencing available for later screens; no change to CSP, SSR, ISR or First Load budget.
- Negative: one non-MIT dependency needing a licence exception; two animation engines coexist (mitigated by shared tokens and the allow-list); about 27 KB lazy JS on Home for mostly decorative effect; extra tests (no-JS, reduced motion, chunk failure).
- Risk: licence terms read wrongly (mitigated by the exception review); flash of re-hidden content if pre-hide runs late (mitigated by below-fold-only rule and Playwright check); StrictMode double init (mitigated by `gsap.context`/`revert`).

## Documents and tasks to update for consistency

Documents:
- `docs/architecture/ARCH-001-web-frontend.md`: 13.5 (replace "No GSAP (P3)" sentence with a pointer to DEC-029 and the CSS-default/GSAP-enhancement rule; line 877), alternatives table (line 1279 "Animation"), decisions table (line 1542 P3 -> superseded by DEC-029), per-route-group allowed-imports table (line 917, `(public)` row: add the allow-listed motion island), line 1467 (an ADR now exists in `docs/decisions/`), 14.3 budget text (new motion chunk keys).
- `docs/plans/PLAN-001-frontend-rewrite.md` line 371 (P3 row: superseded) and any dependency list that mentions P3.
- `docs/requirements/FEAT-001-frontend-rewrite.md` line 59 (D-10: remove "no GSAP", add D-10a pointing to DEC-029; owner-approved 2026-10-23).
- `docs/plans/FEAT-001/HOME-PAGE-PLAN.md`: Decision 1, section 6, Q1, Q2, HOME-04/06/08 (addendum appended; main text edited at those spots).
- `docs/architecture/OPS-002-ci-hardening.md`: note the gsap licence exception under gate G15 / `policy-exceptions.json`.
- `web/budgets.json`: add `other.motionChunkGzip` and `other.motionLoaderGzip` (values above) and update `$comment`.
- `Frontend reference/docs/DESIGN-SYSTEM.md`, `UI-SPECIFICATION.md`, `TEST-PLAN.md`, `VISUAL-QA.md`: already say GSAP; add one line each that parallax is deferred and the hero opening reveal is CSS (design reconciled with this ADR).

Tasks:
- TASK-035 (Reveal): note that it stays the default engine; add acceptance "not removed, still used off the allow-list".
- TASK-007 follow-up / `check:bundle` task: gsap-not-in-initial-chunks assertion and motion-chunk budget; ESLint restricted import for `gsap`.
- TASK-033 (Carousel): fades are CSS; no GSAP dependency.
- TASK-116 (narrative checks): add no-JS render, reduced-motion (no chunk request), chunk-blocked (route still complete) cases.
- TASK-120: no change (verified: no CSP delta).
- New task HOME-09 (below in the plan addendum): install, island, tests, budget, licence exception.
- Supply-chain exceptions registry (OPS-002 task): add gsap entry.
