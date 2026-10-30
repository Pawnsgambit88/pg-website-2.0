# lib/api: PgApi types, schemas and endpoint map (TASK-016)

Scope: public and player surface (TASK-016) and the admin surface, `pg-admin-api.ts` and `types/admin/*` (TASK-017).
Transport (`envelope.ts`, `errors.ts`, `http.ts`, `server/`, `browser/`) is TASK-014, described in "Transport (TASK-014)" below. Mock adapter and fixtures are TASK-018.

Rules for files here: zod 4 schemas with inferred types, one concern per file, named exports, no barrels, and no
`server-only` or browser-only imports, so server fetchers and browser clients can share them.

## Layout (ARCH-001 6.1 allows `types/*` and `pg-api.ts`; the per-file split is this task's choice)

| File | Contents |
|---|---|
| `pg-api.ts` | `PgApi` = `{ public, player, admin }`; `PgPublicApi`, `PgPlayerApi` (`auth`, `me`, `registration`, `eventRoom`, `rating`, `profile`), `ReadOpts`, `RequestOpts`, query types |
| `pg-admin-api.ts` | `PgAdminApi` (11 grouped sub-interfaces), `AdminRequestOpts`, `StepUpOpts`, `AdminOptionalKeyOpts` |
| `types/response-schemas.ts` | schema of every method's payload (the adapter passes it to `request(...)`; the type test ties it to the interface) |
| `types/primitives.ts` | slug, paise, ISO instant/date, UUID, idempotency key, URL refinements, media allow-list hook, focal |
| `types/error-codes.ts` | tiers A, B, C, auth failure reasons |
| `types/envelope.ts`, `types/pagination.ts` | wire envelope, `meta.pagination`, `Page<T>` |
| `types/media.ts`, `content-blocks.ts` | media ref (alt or decorative, focal), collection, closed block model |
| `types/event-state.ts`, `event.ts`, `standings.ts`, `story.ts`, `testimonial.ts`, `site-content.ts`, `legal-sitemap.ts`, `contact.ts` | public reads |
| `types/auth.ts`, `profile.ts`, `identity.ts` | session, token shapes (body and cookie mode), private profile vs public identity |
| `types/registration.ts`, `payment.ts`, `my-events.ts`, `rating.ts`, `event-room.ts` | player surface |

## Conventions encoded here

- `data` keys are camelCase; envelope keys (`request_id`, `retry_after`, `meta.pagination.page_size`) stay snake_case (DEC-B03). `toPaginationMeta` converts.
- Money is integer paise plus `currency: 'INR'`. The browser sends no price, amount or currency (request schemas are `strictObject`).
- Times are ISO 8601 with offset; countdown-driving responses carry `serverNow`.
- Slugs: `^[a-z0-9]+(?:-[a-z0-9]+)*$`, max 100, branded `Slug`. Events and stories only. Immutable once published; a draft or unpublished slug reads as `null` (HTTP 404).
- Public DTOs are separate types with no UUID, email, phone, birthday or provider ids. Zod strips unknown keys on parse, so a leaking backend field does not reach a component.
- Links from data: `http`, `https`, `mailto`, `tel` or a same-site path. Media `src`: same-site path or https without a query; the host allow-list is injected through `createMediaSrcSchema(policy)` (`MediaUrlPolicy`).
- State machines are discriminated unions: registration (`status`), availability (`state`), registration resolver (`state`), room (`roomState`), result (`state`), check-in (`status`), rating processing (`status`), rating pool (`state`).
- Capability flags (`canCheckIn`, `canSubmitResult`, `canConfirmResult`, `canDispute`, `canContactHost`) and `result` come from the server; the UI never infers who may act.

## Method to endpoint-id map (backend contract section 3)

| PgApi method | Contract id | HTTP |
|---|---|---|
| `public.getSiteContent(section)` | P01 | GET /site/{section} |
| `public.getUpcomingEvents(query)` | P02 | GET /events |
| `public.getEventBySlug(slug)` | P03 | GET /events/{slug} |
| `public.getEventAvailability(slug)` | P04 | GET /events/{slug}/availability |
| `public.getPastEvents(query)` | P05 | GET /past-events |
| `public.getStories(query)` | P06 | GET /stories |
| `public.getStoryBySlug(slug)` | P07 | GET /stories/{slug} |
| `public.getTestimonials()` | P08 | GET /testimonials |
| `public.getLegalPage(page)` | P09 | GET /legal/{page} |
| `public.getSitemapEntries(query)` | P10 | GET /sitemap-entries |
| `public.submitContact(input, key)` | P11 | POST /contact (IK) |
| `public.getPublicSettings()` | P12 (inferred) | GET /settings/public |
| `player.auth.register` | A01 | POST /auth/register |
| `player.auth.login` | A02 | POST /auth/login |
| `player.auth.refresh` | A03 | POST /auth/refresh |
| `player.auth.logout` | A04 | POST /auth/logout |
| `player.auth.getMe` | A05 | GET /auth/me |
| `player.auth.requestPasswordReset` | A06 | POST /auth/password-reset |
| `player.auth.confirmPasswordReset` | A07 | POST /auth/password-reset/confirm |
| `player.auth.startGoogleSignIn` | A08 | GET /auth/oauth/google/start |
| `player.auth.exchangeOAuthCode` | A09 | POST /auth/oauth/exchange |
| `player.auth.stepUp` | contract 2.4 (no id) | POST /auth/step-up |
| (not a method) | A10 | GET /auth/oauth/google/callback, provider redirect on the API origin |
| `player.registration.getRegistrationState(slug)` | R01 | GET /events/{slug}/registration |
| `player.registration.reserve` | R02 | POST /registrations (IK) |
| `player.registration.joinWaitlist` | R03 | POST /registrations/waitlist (IK) |
| `player.registration.createPaymentOrder` | R04 | POST /payments/orders (IK) |
| `player.registration.verifyPayment` | R05 | POST /payments/verify (IK) |
| `player.registration.getRegistration(id)` | R06 | GET /registrations/{id} |
| `player.registration.cancelRegistration(id)` | R07 | POST /registrations/{id}/cancel |
| `player.registration.acceptWaitlistOffer(id)` | R08 (inferred) | POST /registrations/{id}/accept-offer (IK) |
| (not a method) | W01 | POST /webhooks/razorpay, inbound to Railway |
| `player.me.getNextUp` | M01 | GET /me/next-up |
| `player.me.getRecentGames` | M02 | GET /me/recent-games |
| `player.me.getPeople` | M03 | GET /me/people |
| `player.me.getMyEvents(query)` | M04 | GET /me/registrations |
| `player.eventRoom.getSnapshot(eventId)` | M05 | GET /me/events/{eventId}/room |
| `player.eventRoom.checkIn` | M06 | POST /me/events/{eventId}/check-in |
| `player.eventRoom.submitResult` | M07 | POST /me/events/{eventId}/results (IK) |
| `player.eventRoom.confirmResult` | M08 | POST /me/events/{eventId}/results/{pairingId}/confirm |
| `player.eventRoom.disputeResult` | M09 | POST /me/events/{eventId}/results/{pairingId}/dispute |
| `player.rating.getRatings` | M10 | GET /me/ratings |
| `player.rating.getLedger(pool)` | M11 | GET /me/ratings/{pool}/ledger |
| `player.rating.getTrend(pool)` | M12 | GET /me/ratings/{pool}/trend |
| `player.profile.getProfile` | M13 | GET /me/profile |
| `player.profile.updateProfile` | M14 | PATCH /me/profile |
| `player.profile.updatePublicIdentity` | M15 | PATCH /me/public-identity |
| `player.profile.savePreferences` | M16 | PATCH /me/preferences |

IK = `Idempotency-Key` required (contract 2.5). Optional keys are `OptionalKeyOpts.idempotencyKey`.
### Admin (TASK-017): `PgApi.admin`, browser only, admin role

Sub-interfaces live in `pg-admin-api.ts`; each method's payload schema is `types/response-schemas.ts` `admin<Group>Responses.<method>`.
`void` and `Blob` methods (`media.deleteAsset`, `control.exportAudit`) have no payload schema. IK = `Idempotency-Key` positional `key`.
STEP-UP = `opts.stepUp` (a branded `StepUpToken` from `player.auth.stepUp`, used for that one request).

| PgAdminApi method | Contract id | HTTP | Notes |
|---|---|---|---|
| `dashboard.getDashboard` | D01 | GET /admin/dashboard | `event: null` = empty state |
| `events.listEvents(query)` | E01 | GET /admin/events | |
| `events.createDraft` | E02 | POST /admin/events | |
| `events.getEvent(id)` | E03 | GET /admin/events/{id} | lockedFields, readiness |
| `events.updateEvent(id, input)` | E04 | PATCH /admin/events/{id} | `version`; VERSION_CONFLICT |
| `events.checkSlug(query)` | E05 | GET /admin/slugs/check | events and stories |
| `events.getEventTypes` | E06 | GET /admin/event-types | bounded |
| `events.publishEvent(id, key)` | E07 | POST /admin/events/{id}/publish | IK |
| `events.unpublishEvent(id)` | E08 | POST /admin/events/{id}/unpublish | |
| `events.cancelEvent(id, input, key)` | E09 | POST /admin/events/{id}/cancel | IK |
| `events.completeEvent(id, input?)` | E10 | POST /admin/events/{id}/complete | |
| `control.getOverview` | C01 | GET /admin/events/{id}/overview | |
| `control.listRegistrations` | C02 | GET /admin/events/{id}/registrations | PII, admin only |
| `control.actOnRegistration` | C03 | POST .../registrations/{regId}/actions | |
| `control.setCheckIn` | C04 | POST /admin/events/{id}/check-in | manual check-in or undo |
| `control.checkInAll` | - | POST /admin/events/{id}/check-in/all | checks in every confirmed player not yet arrived |
| `control.getCheckInDesk` | C05 | GET /admin/events/{id}/check-in | |
| `control.listRounds` | C06 | GET /admin/events/{id}/rounds | bounded |
| `control.generateRound` | C07 | POST .../rounds/generate | unpublished draft |
| `control.editPairings` | C08 | PATCH .../rounds/{roundId}/pairings | reason after publish |
| `control.publishRound` | C09 | POST .../rounds/{roundId}/publish | IK |
| `control.startRound` | C10 | POST .../rounds/{roundId}/start | |
| `control.recordResult` | C11 | PUT .../pairings/{pairingId}/result | `record` or `resolve` |
| `control.finaliseRound` | C12 | POST .../rounds/{roundId}/finalise | IK; RESULTS_NOT_FINAL |
| `control.listEventPayments` | C13 | GET /admin/events/{id}/payments | |
| `control.listMessages` | C14 | GET /admin/events/{id}/messages | |
| `control.getMessage` | C14 (inferred sub-path) | GET .../messages/{messageId} | per-recipient delivery |
| `control.sendMessage` | C14 | POST /admin/events/{id}/messages | IK; 202 |
| `control.getCommunications` / `updateCommunications` | C15 | GET, PATCH .../communications | |
| `control.getRecap` / `updateRecap` | C16 | GET, PATCH .../recap | |
| `control.listAudit` | C17 | GET /admin/events/{id}/audit | |
| `control.exportAudit` | C17 `?format=csv` | GET .../audit?format=csv | STEP-UP |
| `cms.listSections` | S01 | GET /admin/cms/sections | bounded |
| `cms.getSection(key)` | S02 | GET /admin/cms/sections/{key} | |
| `cms.saveSectionDraft(input)` | S03 | PUT /admin/cms/sections/{key}/draft | `key` inside input selects the shape |
| `cms.publishSection(key, version, key)` | S04 | POST .../sections/{key}/publish | IK |
| `cms.listSectionVersions` | S05 | GET .../sections/{key}/versions | |
| `cms.getLegalPage` / `saveLegalDraft` / `publishLegalPage` | S06 | GET, PUT, POST /admin/legal/{page}[/publish] | publish IK |
| `media.requestUpload` | S07 | POST /admin/media/uploads | signed URL to Storage |
| `media.completeUpload` | S08 | POST /admin/media/assets/{assetId}/complete | |
| `media.listAssets` | S09 | GET /admin/media/assets | |
| `media.updateAsset` | S10 | PATCH /admin/media/assets/{assetId} | alt, focal, archive |
| `media.deleteAsset` | S11 | DELETE /admin/media/assets/{assetId} | ASSET_IN_USE |
| `media.listCollections` / `getCollection` / `createCollection` / `updateCollection` | S12 | GET, POST, GET, PATCH /admin/media/collections[/{id}] | |
| `stories.listStories` / `createStory` / `getStory` / `updateStory` | S13 | GET, POST, GET, PATCH /admin/stories[/{id}] | |
| `stories.publishStory` / `unpublishStory` | S14 | POST /admin/stories/{id}/publish, /unpublish | publish IK |
| `testimonials.listTestimonials` / `createTestimonial` / `getTestimonial` / `updateTestimonial` | S15 | GET, POST, GET, PATCH /admin/testimonials[/{id}] | |
| `testimonials.publishTestimonial` / `unpublishTestimonial` | S16 | POST /admin/testimonials/{id}/publish, /unpublish | NOT_PUBLISHABLE |
| `preview.createPreviewLink` | PV01 | POST /admin/preview-link | |
| `players.listPlayers` | G01 | GET /admin/players | |
| `players.getPlayer` | G02 | GET /admin/players/{id} | permitted private fields |
| `players.changeRole(id, input, key, opts)` | G03 | PUT /admin/players/{id}/role | IK + STEP-UP |
| `payments.listLedger` | G04 | GET /admin/payments | |
| `payments.refund(id, input, key, opts)` | G05 | POST /admin/payments/{id}/refund | IK + STEP-UP |
| `payments.reconcile` | G06 | POST /admin/payments/reconcile | counts only |
| `settings.getSettings` | G07 | GET /admin/settings | non-secret |
| `settings.updateSettings` | G08 | PATCH /admin/settings | `version`; allow-list |

71 methods: dashboard 1, events 10, control 22, cms 8, media 9, stories 6, testimonials 6, preview 1, players 3, payments 3, settings 2.

Admin type files (`types/admin/`): `common` (capability flag with mandatory reason, blockers, publish readiness, `lastChange`, `StepUpToken`),
`slug`, `event-builder` (8 steps, lifecycle), `event-list`, `preview`, `dashboard`, `cms`, `media`, `stories`, `testimonials`,
`settings`, `players`, `payments`, `control-overview|registrations|checkin|rounds|messages|recap|audit`.

Admin conventions: every versioned write carries `version` (VERSION_CONFLICT when stale; the caller re-reads and shows `lastChange`);
published states are discriminated unions so a published asset without alt, a published testimonial without quote, photo or consent,
and a locked slug without a value are unrepresentable; request schemas are `strictObject`; settings are closed objects guarded by
`hasSecretLookingKey` and the compile-time `SettingsHasNoSecrets` check.

## Mismatches and inferences recorded for the architect

See the TASK-016 report. Short list: ARCH-001 11.1 sketches `getUpcomingEvents(): EventCardDto[]` and `getStories(): StoryCardDto[]` but the
contract says P02/P06 are paginated, so these return `Page<T>`; `getSitemapEntries` is also paged. The slug length in the contract (3 to 80) differs from
ARCH-001 M13 (max 100); reads use M13, `authoringSlugSchema` carries 3 to 80 for the builder.

## Transport (TASK-014)

Two entries share one core. Public reads run on the server and are cached; everything else runs in the browser with the in-memory bearer.

| File | Runs | Contents |
|---|---|---|
| `errors.ts` | both | `ApiError` (`code`, `status`, `detail`, `fields`, `requestId`, `retryAfter`, `reason`, `serverCode`), `codeFromStatus`, `resolveErrorCode`, abort helpers. `toJSON()` exposes only `{code,status,requestId,retryAfter}` |
| `envelope.ts` | both | `parseResponse`: 204/205, strict envelope, **legacy-bare normaliser** (delete that section when the backend is fully enveloped, DEC-008), `validatePayload` (schema path only on mismatch, never the body) |
| `error-copy.ts` | both | `copyFor(error, { action })` over a `Record<ErrorCode, ...>` (a new code is a compile error until it has copy), `fieldErrorsFrom`, `describeWait`. Never shows `detail` or `message` |
| `idempotency.ts` | both | `newIdempotencyKey()`; the caller creates it when the user's intent starts |
| `url.ts` | both | `resolveApiUrl` (relative path under a fixed base, pinned origin, no encoded slashes/dots), `seg`, `isSameOrigin` |
| `http.ts` | both | `anySignal` (in-repo, not `AbortSignal.any`), `sendRequest` (timeout, abort vs timeout vs network classification) |
| `requester.ts` | types | `ApiRequester` + `RequestSpec`: what the adapter describes, what a transport implements |
| `server/fetch.ts` | server (`server-only`) | `serverGet(path, { tags, revalidate, schema })`, `createServerRequester()`. `API_INTERNAL_URL` + `/api`, 10 s, no cookies/headers/tokens, `next: { tags, revalidate }`, GET only |
| `browser/client.ts` | browser | `getBrowserClient()`, `createRequester(deps)`: bearer from the token manager, same-origin gate, single-flight 401 refresh then one replay, 15 s timeout, never auto-retries |
| `browser/transport.ts` | browser | `createFetchAuthTransport()`: the real fetch behind `AuthTransport` (TASK-125). `getBrowserClient()` calls `configureTokens(transport)` once |
| `adapters/real.ts` | both | `createRealPublicApi(requester)`, `createRealPlayerApi(requester, hooks)`: PgApi methods for the public and player groups against the endpoint ids above |
| `adapters/getPublicApi.server.ts` | server (`server-only`) | `getPublicApi()`, used only by `lib/data/public/*` (TASK-111) |
| `adapters/useApi.browser.ts` | browser | `useApi()`: lazily-bound `PgApi` (safe to call during SSR; methods throw on the server) |

Names: M2 forbids `index.ts`, so the entry files are `getPublicApi.server.ts` and `useApi.browser.ts`. The depcruise/directive scripts key on the `.server.` / `.browser.` suffix (the layout in ARCH-001 6.1 says `index.server.ts` / `index.browser.ts`; only the suffix matters to the tooling).

### Rules this layer enforces

- **Bearer only to the page origin (F-16).** URLs are built from a relative path and `NEXT_PUBLIC_API_BASE_URL` (relative by schema). No backend-supplied URL ever becomes a request; legacy DRF `next`/`previous` are ignored; paging is by number. The OAuth start URL is checked against `OAUTH_REDIRECT_HOSTS` before the caller redirects.
- **Single-flight refresh (12.3).** A missing/expired token or a 401 on an `auth: true` call awaits `TokenManager.refresh()` (one shared promise, cross-tab lock) and replays the call once with the same `Idempotency-Key`. Failure rejects `ApiError(AUTH_REQUIRED, reason)`; the token manager emits the session-ended event once (TASK-023 turns it into `/login?returnTo=` and clears the Query cache).
- **No automatic retry of a failed call.** A POST that timed out may have been processed; only the caller, with the same key, may retry. The 401 replay is the one exception (the server rejected the credential before running the handler).
- **Abort is not an error.** A caller abort rejects with an `AbortError` (Query ignores it); a timeout is `ApiError(TIMEOUT)`; a rejected fetch is `ApiError(NETWORK)`. Nothing is logged.
- **Nothing sensitive is logged or thrown.** Messages are fixed strings; fetch's own error (which can contain a host) is dropped; `redirect: 'error'` so a redirect cannot carry the bearer elsewhere.
- **Unknown backend codes** fall back to the HTTP-status code (`HTTP_4xx`/`HTTP_5XX`), keeping the original as `serverCode` for diagnostics only. Tier B names sent by a backend are treated as unknown.
- **Server reads are public and read-only.** `createServerRequester()` rejects any non-GET or `auth` request with `MOCK_SERVER_MUTATION`.

### Status and follow-ups

- **Admin (`PgApi.admin`) is not implemented**: `useApi().admin` is a placeholder whose methods reject with a plain `Error`. Needs a `createRealAdminApi(requester)` (71 methods), step-up wiring through `createStepUp` (`StepUpOpts.stepUp` maps to `RequestSpec.bearer`) and `AdminRequestOpts`.
- **Mock switch** (TASK-018): both entry points are real-only until `lib/mock/adapter.ts` exists.
- `player.auth.refresh` / `logout` are raw endpoint calls for conformance; the app uses `TokenManager.refresh()` / `logout()`. Login, register and OAuth exchange return tokens that the caller (TASK-023) passes to `TokenManager.setSession`.
- Cookie-mode CSRF bootstrap value stays behind the single constant `CSRF_BOOTSTRAP_VALUE` in `browser/tokens.ts`.
