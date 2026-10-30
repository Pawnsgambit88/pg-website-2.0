# Screen Inventory and Acceptance Criteria

Every screen below is implemented in the repository. Review them from `/handoff` with `VITE_USE_MOCKS=true`. Exact route/data mapping is in `SCREEN-MAP.md`.

## Public discovery

### Home `/`
- Approved editorial homepage composition.
- Opening desktop viewport prioritises brand promise, newcomer reassurance, hero media and upcoming games without a 100vh gate.
- CMS controls copy and every major media collection.
- Hero/First Visit/Community/Story/Final CTA media can independently be static or carousel.
- Upcoming cards are generated from published events.

### Play `/play`
- Search/filterable event discovery.
- Cards expose atmosphere, date, area, format, fee, audience/first-timer signal and direct action.
- Empty result has a clear reset/next action.

### Event `/events/:slug`
- Decision essentials above long detail: promise, date/time, area, format, price, availability and registration action.
- Media can be static/carousel through event media collection.
- First-timer expectations and logistics are explicit.
- Completed event becomes archive/recap mode rather than retaining a registration CTA.

### Past Events `/past-events`
- Searchable permanent archive of completed events.
- Each event retains its public URL and can expose results/gallery/recap when available.

### Community `/community`
- Explains social-chess positioning and hospitality through concise editorial composition, not a corporate mission wall.

### Stories `/stories`
- CMS-driven editorial stories, rivalries, member profiles and event recaps.
- Featured story treatment plus chronological grid.

### Contact `/contact`
- Minimal contact surface with configured delivery path.
- Validation/success/error states required before launch.

### Legal `/privacy`, `/terms`, `/refund-policy`
- Production routes/layout supplied.
- Final wording must be legally/business approved before publish.

## Authentication and conversion

### Login/Create Account `/login`
- Google and email/password.
- Preserves return-to-event intent.
- Mobile form is prioritised over decorative media.

### OAuth Callback `/auth/callback`
- Processing, success redirect and failure recovery.

### Password Recovery `/reset-password`
- Neutral response that does not reveal account existence.

### First Login `/welcome`
- Lightweight preferences only; no Elo examination.
- Captures how the person tends to play and what they want from PG.

### Registration/Payment `/events/:slug/register`
- Authenticated conversion screen.
- Server rechecks eligibility/capacity/price.
- Free confirms without provider.
- Full + waitlist never takes payment.
- Paid creates server-side hold/order and verifies provider response server-side.

## Player — My PG

### Dashboard `/app`
Must answer within five seconds:
- What is my next PG thing?
- Where/when?
- What do I need to do?
- Is there a pairing/board?
- What is my relevant rating?
- What happened recently?

### My Events `/app/events`
- Upcoming registrations and states.
- Waitlist/pending-payment state.
- Completed history and direct return to archive/recap.

### Live Event Room `/app/events/:id`
Production states:
1. before check-in
2. check-in open
3. checked in / pairing pending
4. live round
5. between rounds
6. complete

Live pairing prioritises board number, opponent, colour, time control, result/host action on mobile.

### Rating `/app/rating`
- Independent Blitz/Rapid/Classical pools.
- Trend visualization + readable ledger.
- Rating deviation/provisional status explained in plain language.
- Social/unrated games do not manufacture rating deltas.

### Profile `/app/profile`
- Private identity/preferences separate from public chess identity.
- Clear controls for what can be public.
- Email/phone/DOB/payment information never belongs in public player profile.

## Admin — Control Room

### Overview `/admin`
- Today/next-event operational status.
- Website/CMS health.
- Actionable alerts, not vanity analytics.

### Website CMS `/admin/content`
- Structured section editor with protected composition.
- Draft/published state, preview and version/history affordance.
- Home Hero, Upcoming section header, First Visit, Community, Story and Final CTA editable.

### Media `/admin/media`
- Asset upload/library.
- Alt text, focal point, credit/rights metadata as applicable.
- Collections support static/carousel, order, autoplay and interval.

### Stories `/admin/stories`
- Create/edit/publish stories and recaps with media collections.

### Testimonials `/admin/testimonials`
- Photo, exact quote, name, descriptor, consent record, sort order and publish state.
- Publishing blocked unless quote + photo + consent are complete.
- Public 1–3 = grid; 4+ = accessible carousel.

### Events `/admin/events`
- All event types/statuses with date/capacity/price/pairing mode.
- Filtering by state without exposing internal complexity to public UI.

### Event Builder `/admin/events/new`
Eight implemented steps:
1. Basics
2. Experience
3. Registration
4. Payment
5. Game system
6. Media
7. Communications
8. Review

Experience precedes operational mechanics deliberately.

### Event Control Room `/admin/events/:id`
Eight implemented operational tabs:
1. Overview
2. Registrations
3. Check-in
4. Pairings & rounds
5. Payments
6. Messages
7. Gallery & recap
8. Audit

### Players `/admin/players`
- Search/scan player operational record.
- Event history, rating/attendance context and permitted private fields.
- Role/privacy boundaries remain server-enforced.

### Payments `/admin/payments`
- Provider order/payment IDs, amount, event/player, captured/pending/failed/refunded and reconciliation mismatch.
- Sensitive payment state changes remain server-owned.

### Settings `/admin/settings`
- Brand/site, Auth, Ratings, Payments, Notifications and Event defaults.
- Secrets never returned to/read from ordinary settings UI.

## Developer visual handoff

### `/handoff`
One browser index linking every route. In mock mode it provides player/admin role entry for protected screen review.

### `/handoff/design-system`
Exact live colour/type/spacing/control reference.

### `/handoff/states`
Canonical loading, empty, registration/payment, live-event, error and permission states.
