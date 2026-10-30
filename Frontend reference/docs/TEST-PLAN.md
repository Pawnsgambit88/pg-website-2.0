# Test Plan

## Automated

### Unit
- event-price calculation
- social pairing cost/rematch avoidance
- Swiss pairing deterministic output
- Glicko-2 known test vectors
- format/date/currency helpers
- CMS validation rules

### Database
Use a clean Supabase test project seeded from migrations.
- ordinary user cannot change role
- ordinary user cannot write payment status
- ordinary user cannot write rating ledger
- private profile cannot be read by another user
- public profile exposes only public table fields
- CMS draft is not visible to anon
- admin can publish content
- capacity reservation is atomic under concurrent requests
- second payment webhook is a no-op
- second round-finalisation request does not rerate

### Integration
- email sign-up/sign-in/reset
- Google OAuth first login + returning login
- free registration
- paid registration success/failure/abandonment
- final seat concurrency
- waitlist
- check-in window
- pairing generation/publish
- result submission/dispute/finalisation
- rating update
- refund and registration state
- CMS image upload/static/carousel
- testimonial 3-up and 4+ carousel

## Manual UX matrix

Widths: 320, 375, 390, 768, 1024, 1366, 1440, 1920.
Browsers: current Chrome, Safari, Firefox, Edge; iOS Safari and Android Chrome.

Critical journeys:
1. stranger → understand PG → event → registration
2. newcomer → arrive/check-in → pairing
3. regular → dashboard → next event → rating history
4. admin → create event → publish → registration desk → pairings → finalise
5. editor → replace hero with single image → switch to carousel → publish
6. editor → add fourth testimonial → public carousel behavior

## Failure testing

- offline during checkout return
- duplicate payment verification request
- duplicate webhook
- user closes checkout
- payment captured after browser closes
- event fills during payment hold
- admin regenerates draft pairings
- admin attempts to finalise incomplete results
- image upload interrupted
- invalid image MIME/oversize
- OAuth denied/cancelled
- expired session during admin edit

## Performance budgets

Public home target on mid-range mobile, production build:
- LCP < 2.5s target
- CLS < 0.1
- INP < 200ms target
- responsive hero images, lazy loading below fold
- no Three.js/WebGL dependency for the core experience
- GSAP must not block first paint
