# Visual QA Checklist

Run this after backend wiring and before every release that touches UI.

## Global

- [ ] Newsreader, Anek Latin and Fragment Mono load; fallback does not shift layout catastrophically.
- [ ] Parchment/Forest/Copper tokens match `src/styles/index.css`.
- [ ] No new arbitrary bright accent introduced.
- [ ] Focus indicator visible on every interactive control.
- [ ] No horizontal scroll at 320px.
- [ ] 200% zoom remains usable.
- [ ] Reduced-motion mode removes non-essential animation.
- [ ] Long names/event titles do not collide with actions.
- [ ] Empty/error/loading states use `/handoff/states` language/hierarchy.

## Public

- [ ] Homepage message + action + upcoming content are available promptly; hero is not a 100vh gate.
- [ ] Hero line break does not clip “Good games. Better company.”
- [ ] Event card image crops respect CMS focal point.
- [ ] Event details show time/place/price/availability before long explanatory content.
- [ ] Completed event has archive language instead of registration CTA.
- [ ] Café/community photography remains people-first.

## Authentication

- [ ] Google button and email form fit 320–390px widths.
- [ ] iOS form fields do not trigger unwanted zoom.
- [ ] Return intent is preserved after login/OAuth.
- [ ] Password reset does not reveal account existence.

## Player

- [ ] `/app` answers next action at first glance.
- [ ] Live Event Room board/opponent/time control works at 390px.
- [ ] Waiting state is calm and explicit; no player must refresh manually to understand status.
- [ ] Rating pools are visibly separate.
- [ ] Public profile controls cannot be mistaken for private profile fields.

## Admin/CMS

- [ ] Admin sidebar remains navigable at 1024px and collapses correctly below target breakpoint.
- [ ] Event Builder preview never obscures form inputs.
- [ ] Event Builder is usable as a single-column task flow on mobile.
- [ ] Operational tables degrade gracefully; no essential action is only off-screen horizontally.
- [ ] CMS dirty/published state is visible.
- [ ] Media static/carousel selection and focal point are understandable without developer knowledge.
- [ ] Testimonial publication makes missing photo/quote/consent explicit.

## Browser/device matrix

Minimum manual smoke test:
- Chrome current desktop
- Firefox current desktop
- Safari current macOS/iOS if available
- Android Chrome current
- 1440×900
- 1280×800
- 1024×768
- 768×1024
- 390×844
- 320×568

## Performance visual check

- [ ] Largest hero/event media has explicit sizing/aspect to avoid layout shift.
- [ ] Image loading does not cause content jumps.
- [ ] GSAP does not make scroll/input lag on mid-range mobile.
- [ ] Carousels do not autoplay when reduced motion is requested.
