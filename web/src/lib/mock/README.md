# lib/mock: the mock PgApi (TASK-018, TASK-021)

Used only when `NEXT_PUBLIC_USE_MOCKS=true` (local, explicit preview opt-in). Production builds never contain it:
`scripts/check-build-output.ts` fails the build on the sentinel in `sentinel.ts`, the `pg:mock:v1` key or any
`lib/mock` path.

| File | Contents |
|---|---|
| `adapter.ts` | `createMockPublicApi`, `createMockPlayerApi`, `createMockPgApi`. Public reads are pure functions of (frozen seeds, mode) |
| `browser-api.ts` | `'use client'`. `createBrowserMockApi()` (what `useApi()` loads) and `createBrowserMockAuthTransport()` |
| `store.browser.ts` | `'use client'`. Scenario and contact count in sessionStorage `pg:mock:v1` |
| `mode.ts`, `latency.ts` | `?mock=slow\|error\|empty` scenarios; latency and failure injection |
| `seeds/*` | frozen fixtures, fixed clock `MOCK_NOW` |
| `auth/*` | the mock auth and profile backend (TASK-021), below |

## Demo accounts (FAKE, mock builds only)

| Email | Password | Role | State |
|---|---|---|---|
| `player@example.test` | `pg-demo-1234` | player | onboarding done, rapid and blitz ratings |
| `admin@example.test` | `pg-demo-1234` | admin | refresh token kept in memory by the TokenManager (12 h cap) |
| `new@example.test` | `pg-demo-1234` | player | first login: `onboardingDone: false`, profile incomplete |

- Password reset: request a reset for an existing email, then confirm with token `demo-reset-token` (1 hour, single
  use). `demo-reset-token-expired` shows the expired-link state (`RESET_TOKEN_INVALID`).
- Google sign-in (only with `NEXT_PUBLIC_GOOGLE_AUTH=true`): `startGoogleSignIn` returns
  `<origin>/auth/callback?code=<one-time code>`; exchanging that code signs in as the demo player.
- Accounts you register live in this browser tab's session only.

The `.test` domain is reserved and the password is public on purpose. Defined in `auth/demo-accounts.ts`.

## Mock auth backend (`auth/`)

| File | Concern |
|---|---|
| `demo-accounts.ts` | seeded accounts and demo constants (frozen) |
| `policy.ts` | lifetimes, grace window, rate limits, store bounds |
| `random.ts` | opaque random tokens (not JWTs), UUIDs, fingerprints |
| `state.ts` | zod schema of the mock "database", initial value from the seeds, `AuthStateStore` interface |
| `store.browser.ts` | `'use client'`. The store: sessionStorage `pg:mock:v1:auth` through `lib/storage/versioned.ts` |
| `transact.ts` | one call = read state, run handler, write back. No store (server): AUTH_REQUIRED / MOCK_SERVER_MUTATION |
| `errors.ts` | contract-shaped `ApiError`s, zod issues to `VALIDATION_FAILED` field errors |
| `accounts.ts` | lookups, `MeDto` / `ProfileDto` projections, weak-password stand-in |
| `rate-limit.ts` | sliding windows keyed by a fingerprint of the email |
| `sessions.ts` | token families: issue, rotate, grace, reuse detection, expiry, revoke, bearer check, step-up |
| `auth-service.ts` | A01 to A09 and `POST /auth/step-up` |
| `profile-service.ts` | M13 to M16 |
| `player-api.ts` | `player.auth` and `player.profile` PgApi groups; bearer from the TokenManager, refresh-and-replay once |
| `transport.ts` | `AuthTransport` for the TokenManager (refresh, logout, step-up) |

### State

ALL mutable auth state (accounts created, refresh-token families, used tokens, access and step-up tokens, reset
requests, OAuth codes, rate-limit hits) is in sessionStorage `pg:mock:v1:auth`. There is no module-level mutable state:
every call parses storage (or rebuilds the frozen seeds) and writes it back. Tokens, codes and passwords are stored as
fingerprints; the only raw token kept is the pair issued by the latest rotation, for its 10 s grace window.
`clearMockSession()` (store.browser.ts) resets it with the scenario.

On the server there is no store: read methods (`getMe`, `getProfile`) answer `AUTH_REQUIRED`, everything else
`MOCK_SERVER_MUTATION`.

### Behaviour (contract 2.4, 3.2, 3.4)

| Method | Success | Failures |
|---|---|---|
| `auth.login` | `{ user, tokens: { accessToken, refreshToken } }` (body mode) | `VALIDATION_FAILED` 400 (fields), `INVALID_CREDENTIALS` 401 (same for unknown email and wrong password), `RATE_LIMITED` 429 after 5 failures per email per minute |
| `auth.register` | same shape, new `player`, `onboardingDone: false` | `VALIDATION_FAILED` 400, `WEAK_PASSWORD` 400 (`fields.password`), `EMAIL_TAKEN` 409 (`fields.email`) |
| `auth.refresh` | new pair; the presented token is used up | `AUTH_REQUIRED` 401: unknown/missing token (no reason); used token outside 10 s grace revokes the family (`REFRESH_REUSED`); player idle 14 days or admin 12 h after sign-in (`SESSION_EXPIRED`); role changed (`ROLE_CHANGED`); suspended (`ACCOUNT_SUSPENDED`); a revoked family keeps answering its reason |
| `auth.logout` | always resolves; revokes the family of the token (or of the bearer) | none |
| `auth.getMe` | `MeDto` | `AUTH_REQUIRED` 401 for a missing, unknown, expired or revoked access token |
| `auth.requestPasswordReset` | always resolves, known or unknown email | `VALIDATION_FAILED`, `RATE_LIMITED` (3 per hour per email, applied to unknown emails too) |
| `auth.confirmPasswordReset` | sets the password, revokes every family of the account | `RESET_TOKEN_INVALID` 400 (bad, used, expired), `WEAK_PASSWORD` (`fields.newPassword`), `VALIDATION_FAILED` |
| `auth.stepUp` | `{ accessToken }` valid 5 min for one operation (`sessions.consumeStepUp`) | `AUTH_REQUIRED`, `INVALID_CREDENTIALS`, `RATE_LIMITED` |
| `auth.startGoogleSignIn` / `exchangeOAuthCode` | flag on: callback URL with a one-time code / token pair | flag off: `NOT_FOUND` 404 ("not enabled"); bad or used code: `AUTH_REQUIRED` |
| `profile.getProfile` | `ProfileDto` | `AUTH_REQUIRED` |
| `profile.updateProfile` | updated `ProfileDto` (only keys sent change) | `VALIDATION_FAILED` with `fields.<key>` for any server-owned key (email, role, ratings, ...) |
| `profile.updatePublicIdentity` | updated `ProfileDto` | `VALIDATION_FAILED` for any key other than the four toggles |
| `profile.savePreferences` | `MeDto` with `onboardingDone: true` (also when `skipped`) | `VALIDATION_FAILED` for unknown keys |

Every method runs the scenario gate first: `?mock=slow` delays, `?mock=error` fails with `HTTP_5XX` 503.
The access token lives 10 minutes (`accessTtlMs` option to shorten). All of `admin` still rejects with "not implemented in mock" (TASK-020). `player.me`, `registration`, `eventRoom` and
`rating` are served by `player/` (below).

### Wiring the TokenManager

`player.auth.getMe` and `player.profile.*` take the bearer from the app's TokenManager (`getBrowserClient().tokens`) and,
like `browser/client.ts`, refresh first when there is no token and refresh-and-replay once on `AUTH_REQUIRED`. The
TokenManager itself calls its `AuthTransport` for refresh, logout and step-up. In a mock build that transport must be
`createBrowserMockAuthTransport()`; `getBrowserClient()` currently always passes the fetch transport, so that one-line
switch is still to be made in `lib/api/browser/client.ts` (owned by lib/api, TASK-023).

## Mock player data (TASK-019)

`player.me` (M01 to M04), `player.registration` (R01 to R08), `player.eventRoom` (M05 to M09) and `player.rating`
(M10 to M12) are served by `player/`. Every response parses with its zod schema.

| File | Concern |
|---|---|
| `seeds/player-events.ts` | event refs with UUIDs (the 4 public events + Coffeehouse Rapid, Lakeside Blitz, a September Coffeehouse Rapid) |
| `seeds/player-registrations.ts` | the demo player's registrations: confirmed (Beginner Circle), waitlist (After Work Blitz), pending payment with a hold (Coffeehouse Rapid), cancelled + refund pending (Lakeside Blitz), history (Monsoon Open, Coffeehouse Rapid Sep) |
| `seeds/player-people.ts`, `player-ratings.ts` | opponents, people met, recent games, rating pools (Blitz established 1198, Rapid provisional 1286, Classical unrated), ledger (13 rows, `before + delta = after`), trend |
| `seeds/player-room.ts` | round 3 pairing (board 7, white vs Aarav Menon, 10+3), standings, scores, rating movement |
| `player/state.ts`, `store.browser.ts` | the session store schema and the sessionStorage `pg:mock:v1:player` store |
| `player/context.ts` | one mock request: verify bearer, read store, run handler, write store back. Server: `AUTH_REQUIRED` (reads) / `MOCK_SERVER_MUTATION` (writes) |
| `player/regs.ts`, `registrations.ts`, `room.ts`, `rating.ts` | the four groups. `room.ts` builds the six snapshots (plus three variants) as a pure function of (event, variant, progress) |
| `scenario.ts` | pure parser of the scenario tokens |

Only the seeded demo player (`player@example.test`) has history; `new@example.test`, `admin@example.test` and accounts you
register see empty lists, unrated pools and a Beginner-Circle-less dashboard. Event Room opens for a CONFIRMED registration
only (`REGISTRATION_NOT_CONFIRMED` otherwise). The Event Room demo event is Beginner Circle
(`e5e1d000-0000-4000-8000-000000000002`).

### Scenario switcher (browser only)

Add tokens to any URL; they are remembered for the tab session (sessionStorage) and combine with commas and with
`slow|error|empty`, for example `/app/events/e5e1d000-0000-4000-8000-000000000002?mock=room:live` or `?mock=slow,room:live`.

| Token | Effect |
|---|---|
| `room:before`, `checkin`, `pairing`, `live`, `between`, `complete` | the 6 Event Room states of the demo event |
| `room:manual`, `awaiting`, `rating-pending` | manual check-in required, opponent result awaiting my confirmation, complete with rating processing pending |
| `reg:pending`, `confirming`, `confirmed`, `waitlist`, `offer`, `cancelled`, `refunded` | forces the status of the Beginner Circle registration (`offer` = waitlist with a place on offer) |
| `reg:open_free`, `open_paid`, `full_waitlist`, `sold_out`, `closed`, `not_yet_open`, `already_registered`, `ineligible` | forces the R01 resolver state for every event |
| `next:none` | dashboard with no next event |
| `rating:empty` | all pools unrated, empty ledger and trend |
| `reset` | clears the scenario AND every registration, check-in and result change of this session |

Programmatic: `setMockScenario`, `resetMockScenario`, `readMockScenario` in `player/store.browser.ts` (for a future dev panel).

### State

Mutable player state (registrations you create or change, check-in time, submitted result, scenario) is ONLY in
sessionStorage `pg:mock:v1:player`; the seeds stay frozen and nothing lives at module level. Mutations the demo supports:
reserve (free: confirmed; paid: pending with a 15 min hold), join waitlist, create order, verify payment, cancel (refused
inside 24 h of the start: `CANCELLATION_NOT_ALLOWED`), accept waitlist offer, check in (only while `checkin_open`),
submit result (only while `live_round` and no result yet), confirm and dispute (only while `awaiting_confirmation`).
A forced `room:` variant is a scenario, so submitting or confirming a result moves the live round to its result state
but does not advance to the next room state; switch with `room:between`. Stale or wrong states answer the contract codes
(`CHECKIN_WINDOW_CLOSED`, `RESULT_NOT_ALLOWED`, `EVENT_FULL`, `ALREADY_REGISTERED`, ...).
