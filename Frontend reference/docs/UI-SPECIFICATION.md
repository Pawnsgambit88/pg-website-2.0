# UI Specification — Production Tokens

The coded CSS in `src/styles/index.css` is authoritative. This document gives the implementation values in one place.

## Brand palette

| Token | Value | Primary use |
|---|---|---|
| Parchment | `#F4EFE6` | Main public background |
| Soft Parchment | `#FBF8F2` | Light panels/forms |
| Sand | `#E7DED0` | Secondary surfaces/dividers |
| Deep Forest | `#243228` | Structural dark, navigation, primary action |
| Forest Dark | `#17231C` | Hover/deeper dark |
| Ink | `#171614` | Primary text, admin dark |
| Burnished Copper | `#B86A3B` | Scarce accent/consequential action |
| Copper Dark | `#8F4E2D` | Label/accessible copper text |
| Stone | `#B9AE9D` | Quiet boundaries |
| Muted | `#6C685F` | Secondary copy |
| Success | `#486A4F` | Confirmed/success state |
| Warning | `#9D7033` | Pending/attention state |
| Danger | `#8D3C35` | Destructive/failure state |

Rule: copper is the 10% accent, not a habitual background. Avoid introducing unrelated accent colours.

## Typography

Fonts load in `index.html` from Google Fonts.

### Display — Newsreader
Use for emotional/editorial hierarchy, not form labels.

- Hero H1: `clamp(3.4rem, 7.2vw, 7.5rem)`, weight 430, line-height `.92`, tracking `-.045em`
- Major section H2: `clamp(2.4rem, 4.4vw, 5rem)`, weight 430, line-height `.92`
- Page intro H1 signed-in/admin: typically `clamp(2.2rem, 4vw, 4.2rem)` depending context
- Editorial quote: Newsreader, 400–500, line-height 1.05–1.18

### UI — Anek Latin
Use for navigation, body, form controls, operational UI.

- Body: `17px`, line-height `1.48`
- Navigation: 13–15px depending density
- Dense table: 13–15px
- Input/select/textarea: inherits UI font; 16px minimum on mobile to avoid iOS zoom
- Button text is generally mono per below, not Anek

### Utility — Fragment Mono
Use for metadata, dates, ratings, board numbers, labels and buttons.

- Eyebrow: `0.72rem`, uppercase, tracking `.12em`, line-height `1.3`
- Button: `0.72rem`, uppercase, tracking `.06em`
- Dense metadata: 11–13px
- Never use it for paragraphs.

## Spacing

Approved spacing scale:
`4 / 8 / 12 / 16 / 24 / 32 / 48 / 64 / 96px`

CSS tokens:
`--space-1`, `--space-2`, `--space-3`, `--space-4`, `--space-6`, `--space-8`, `--space-12`, `--space-16`, `--space-24`.

Do not introduce one-off 19px/37px gaps when an approved token works.

## Layout

- Desktop content shell: max `1440px`
- Desktop lateral gutter: `36px` each side through `calc(100vw - 72px)`
- Mobile gutter: `20px`
- Signed-in sidebar: `248px`
- Admin sidebar: `264px`
- Primary control height: `48px`

Public pages prefer editorial asymmetry and border grouping. Admin pages may use denser grids, but avoid generic rounded-dashboard tile overload.

## Radius + shadows

- Public radius: `0–2px`
- Operational radius: `2–6px` only where it improves interaction recognition
- Brand shadow: `0 24px 70px rgba(23,22,20,.10)`

Avoid large 20–32px SaaS-card radii and glassmorphism.

## Buttons

Minimum height: `46px` public; interactive admin controls generally `48px`.

- Primary: Deep Forest + Parchment
- Secondary: transparent + Forest border
- Copper: Burnished Copper + warm white; reserve for consequential/event action
- Ghost/text: use only when hierarchy is obvious

Hover can translate up by 2px. Do not make buttons bounce or scale excessively.

## Fields

- 48px control height minimum
- Always visible label; placeholder is never the only label
- Supporting/help text below control
- Error appears adjacent to the field and is described in text, not colour alone
- Group long admin forms into clear conceptual sections

## Tables

Use for genuinely comparable operational data: payments, registrations, players, audit.
- Sticky header where height warrants it
- Left align text; right align currency/counts
- Provider IDs and transaction IDs use Fragment Mono
- Mobile turns secondary columns into stacked metadata rather than horizontal overflow where possible

## Photography

- Real people and real PG spaces are the emotional centre.
- Café/venue environment, hands, clocks, faces, post-game conversation.
- Isolated chess-piece stock imagery is not a hero language.
- CMS stores alt text and focal point; frontend uses focal point for `object-position`.

## Motion

- Controls: 180–240ms
- Editorial reveal: 500–800ms
- GSAP reveal once per section; no scroll-jacking
- Media parallax/scale only if performance remains strong
- Essential meaning is never animation-only
- `prefers-reduced-motion` removes non-essential transitions/animations

## Accessibility minimums

- WCAG 2.2 AA target
- Visible `:focus-visible`
- 44px minimum target on touch interactions where practical
- Heading levels remain semantic
- Buttons are buttons; navigation uses anchors/links
- Icon-only buttons require accessible names
- Form errors are programmatically associated
- Dialog focus is trapped and returned to invoker
- Live pairing/payment updates use appropriate status announcements without excessive verbosity
