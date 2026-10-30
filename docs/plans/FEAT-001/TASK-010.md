---
id: TASK-010
type: task
feature_id: FEAT-001
plan_id: PLAN-001
title: Tailwind v4 theme tokens, base layer, safe-area, motion and content-visibility utilities
owner: frontend-engineer
status: pending
priority: high
estimate: M
parallel_group: G1
dependencies: [TASK-007]
affected_files:
  - web/src/app/globals.css
  - web/src/styles/theme.css
  - web/src/styles/base.css
  - web/src/styles/utilities.css
  - web/postcss.config.mjs
  - web/scripts/check-tokens.ts
goal: Express design-tokens.json and the extra variables in Frontend reference/assets/styles.css as one CSS-first @theme block so every later component uses tokens only.
context: Governs visual fidelity for all 58 screens. Mined from design-tokens.json, docs/UI-SPECIFICATION.md and assets/styles.css (variables at lines 2-23 and 675-688; 19 media queries). Tailwind v4 is wired into Next.js through the @tailwindcss/postcss plugin and imported once from the root layout's globals.css. Font families are provided by next/font in TASK-011 and referenced here through CSS variables.
implementation_notes:
  - "Start @theme with --color-*: initial so only brand colours exist."
  - "Colours: parchment #F4EFE6, parchment-soft #FBF8F2 (reference also has #fbf8f1; use design-tokens.json value and record the 1-unit drift), sand #E7DED0, paper-deep #DED3C3, forest #243228, forest-dark #17231C, forest-soft #314438, forest-muted #496052, ink #171614, copper #B86A3B, copper-dark #8F4E2D, copper-soft #D19A75, copper-pale #EAD0BC, stone #B9AE9D, muted #6C685F, success #486A4F, warning #9D7033, danger #8D3C35, admin-bg #F2EEE6, admin-panel #FAF7F1; lines via color-mix (ink 14%, parchment 20%, ink 12% for admin)."
  - "Record a contrast table in the file header: copper on parchment fails AA for small text, so text and labels use copper-dark; list ratios for every Button, badge and eyebrow pairing."
  - "Fonts: use @theme inline so --font-display, --font-ui and --font-mono resolve to the CSS variables emitted by next/font (for example var(--font-newsreader), Georgia, serif). No @font-face in this file."
  - "Type scale as --text-* with line-height, letter-spacing: hero clamp(3.4rem,7.2vw,7.5rem)/0.92/-0.045em/430; section clamp(2.4rem,4.4vw,5rem); page-intro clamp(2.2rem,4vw,4.2rem); body 17px/1.48; eyebrow 0.72rem/1.3/0.12em uppercase mono; button 0.72rem/0.06em uppercase mono."
  - "Spacing: --spacing 4px; approved scale 4/8/12/16/24/32/48/64/96 equals multipliers 1/2/3/4/6/8/12/16/24; lint rule on arbitrary spacing values."
  - "Layout vars: shell 1440px; gutters 36px desktop and 20px mobile; sidebars 248px and 264px; control height 48px; tap 44px."
  - "Breakpoints mobile-first: xs 480, sm 720, md 960, lg 1200, xl 1440. Document which reference max-width query (1180/900/640/520/1200/960/720/480/1120/780/880) maps to which."
  - "Radius public 2px and operational max 6px; shadow 0 24px 70px rgb(23 22 20 / .10); ease cubic-bezier(.2,.8,.2,1); z-index header 100, overlay 210, sidebar 220, toast 400."
  - "Base layer: body 17px/1.48 UI font on parchment; visible :focus-visible ring (light variant on forest); scroll-padding-top; form controls at least 16px; prefers-reduced-motion neutralises animation and transitions."
  - "Utilities: min-h-control, tap (44px hit area), pb-safe/pt-safe/px-safe via env(safe-area-inset-*), cv-auto (content-visibility:auto with contain-intrinsic-size from --cv-h tokens, rule rendering-content-visibility), lift-on-hover (disabled under reduced motion)."
  - "Token script web/scripts/check-tokens.ts compares theme.css with Frontend reference/design-tokens.json and scans src for raw hex or arbitrary colour values; wired into npm run check."
  - "Verify the hero heading at 320px and 200% zoom; if 'Better company.' overflows, propose a lower clamp floor and record it for design sign-off instead of changing the token silently."
acceptance_criteria:
  - {id: AC-1, description: "Every colour, font, spacing, radius and layout value in design-tokens.json exists as a theme token; extra reference variables are added and listed in a table in the file header."}
  - {id: AC-2, description: "check-tokens passes and is part of npm run check."}
  - {id: AC-3, description: "Body is 17px/1.48 UI font; :focus-visible is visible on parchment, sand and forest surfaces; reduced motion removes non-essential transitions and animation."}
  - {id: AC-4, description: "Utilities min-h-control, tap, pb-safe and cv-auto exist and are demonstrated on the token page."}
  - {id: AC-5, description: "Contrast table is recorded and no text colour pairing used by shared components is below WCAG AA."}
  - {id: AC-6, description: "The hero heading does not overflow at 320px or 200% zoom, or an approved floor change is recorded."}
  - {id: AC-7, description: "The token page stub renders every token (feeds TASK-039)."}
  - {id: AC-8, description: "Tailwind output is produced by the Next build (no separate CSS build step) and the global stylesheet stays within the CSS budget set in ARCH-001."}
tests_required:
  - {type: unit, description: "Generated token map equals design-tokens.json."}
  - {type: e2e, description: "Playwright 320px heading overflow check; reduced-motion emulation removes transitions."}
  - {type: manual, description: "Contrast table review."}
risk: medium
blockers: []
verification:
  commands: ["npm run check", "npm run build"]
  result: not_run
---

# TASK-010 Tailwind v4 tokens (long form)

Estimate M. Governing standard: `.claude/skills/react-best-practices` (see DoD-R in the plan). Tokens are plain CSS and impose no client JavaScript, so nothing here needs `'use client'`.

Acceptance criteria, tests and implementation notes are in the front matter above (schema form). This body only records the reasoning that does not fit a list.

- The reference ships two overlapping breakpoint systems because it grew in two passes. Normalising to one set (480/720/960/1200/1440, matching `design-tokens.json`) avoids three redundant cut-overs, but the mapping table must be written down so a reviewer can check a screen against the reference.
- `cv-auto` lives here because ledgers, tables and archive lists in several later tasks (031, 044, 066, 083, 088, 090) all need it, and a single measured `contain-intrinsic-size` per row type avoids scroll-jump.
- Next.js note: because `globals.css` is imported by the root layout (a Server Component), keep it free of anything that needs a client boundary. Component-level styling uses utility classes only.
