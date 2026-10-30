# PG Chess backend (Django REST)

Contract: `docs/architecture/ARCH-001-backend-contract.md`. Envelope: DEC-011.

## Setup

```
cd backend
venv\Scripts\python.exe -m pip install -r requirements.txt
copy .env.example .env      # fill in DB_USER / DB_PASSWORD / DJANGO_SECRET_KEY (never commit)
set DEBUG=True              # or DEBUG=True in .env
venv\Scripts\python.exe manage.py migrate
venv\Scripts\python.exe manage.py seed_dev_accounts   # DEBUG only
venv\Scripts\python.exe manage.py runserver 8000
```

`DJANGO_SECRET_KEY` has no fallback: without it the process stops unless `DEBUG=True` (then a random per-process key is used).

## Database decision

The local PostgreSQL server also hosts other projects' databases. The configured database `pgchess` was checked first:
it contained only this project's legacy tables (`users`, `ratings`, `tournaments`, ... plus Django's `auth_*`). The owner
had no data to keep, so ONLY those legacy tables were dropped and their `django_migrations` rows cleared, then the new
migrations were applied. Nothing else was touched (the server's other databases, and the `content_*` tables of the public
content app, were left alone). Set `DB_NAME=pgchess` in `.env`. No new database was needed.

Accounts migration history was replaced by a single clean `accounts/migrations/0001_initial.py` (new `User`, UUID pk).
## Conventions implemented (`core/`)

- Envelope `{success, message, data, error, meta{request_id, timestamp, pagination}}` for every `/api/` response, including
  unknown routes (404) and 500s. `X-Request-ID` equals `meta.request_id`; a safe inbound id is accepted.
- Errors: raise a `core.errors.ApiError` subclass; codes are the tier A and C lists in `web/src/lib/api/types/error-codes.ts`.
  Extra codes outside that list (frontend falls back to HTTP copy): `METHOD_NOT_ALLOWED`, `UNSUPPORTED_MEDIA_TYPE`, `INTERNAL_ERROR`.
- Pagination: `core.pagination.PagePagination` (`page`, `page_size`, max 100) -> `meta.pagination`, never `next` URLs.
- Rate limits: `core.ratelimit` (database backed, subjects hashed). Idempotency: `core.idempotency.run_idempotent`
  (24 h, replay header `Idempotent-Replay`). Client IP: `core.clientip` honours `TRUSTED_PROXY_COUNT` only.
- Default permission is deny (`IsAuthenticated`); public views opt in with `AllowAny`. Default `Cache-Control: no-store`
  on `/api/` unless a view sets its own. Security headers: HSTS (non-DEBUG), nosniff, frame deny.
- Logging: one line per request (`request_id method path status latency actor`); no query strings, bodies, tokens, emails.

## Auth (`accounts/`)

Routes (no trailing slash): `POST /api/auth/register|login|refresh|logout|step-up|password-reset|password-reset/confirm`,
`GET /api/auth/me`, Google stubs `GET /api/auth/oauth/google/start`, `POST /api/auth/oauth/exchange`,
`GET /api/auth/oauth/google/callback` (404 NOT_FOUND "not enabled" while `GOOGLE_AUTH_ENABLED` is off; the provider flow itself is not built),
`GET /api/me/profile`, `PATCH /api/me/profile|public-identity|preferences`.

Token modes (`AUTH_TOKEN_MODE`):
- `body`: `{accessToken, refreshToken}` in `data`; refresh/logout read `refreshToken` from the JSON body.
- `cookie`: `data` has only `accessToken`; refresh token in an httpOnly `SameSite=Strict` cookie, `Path=/api/auth`,
  `Secure` unless DEBUG, name `AUTH_REFRESH_COOKIE_NAME` (default `__Secure-pg_rt`, `pg_rt` in DEBUG). Refresh and logout require a non-empty `X-CSRF-Token` header.

Sessions: access token is a signed `{user, family, expiry}` blob without role (default 10 min); user, role, status and the
session family are re-read from the database on every request. Refresh tokens are `<family>.<generation>.<hmac>`: single
use, rotating, 10 s grace replay returns the same current pair, any other replay revokes the family (`REFRESH_REUSED`),
absolute lifetime 14 days (admin 12 h, `SESSION_EXPIRED`), role/status change ends the family (`ROLE_CHANGED`,
`ACCOUNT_SUSPENDED`). Password reset confirm revokes every family. Reset tokens are stored hashed, single use, 1 h.
Step-up: `POST /api/auth/step-up` returns a single-use 5 minute grant; admin views call `accounts.services.consume_step_up`.

Rate limits: login 5 failures/min per email and 10/min per IP; register 5/min per email and 10/min per IP; reset request
3/h per email and 10/h per IP; refresh 120/min per IP.

## Legacy routes

The legacy `tournaments/` and `gallery/` apps were removed in BE-13 (they reproduced contract 6.1 defects and nothing
referenced them; `payments/` was rebuilt in BE-03). Their duplicate `glicko2.py` / `swiss.py` went with them: rating maths
lives in `ratings/glicko2.py`, pairing in `registrations/pairing_engine.py`. Migration `core.0002_drop_legacy_tables` drops
`pairings`, `tournament_rounds`, `tournament_registrations`, `tournaments`, `gallery_photos` when they exist and are empty,
and clears the two apps' `django_migrations` rows. A table that still has rows is kept and reported; drop it by hand after
owner sign-off.

## Supabase lockdown (RLS)

Supabase exposes every `public` table to PostgREST (`anon`, `authenticated`). The web app never uses that path, so every
public table must have Row Level Security ON with NO policies. `core.0003_supabase_rls_lockdown` does this when the
`anon` and `authenticated` roles exist (Supabase) and is a no-op on plain PostgreSQL. The Django DB role must own the
tables or have BYPASSRLS (the Supabase `postgres` role does), otherwise the app itself is locked out.
Tables created by later migrations are not covered automatically: run `python manage.py check_rls` after deploys (exit
code 1 on Supabase if any public table has RLS off; prints the state anywhere) and `check_rls --apply` to fix.

## Admin foundation (`adminapi/`, `audit/`)

- `/api/admin/*` is mounted before the catch-all 404. Subclass `adminapi.views.AdminView` (permission `IsAdmin`): 401
  `AUTH_REQUIRED` when anonymous, 403 `ADMIN_REQUIRED` for non-admins. The role comes from the database row loaded per
  request, never from the token. Built so far: `ping`, dashboard and events (below).
- Admin events (BE-04, `adminapi/event_builder.py`, `event_service.py`, `views_events.py`): D01 `GET /admin/dashboard`;
  E01-E10 `GET|POST /admin/events`, `GET|PATCH /admin/events/{id}`, `GET /admin/slugs/check`, `GET /admin/event-types`,
  `POST /admin/events/{id}/publish|unpublish|cancel|complete` (publish and cancel need `Idempotency-Key`). Each write is
  one transaction: event row lock, change, strict audit row, and the revalidation outbox row (via `content.signals`).
  PATCH needs `version` (`VERSION_CONFLICT`); fields locked once registrations/payments exist (price, capacity, pairing
  mode, rated, pool) are refused; the slug is immutable after first publish. Operational groups (capacity, payment,
  pairing, eligibility, rating) are audited as `event.update_operational` and need a step-up token once the event is
  public. Cancel with a paid registration needs a step-up, queues refunds with `refund_payment(execute=False)` and
  executes them after commit. `NOT_PUBLISHABLE` also carries `error.blockers[]` (additive envelope key). Drafts are
  incomplete by design: `Event.slug`, dates and capacity are nullable until publish (migration `content.0003`).
- Admin rounds (BE-05, `adminapi/round_service.py`, `views_rounds.py`, `registrations/pairing_engine.py`): C06 `GET
  /admin/events/{id}/rounds`; C07 `POST .../rounds/generate` (unpublished draft; swiss or social_balanced; no FIDE claim);
  C08 `PATCH .../rounds/{rid}/pairings` (a draft edit is free; after publish it needs `reason`, bumps `pairingVersion`, is
  audited and cannot touch a board that has a result); C09 `POST .../publish` and C12 `POST .../finalise` need
  `Idempotency-Key`; C10 `POST .../start`; C11 `PUT .../pairings/{pid}/result` (`record` or `resolve`, reason mandatory).
  Writes send `version` (`VERSION_CONFLICT`). Finalise locks the round, runs `ratings.services.process_round` in the same
  transaction, sets `ratings_processed_at`; the same key replays the original, any other key gets `ROUND_ALREADY_FINALIZED`.
  The event room (`registrations/room.py`) shows published, live and completed rounds, and `ratingProcessing` from the
  ledger once the event is completed. Display ratings now prefer `ratings.PoolRating` over the legacy account `Rating`.
  Migration `registrations.0002` adds round `method`, `pairing_version`, `last_change_reason`, `finalise_key` and pairing
  `admin_decided`, `admin_reason`.
- Control room (BE-06, `adminapi/control_service.py`, `views_control.py`; a draft event has none, 404): C01 `GET
  /admin/events/{id}/overview`; C02 `GET .../registrations` (`q`, `payment`, `status`, `firstTimer`; the only place PII is
  returned); C03 `POST .../registrations/{rid}/actions` (`cancel|move_to_waitlist|promote|mark_welcomed|set_pairing_active`;
  the only way registration state changes besides refund; capability flags and the action share one rule function; cancel
  of a captured payment needs a step-up token, calls `refund_payment(execute=False)` and executes after commit; seat flips
  emit `event/updated` via `adjust_confirmed`); C04/C05 `POST|GET .../check-in` (host-desk check-in/undo, desk list,
  counts); C13 `GET .../payments` (one row per order); C16 `GET|PATCH .../recap` (completed events; saving emits
  `event/updated`); C17 `GET .../audit` (+ `?format=csv`: step-up, 10000 rows max, formula-injection neutralised, export
  audited). The audit list shows only actions mapped to the web vocabulary (`control_service.AUDIT_WEB`). Migrations:
  `registrations.0003` (`welcomed_at`, `welcomed_by`, `pairing_active`, `version`), `content.0004`
  (`archive_published_at`). Round generation skips registrations with `pairing_active = false`.
- Media (BE-07, `adminapi/media_service.py`, `views_media.py`, `content/storage.py`, `content/dev_storage.py`): S07 `POST
  /admin/media/uploads` (`{filename, contentType, sizeBytes}`; JPEG/PNG/WebP, max 10 MB; returns `assetId`, `uploadUrl`,
  `method`, `headers`, `expiresAt`; object key is `media/<random uuid>.<ext>`, never from the filename; 50 pending uploads
  per admin); S08 `POST /admin/media/assets/{id}/complete` (reads the object back, checks magic bytes, dimensions, re-encodes
  the image so EXIF/GPS is dropped, then creates the asset; repeat calls return the same asset); S09 `GET /admin/media/assets`
  (`q`, `status=active|archived|all`, `missingAlt`, `page`; `usedBy[]`); S10 `PATCH /admin/media/assets/{id}` (alt,
  decorative, focalX/Y, credit, archived; optional `version`; missing alt returns `warnings[]`, never an error); S11 `DELETE`
  (`ASSET_IN_USE` while a collection, event cover, story cover or testimonial portrait uses it; archive instead); S12
  `GET|POST /admin/media/collections`, `GET|PATCH /admin/media/collections/{id}` (ids are integers sent as strings; PATCH
  `items` replaces the ordered list, archived assets cannot be added). Saves go through `content.signals`, so each change
  writes one `updated` revalidation row per referencing entity (`emit_media_changed`) in the same transaction. Pending
  uploads live in `MediaUpload` until completed; migration `content.0005`. Needs Pillow.
- CMS (BE-08, `adminapi/cms_service.py`, `editorial_service.py`, `views_cms.py`): S01 `GET /admin/cms/sections`, S02 `GET
  .../sections/{key}`, S03 `PUT .../{key}/draft` (`{version, content, summary?}`; `version` is the draft counter, 0 = no
  draft yet; stale -> `VERSION_CONFLICT` with `reason` naming the other editor), S04 `POST .../{key}/publish` (Idempotency-Key
  required; re-validates, writes the live `SiteSection`, a `ContentVersion` history row, audit and the `site/{key}`
  revalidation row in one transaction; `NOT_PUBLISHABLE` blockers `NO_DRAFT`, `NO_CHANGES`, `INVALID_CONTENT`), S05 `GET
  .../{key}/versions`. Section `status`: `clean` (nothing saved or published), `draft` (working copy differs from live),
  `published`. S06 `GET|PUT /admin/legal/{page}` and `POST .../publish` use the same draft/publish/history mechanism
  (`ContentDraft`, `ContentVersion`; the live row stays `LegalPage`; first publish emits `legal/published`, later ones
  `updated`). S13 `GET|POST /admin/stories`, `GET|PATCH /admin/stories/{id}` (closed block body; image blocks may send
  `assetId`; slug lock after first publish -> `SLUG_LOCKED`; `SLUG_TAKEN`), S14 `POST .../publish` (Idempotency-Key required;
  blockers for title, eyebrow, dek, body) and `.../unpublish`. S15 `GET|POST /admin/testimonials`, `GET|PATCH
  /admin/testimonials/{id}` (quote stored exactly as sent; created as a draft), S16 `POST .../publish` (quote + portrait +
  `consentAt` required, else `NOT_PUBLISHABLE` with `blockers[]` and `fields`) and `.../unpublish`; a published testimonial
  cannot lose its quote, portrait or consent. Stories and testimonials have no separate draft copy: edits to a published
  row are live and revalidate. No step-up is required on these endpoints. Migration `content.0006`.
  - `STORAGE_MODE`: `supabase` or `fake`. Default `fake` when `DEBUG`, `supabase` otherwise; `fake` with `DEBUG` off stops
    startup. `supabase` needs `SUPABASE_URL` (https) and `SUPABASE_SECRET_KEY` (backend only, never returned or logged);
    `SUPABASE_MEDIA_BUCKET` defaults to `pg-media`. The bucket is public for reads; writes happen only through the signed
    upload URLs and backend calls. `fake` stores files under `backend/.fake_storage/` (git-ignored) and serves the upload and
    public read at `/api/dev-storage/upload/<token>` and `/api/dev-storage/public/media/<key>` (mounted in fake mode only).
  - Manual check in fake mode: `POST uploads` -> `PUT` the bytes to `uploadUrl` with the returned headers -> `POST .../complete`.
- Preview (BE-09, `content/preview.py`, `adminapi/preview_service.py`, `views_preview.py`): PV01 `POST /admin/preview-link`
  (`{kind: event|story|site, id}`; site takes a section key or legal page) returns a relative `url`
  `/api/draft?token=...` and `expiresAt`; the token is single use, 5 minutes, stored as a SHA-256 in `PreviewGrant`
  (migration `content.0007`), and the call is audited (`preview.link`). `POST /api/preview/exchange` (public route, server
  to server): `Authorization: Bearer <PREVIEW_SECRET>` compared in constant time, body `{token}`; atomically consumes the
  token and returns `{path, previewKey, expiresAt}`. `path` must match an allow-list of relative paths (`/`, `/community`,
  `/privacy`, `/terms`, `/refund-policy`, `/events/{slug}`, `/stories/{slug}`). 401 on a bad or missing bearer, 400
  `VALIDATION_FAILED` on an invalid, used or expired token, 30 calls/min/IP. `X-Preview-Key` on `GET /site/{section}`,
  `/events/{slug}`, `/stories/{slug}`, `/legal/{page}` returns the draft (event or story in any status; site section and legal
  page from `ContentDraft`, falling back to the live row) only when the key names that exact item, with `Cache-Control:
  private, no-store` and `X-Robots-Tag: noindex`. An invalid, expired or out-of-scope key is ignored (normal published
  response), so anonymous reads never see drafts. `PREVIEW_SECRET` (env, `.env.example` has a placeholder): unset, or a
  placeholder/under 32 characters when `DEBUG` is off, disables the exchange (always 401).
- Players, payments, settings (BE-10, `adminapi/players_service.py`, `ledger_service.py`, `settings_service.py`,
  `views_ops.py`, `payments/reconcile.py`; migrations `content.0008`, `payments.0002`): G01 `GET /admin/players?q=` (name,
  email or phone; `eventsAttended` = confirmed and checked in), G02 `GET /admin/players/{id}` (history up to 100, ratings,
  `canChangeRole`; every private field is visible because there is one admin role; `version` = 1 + role changes).
  G03 `PUT /admin/players/{id}/role` `{role}`: `Idempotency-Key` required, step-up, audited `player.role_change`;
  rejects your own account, the last active admin (rows locked, so two demotions cannot race) and promoting a suspended
  account (all `VALIDATION_FAILED` with `fields.role`); the existing session-family role check ends the target's sessions.
  G04 `GET /admin/payments` (`status`, `eventId`, `mismatch`, `from`, `to` as UTC dates, same row as C13 plus event
  fields). G05 `POST /admin/payments/{id}/refund` `{amountPaise?, reason}`: `Idempotency-Key` required, step-up, `{id}` is
  the payment id; in one transaction `payments.services.refund_payment(execute=False)` writes the pending refund and the
  registration `refund_state=pending` plus the audit row (`payment.refund`, reason only in audit), then `execute_refund`
  runs after the commit. Payment, order and registration move together in `finish_refund` when the provider (response or
  webhook) confirms; a provider outage leaves it pending for the retry job. Response `refundState` is `refunded` only when
  that refund is processed. Flagged payments cannot be refunded (reconcile first). G06 `POST /admin/payments/reconcile`
  `{eventId?}`: fetches up to 100 payments (least recently checked first, `Payment.reconciled_at`) from the provider and
  records an open `PaymentMismatch` (source `reconcile`) for order, amount, currency, status/refunded or
  missing-at-provider differences; it never changes payments or registrations and never duplicates an open mismatch.
  Returns `{checked, mismatches, newMismatches, ranAt}`. `missing_at_pg` is not detected (needs a provider list call).
  G07 `GET` / G08 `PATCH /admin/settings`: server allow-list `FIELDS` (unknown or credential-like keys are rejected),
  `version` checked (`VERSION_CONFLICT`), audited `settings.update`; brand contact fields live in `PublicSettings` (public
  P12 stays the single source), the rest as overrides in `AdminSettings` (`admin_settings`, singleton). `integrations` are
  booleans from server configuration only. Stored values are not yet read by the code that enforces them (hold minutes,
  provisional games, signup, reminders); wiring each is a follow-up.
- Step-up: call `adminapi.permissions.require_step_up(request)` before refund, role change and export mutations. It reads
  the single-use grant from the `X-Step-Up-Token` header and reuses `accounts.services.consume_step_up` (`STEP_UP_REQUIRED`).
- Audit: `audit.write(request, action=, object_type=, object_id=, before=, after=, reason=)` inside the mutation's
  `transaction.atomic()` block. It raises outside a transaction and never swallows errors, so a failed audit write rolls the
  mutation back. `AuditLog` (`audit_log`) is append-only in code (update/delete raise); revoke UPDATE/DELETE from the app DB role
  in production. IP is stored coarse (IPv4 /24, IPv6 /48); secret-like keys in before/after are redacted.
- `Procfile`: `scheduler` runs `run_scheduler`, `worker` runs `run_worker` (both loops live in `core/jobs.py:run_loop`;
  `--once` runs each job once, `--job NAME` runs only that job once). Every job is idempotent (a second run changes
  nothing), row-locked or unique-constraint-guarded, logs the job name and counts only, and is also a management command:

  | Process | Command | Interval | What it does |
  |---|---|---|---|
  | scheduler | `expire_holds_and_offers` | 60 s | release expired holds/offers, promote the waitlist |
  | scheduler | `dispatch_revalidation` | 30 s | revalidation outbox retry |
  | scheduler | `transition_event_status` | 60 s | `published -> registration_open` at `registration_opens_at`; `published/registration_open/sold_out -> ongoing` at `starts_at` (GET never writes status; `completed`/`cancelled` stay admin actions) |
  | scheduler | `send_event_reminders` | 5 min | queues `reminder_24h` (`notifications.reminderHoursBefore` before start), `checkin_open`, `post_event` (checked-in players, within 3 days of the end) mail; honours `comms.conf.trigger_enabled`; dedupe `(template, registration)` |
  | scheduler | `retry_refunds` | 2 min | sends pending refunds the provider has not accepted (`sent_to_provider=False`); `execute_refund` re-reads under `FOR UPDATE` and the refund id is the provider reference; a refund on a non-captured payment or over the amount paid is failed, never sent |
  | scheduler | `reconcile_payments` | 1 h | `payments.reconcile` batch (flags mismatches, never changes money state) |
  | scheduler | `cleanup_expired` | 24 h | expired auth families, reset tokens, step-up grants (1 day after expiry), idempotency records (48 h), rate-limit hits (2 h), preview grants (1 h after expiry), expired pending `MediaUpload` rows and their stored objects (via `content.storage`; a failed delete keeps the row for the next run) |
  | worker | `deliver_messages` | 30 s | `comms.delivery.run_all` (event messages, transactional mail, contact) |
  | worker | `process_ratings` | 60 s | backstop: rates completed rounds whose `ratings_processed_at` is empty (finalise normally rates in its own transaction; `process_round` is idempotent by `RatingRun`) |

  Local manual run without sending real email: `EMAIL_ADAPTER=fake` (DEBUG only) then
  `python manage.py <command>`; `run_scheduler --once` / `run_worker --once` run the whole set.

## Communications (`comms/`, contract 3.6 C14/C15, 5.5, P11)

Everything is stored before it is delivered; a worker function sends it.
- Adapter (`comms/adapters.py`): `send(OutgoingEmail) -> provider id` or `EmailSendError(code, permanent)`. `EMAIL_ADAPTER`:
  `django` (default; SendGrid via anymail from `SENDGRID_API_KEY`, console backend when `DEBUG`), `fake` (in-memory, DEBUG
  only) or a dotted path to an `EmailAdapter` subclass. The sender name comes from admin setting `notifications.senderName`;
  the address is always `DEFAULT_FROM_EMAIL`. Header values never carry CR/LF.
- Template store (`comms/templates.py`): built-in plain-text defaults for `registration_confirmation`, `waitlist_offer`,
  `password_reset`, `contact_notification`, `event_message`, `event_reminder`, `checkin_open`, `post_event`, `pairing_published`; an `EmailTemplate` row (Django shell or DB) overrides a key.
  `{{variable}}` placeholders are filled in a single pass, so authored text is never re-expanded.
- C14 `GET/POST /admin/events/{id}/messages`, `GET .../messages/{messageId}`: POST needs `Idempotency-Key`, stores an
  `EventMessage` (audience, plain-text subject/body) and answers 202 with the audience size. The worker resolves recipients
  into one `MessageDelivery` per registration (`queued -> sent | failed`), retries with backoff (60 s, 5 min, 15 min, 1 h; 5
  attempts; a rejected address fails at once). Message status is derived from the recipients (`queued`, `sending`,
  `delivered`, `partial_failure`, `failed`). Audiences: `confirmed`, `waitlist` (waiting or offered), `checked_in`,
  `first_timers`. 20 sends/hour/admin. The audit row has ids and counts, not the body. Addresses are never returned or logged.
- C15 `GET/PATCH /admin/events/{id}/communications`: the five triggers stored in `Event.communications`. `confirmation` is
  enforced at registration; the scheduler (`send_event_reminders`) enforces `reminder_24h`, `checkin_open` and `post_event`
  through `comms.conf.trigger_enabled` and uses `comms.conf.reminder_hours_before()` for the lead time.
  `pairing_published` is sent by the round endpoints, not by a scheduler job: publishing a round (C09) queues one mail per
  seated player (board or bye), and a correction to a published or live round (C08) queues one mail per player whose
  seat changed (board, colour, opponent, bye, or removed). Draft edits send nothing. Queued inside the same transaction as
  the change (rollback drops them), deduplicated by round, pairing version and registration, and honours the C15
  `pairing_published` toggle and the email switch.
- Transactional mail (`comms/transactional.py`): registration confirmation (free reserve, accepted free offer, captured
  payment) and waitlist offer (automatic or admin promotion) are queued as `TransactionalEmail` rows inside the causing
  transaction (deduplicated), tried once after commit, retried by the worker. Password reset is sent directly through the
  adapter on a background thread (its link is a secret, so it is never stored).
- P11 contact: stored first (`ContactMessage.delivery_state`), one attempt after commit, then the worker. Destination:
  admin `notifications.contactDestinationEmail`, else `CONTACT_DESTINATION_EMAIL`, else the public support email.
- Worker entry point: `comms.delivery.run_all(limit)` or `python manage.py deliver_messages [--limit N]` (claims rows with
  `SKIP LOCKED` and leases them; logs counts only). `run_worker` runs it every 30 s.
- Admin settings now enforced (fallback to env/defaults when unset): `payments.holdMinutes` (`registrations.conf`),
  `ratings.provisionalGames` (rating DTOs), `auth.signupOpen` (register answers 403 `SIGNUP_CLOSED`),
  `notifications.emailEnabled/senderName/contactDestinationEmail`. Reads live in `content/runtime_settings.py`. Not wired:
  `auth.googleSignInEnabled`, `auth.adminSessionHours`, `payments.defaultRefundWindowHours`, `ratings.ratingsEnabled`,
  `ratings.showRatingsByDefault`, `eventDefaults.*`, and (`notifications.reminderHoursBefore` is now read by `send_event_reminders`).
- Changing a public brand contact field via G08 writes `site/updated` revalidation rows for `footer` and `meta`.

## Payments (`payments/`, contract 3.3 R04/R05, 5.1 W01)

Endpoints: `POST /api/payments/orders` (R04), `POST /api/payments/verify` (R05), `POST /api/webhooks/razorpay` (W01,
plain JSON outside the envelope, auth and user rate limit). The browser sends only the registration id and Razorpay's
callback fields; amount, currency and key id come from the server. Provider calls and signature maths live only in
`payments/razorpay_client.py` (`requests`, 3.05 s connect / 10 s read timeouts, no bodies or secrets in logs).

| Env var | Meaning |
|---|---|
| `RAZORPAY_MODE` | `live` or `fake`. Default `fake` when `DEBUG`, `live` otherwise. `fake` with `DEBUG` off stops startup. |
| `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET` | API credentials. `KEY_ID` is returned to the browser, the secret never. |
| `RAZORPAY_WEBHOOK_SECRET` | Secret configured on the Razorpay webhook (HMAC of the raw body). |
| `RAZORPAY_API_BASE` | Default `https://api.razorpay.com/v1`. |

`live` needs all three secrets at startup. `fake` falls back to obvious placeholders (`rzp_test_PLACEHOLDER`, ...) when they
are empty. No real keys exist yet; `.env.example` holds placeholders only.

State: `payment_orders` (one per registration), `payments` (ledger), `payment_refunds`, `payment_webhook_events`
(unique provider event id), `payment_mismatches` (amount/currency/order disagreement, for admins G04/G06). States only
move forward. `Registration.payment_order_state` and `refund_state` mirror them for the DTOs. A payment captured after
the hold lapsed with no seat left is refunded automatically (registration shows refund `pending`, then `refunded`).
`payment_fake_provider_records` is used by fake mode only.

For other code: `payments.services.refund_payment(payment, amount_paise=None, *, reason, execute=True)` records a pending
refund and asks the provider (pass `execute=False` inside your own transaction and call `execute_refund(refund)` after
commit). Completion (processed/failed) moves refund, payment, order and registration together, from the provider reply
or the webhook (`finish_refund`, idempotent).

### Fake mode: manual test flow (DEBUG only, no network)

1. `python manage.py migrate`, run the server, log in as a player, reserve a paid event (R02).
2. `POST /api/payments/orders {"registrationId": "..."}` returns `orderId` (e.g. `order_Fake...`).
3. `python manage.py razorpay_fake_pay <orderId>` prints `razorpay_order_id`, `razorpay_payment_id` and a valid
   `razorpay_signature`. Options: `--status authorized|failed`, `--amount-paise N`, `--currency XXX` (to exercise
   `PAYMENT_MISMATCH`), `--webhook` (also prints a signed webhook body, `X-Razorpay-Event-Id` and `X-Razorpay-Signature`).
4. `POST /api/payments/verify` with those three fields: the registration becomes `confirmed`.
5. Optional: POST the printed body to `/api/webhooks/razorpay` with the two headers. A replay answers 200 with no effect;
   a wrong signature answers 400.

Live mode needs the webhook configured in the Razorpay dashboard (URL `https://<api host>/api/webhooks/razorpay`, events
`payment.captured`, `payment.failed`, `order.paid`, `refund.processed`, `refund.failed`).
