# Component Catalog

The UI should be extended through these primitives and patterns before creating new one-off components.

## Global primitives

### `Button`
Source: `src/components/Button.tsx`
Variants: primary/default, secondary, copper, ghost where supported. Supports links and buttons. Use a clear verb tied to the user's objective.

### `Icon`
Source: `src/components/Icon.tsx`
In-house SVG icon set. Do not introduce an unrelated icon family into isolated screens. Add icons to this set using the same 24px viewBox/stroke language.

### `Avatar`
Source: `src/components/Avatar.tsx`
Photo with graceful initials fallback. Player and testimonial images must have appropriate alt/name context.

### `StatusBadge`
Source: `src/components/StatusBadge.tsx`
Use for operational state, not decoration. Tones: success/good, warning/attention, copper/category as implemented.

### `EmptyState`
Source: `src/components/EmptyState.tsx`
Contains icon, title, explanatory body and optional next action. Empty states should help the player continue, not apologise.

### `PageIntro`
Source: `src/components/PageIntro.tsx`
Signed-in/admin page introduction pattern.

### `Field`
Source: `src/components/Field.tsx`
Form label/support/error pattern.

### `ProgressBar`
Source: `src/components/ProgressBar.tsx`
Use for bounded progress; not rating changes.

## Navigation shells

### `PublicNav` + `Footer`
Public editorial navigation. Keep public decision-making simple: Play, Community, Stories and high-value account/action destinations.

### `SignedInShell`
Role-aware player/admin navigation. Player and Admin are deliberately different information architectures while sharing brand tokens.

## Public patterns

- Hero: promise + proof + immediate action; never a 100vh visual gate.
- Event card: image/date/kind/audience/title/short promise/time/place/action.
- Editorial split: image + Newsreader headline + short human copy.
- Community principle: statement + one-line proof, border based rather than rounded cards.
- Final image CTA: photography carries emotion; CTA remains direct.

## Player patterns

- Next-action hero: event/pairing/check-in state is dominant.
- Pairing card: board, opponent, colour, time control, result action.
- Rating pool selector: Blitz/Rapid/Classical, no single blended rating.
- Game ledger: date/event/opponent/result/delta in a scan-friendly row.
- Privacy control: visibly separates public chess identity from private profile data.

## Admin patterns

- `admin-hero`: page job + operational context + primary action.
- Split workspace: list/navigation + focused editor/detail; avoid modal-heavy CRUD.
- Status table: operational data with sparse status badges.
- Event Builder: 8 sequential conceptual steps with persistent public preview.
- Event Control Room: 8 job-oriented tabs, not raw database entities.
- CMS: structured fields + publish state + preview; no unbounded drag-and-drop page builder.
- Media collection editor: asset selection, order, alt, focal point, static/carousel, autoplay.

## New component rule

A new component is justified when at least one is true:
1. It is reused in 2+ screens.
2. It carries accessibility behavior that should be centralised.
3. It represents a domain state with consistent visual meaning.

If none apply, keep it local to the page rather than expanding the global API.
