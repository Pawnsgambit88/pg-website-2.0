# Screen Map — Route, Source, Data and Ownership

Every visual route in this table is implemented in `src/pages`. The backend developer should wire the existing composition rather than redesign it.

| Route | Screen source | Auth | Primary backend/CMS source | Critical states |
|---|---|---:|---|---|
| `/` | `public/HomePage.tsx` | No | published CMS home + upcoming events | CMS fallback, 0–3 upcoming events, static/carousel media |
| `/play` | `public/PlayPage.tsx` | No | public events query | filters, no results, free/paid/full/waitlist |
| `/events/:slug` | `public/EventPage.tsx` | No | event + venue + media + counts | open, full, completed/archive, sold out |
| `/past-events` | `public/PastEventsPage.tsx` | No | completed public events | search result/empty archive |
| `/community` | `public/CommunityPage.tsx` | No | CMS page/media | media unavailable fallback |
| `/stories` | `public/StoriesPage.tsx` | No | `cms_stories` + media | featured/no-featured, empty |
| `/contact` | `public/ContactPage.tsx` | No | configured contact action/provider | success, validation, service error |
| `/privacy` | `public/LegalPage.tsx` | No | approved legal content | published content only |
| `/terms` | `public/LegalPage.tsx` | No | approved legal content | published content only |
| `/refund-policy` | `public/LegalPage.tsx` | No | approved legal content | published content only |
| `/login` | `auth/LoginPage.tsx` | No | Supabase Auth | sign in/create, Google, validation, return intent |
| `/auth/callback` | `auth/AuthCallbackPage.tsx` | OAuth | Supabase OAuth exchange | processing, failure, redirect |
| `/reset-password` | `auth/PasswordResetPage.tsx` | No | Supabase reset | neutral submitted response |
| `/welcome` | `player/WelcomePage.tsx` | Yes | `profiles.preferences` | first login, skip-safe |
| `/events/:slug/register` | `player/EventRegistrationPage.tsx` | Yes | capacity RPC + payment funcs | free, paid, hold, full, waitlist, failure |
| `/app` | `player/PlayerDashboardPage.tsx` | Player | registrations, event state, next pairing, ratings | no next event, pairing pending/live, post event |
| `/app/events` | `player/MyEventsPage.tsx` | Player | registrations + events | upcoming, waitlist, pending payment, history |
| `/app/events/:id` | `player/PlayerEventRoomPage.tsx` | Player | check-in, rounds, pairings, standings | arrival, checked-in, live, between, complete |
| `/app/rating` | `player/RatingPage.tsx` | Player | rating profiles + ledger | Blitz/Rapid/Classical, unrated pool, history |
| `/app/profile` | `player/ProfilePage.tsx` | Player | private profile + public player profile | public/private controls, validation |
| `/admin` | `admin/AdminDashboardPage.tsx` | Admin | operations aggregate + CMS health | no event today, operational alerts |
| `/admin/content` | `admin/ContentAdminPage.tsx` | Admin | CMS pages/sections | clean/dirty, validation, preview, publish |
| `/admin/media` | `admin/MediaAdminPage.tsx` | Admin | storage/media/collections | upload, alt missing, static/carousel, reorder |
| `/admin/stories` | `admin/StoriesAdminPage.tsx` | Admin | `cms_stories` | draft/published, media missing |
| `/admin/testimonials` | `admin/TestimonialsAdminPage.tsx` | Admin | testimonials + asset + consent | incomplete, publish blocked, >3 public carousel |
| `/admin/events` | `admin/EventsAdminPage.tsx` | Admin | events + registration summary | draft/open/live/completed/cancelled |
| `/admin/events/new` | `admin/EventBuilderPage.tsx` | Admin | event create/update | eight-step builder, draft/publish validation |
| `/admin/events/:id` | `admin/EventOperationsPage.tsx` | Admin | event operations + audit | 8 operational tabs, pairing/result/payment state |
| `/admin/players` | `admin/PlayersAdminPage.tsx` | Admin | player operational view | search, selected detail, no result |
| `/admin/payments` | `admin/PaymentsAdminPage.tsx` | Admin | payment ledger/provider reconciliation | captured/pending/refunded/mismatch |
| `/admin/settings` | `admin/SettingsAdminPage.tsx` | Admin | non-secret settings | provider enabled/disabled, save errors |
| `/handoff` | `handoff/HandoffIndexPage.tsx` | Review | static route catalog | mock role switching |
| `/handoff/design-system` | `handoff/DesignSystemPage.tsx` | Review | CSS tokens | canonical visual reference |
| `/handoff/states` | `handoff/StatesPage.tsx` | Review | static state catalog | loading/empty/payment/live/error examples |

## Non-page backend surfaces

- `create-payment-order` — creates provider order from server-derived price.
- `verify-payment` — verifies authenticated user's order/payment and confirms registration.
- `razorpay-webhook` — idempotent provider reconciliation.
- `check-in` — event check-in with time/event constraints.
- `generate-pairings` — admin-only draft generation.
- `publish-round` — admin-only publication.
- `submit-result` — permitted result submission workflow.
- `finalize-round` — idempotent server-side rating processing.
- `send-event-message` — admin-only event communication.
- `admin-set-role` — protected role management.

See `docs/BACKEND-CONTRACT.md` for request/authority boundaries.
