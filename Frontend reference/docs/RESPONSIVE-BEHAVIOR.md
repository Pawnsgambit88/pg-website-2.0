# Responsive Behavior

The implementation must be designed, not merely collapsed. Primary QA widths: 1440, 1280, 1024, 768, 390 and 320px.

## Global breakpoints

- 1200px: reduce large grids and editorial gaps.
- 960px: public split layouts become stacked; signed-in shells switch toward mobile behavior.
- 720px: most multi-column content becomes single column; cards keep their hierarchy.
- 480px: compact typography/gutters and simplify secondary metadata.

CSS may use intermediate breakpoints when a component genuinely needs one. Do not fork the visual language by device.

## Public header

Desktop: wordmark + primary nav + account/action.
Mobile: compact brand + menu trigger; menu remains keyboard accessible and does not hide the primary action permanently.

## Homepage

Desktop opening viewport should surface hero message/media and the beginning/full block of Upcoming Games depending device height. Hero must not become a mandatory full-screen gate.
Mobile order:
1. brand promise
2. core supporting copy
3. primary action/proof
4. hero media
5. upcoming events

## Event discovery/cards

Desktop: up to 3 across where space allows.
Tablet: 2 or fluid editorial rows.
Mobile: single column; date, title, location, price and action remain visible without horizontal scroll.

## Event detail

Desktop: editorial main column + sticky decision panel where appropriate.
Mobile: decision essentials move immediately below hero/summary; sticky bottom action can be used if it does not obscure content or accessibility controls.

## Login/auth

Desktop: editorial image/context + auth form split.
Mobile: form first; visual panel becomes secondary or hides if it adds vertical friction.
Google action stays first-class and at least 44px high.

## Player shell

Desktop: persistent left navigation.
Mobile: compact top bar/menu; do not make live-event essentials require menu navigation.

## Player Event Room

Mobile is the priority condition at a physical event. Board number, opponent, colour, time control and result/host actions must fit comfortably at 390px without zoom. Standings and history follow below.

## Admin shell

Desktop: persistent admin sidebar.
Tablet/mobile: overlay/drawer navigation. Complex tables must progressively disclose secondary columns or convert to labelled rows; do not force 1200px-wide tables into 390px viewports.

## Event Builder

Desktop: steps + editor + public preview.
Tablet: steps become horizontal/compact; preview may move below editor.
Mobile: one task at a time; preview is an explicit action/section, not a squeezed third column.

## CMS/media

Desktop: navigation/editor/preview where practical.
Mobile: editor first, preview accessible separately. Media focal point controls must remain touch-friendly.

## Motion/performance

Disable expensive parallax on low-width/low-power contexts when it causes jank. Respect reduced motion regardless of viewport.
