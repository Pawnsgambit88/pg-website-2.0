# ISR, revalidation and preview: contract for the backend

**ID:** ARCH-001-isr-revalidation (extraction of ARCH-001-web-frontend sections 7, 8.4, 9 and ARCH-001-backend-contract 3.10, 5.6; not a separate architecture artifact, so `schemas/architecture.schema.yaml` is not applied, same convention as OPS-001)
**Type:** architecture-extract
**Feature:** FEAT-001 | **Plan task:** PLAN-001 TASK-113 | **Version:** 1 | **Status:** draft (pending review by the security reviewer under TASK-006 follow-up, and by the backend plan owner)
**Date:** 2026-10-22 | **Author:** architect
**Audience:** the backend engineer who implements the revalidation outbox/dispatcher and the preview exchange; the frontend engineer for TASK-114/111/112/116.

## Canonical sources and how to read this file

This file consolidates what the backend must do. Rationale stays in the canonical documents; follow the links rather than copying prose.

| Topic | Canonical source (rationale lives there) |
|---|---|
| Rendering matrix, caching model | ARCH-001-web-frontend 7.1, 7.3, 7.4, 7.6 |
| Draft preview flow | ARCH-001-web-frontend 8.4 (DEC-028) |
| Revalidation endpoint, replay, tags, mapping, freshness | ARCH-001-web-frontend 9.1 to 9.7 |
| Backend obligations | ARCH-001-backend-contract 3.10, 5.6 |
| Security findings | SEC-001 annex B F-06, F-07, F-08 |
| Firewall and secret rotation runbooks | OPS-001 sections 4, 6.3, 7.3, 7.4 |

Where this file and a canonical source disagree, the canonical source wins until the discrepancy is resolved; every disagreement found is listed in section 12, not resolved silently. Items marked **PROPOSAL** are the architect's recommendation, not yet in a canonical document. Nothing here was tested against a live Vercel or Railway project.

Keywords MUST, SHOULD, MAY follow RFC 2119.

## 1. Summary in ten lines

1. Public pages are prerendered (static/ISR). They are refreshed only by (a) the signed webhook below and (b) a 900 s safety-net `revalidate`.
2. The backend calls `POST {SITE}/api/revalidate` directly (Railway to Vercel), never through the `/api/*` rewrite.
3. The call is signed: `X-PG-Signature: v1=<hex64>` = HMAC-SHA256 over `timestamp "." eventId "." rawBody`, key `REVALIDATE_SECRET`.
4. Headers: `X-PG-Timestamp` (Unix seconds), `X-PG-Event-Id` (UUID, stable across retries), `X-PG-Signature`. Body JSON at most 16 KB.
5. Success is `202 {"ok":true}`. A duplicate event id is also `202`. Everything else is an uninformative failure.
6. Replay window: 300 s into the past, 60 s into the future.
7. The backend writes an outbox row in the same transaction as the content change and retries delivery (same event id, fresh timestamp and signature) up to 5 attempts.
8. Target: publish to visible at most 60 s; a missed call heals within 15 minutes.
9. Volatile data (places left, registration state) is never baked into HTML; a client island reads `GET /api/events/{slug}/availability` (`no-store`).
10. Draft preview uses a server-to-server `POST /api/preview/exchange` authenticated by `PREVIEW_SECRET`.

## 2. Rendering matrix and tags per route

Modes come from ARCH-001-web-frontend 7.1. The tag column is **derived** from sections 9.3 and 9.4 (ARCH-001 has no per-route tag table; confirm in TASK-111). Every `(public)` page also carries `site:nav`, `site:footer` and `site:meta` because the shared layout fetches them.

| Route | Mode | Tags carried (derived) | Safety net |
|---|---|---|---|
| `/` | Static, ISR | `events`, `site:home`, `testimonials`, `stories` (featured story), plus layout tags | `revalidate = 900` |
| `/play` | Static, ISR | `events`, layout tags | 900 |
| `/past-events` | Static, ISR | `past-events`, layout tags | 900 |
| `/community` | Static, ISR | `site:community`, layout tags | 900 |
| `/stories` | Static, ISR | `stories`, layout tags | 900 |
| `/contact` | Static, ISR (form is a client island) | layout tags | 900 |
| `/privacy`, `/terms`, `/refund-policy` | Static, ISR | `legal:{page}`, layout tags | 900 |
| `/events/[slug]` | ISR; `generateStaticParams` = upcoming plus latest 50 completed; `dynamicParams = true` | `event:{slug}`, `events`, `past-events` (completed mode), layout tags | 900 |
| `/stories/[slug]` | ISR; params = all published stories, capped 100; `dynamicParams = true` | `story:{slug}`, `stories`, layout tags | 900 |
| `/sitemap.xml`, `opengraph-image` | Static with ISR | `sitemap` (and entity tags for OG) | 900 |
| `/api/revalidate`, `/api/draft`, `/api/draft/exit` | Route handlers, Node runtime, never cached | n/a | n/a |
| `(auth)`, `(app)`, `(admin)`, `(handoff)` | Dynamic shells, client data, `noindex` | none | none |

Unknown, draft or unpublished slugs return a real HTTP 404 (rule 3 of ARCH-001-web-frontend 7.3). A cached 404 for a not-yet-published slug carries the same tag, so publishing expires it.

## 3. Request contract: `POST {SITE}/api/revalidate`

`{SITE}` is the per-environment web origin (the Vercel production or staging domain; never a preview). The route is a Next Node route handler and wins over the `/api/*` rewrite (ARCH-001-web-frontend 9.1, 12.7). Do not send this call through the Railway-facing rewrite or any proxy that rewrites the body.

### 3.1 Headers

| Header | Value | Rules |
|---|---|---|
| `Content-Type` | `application/json` | Body at most 16 KB, else `413`. |
| `X-PG-Timestamp` | Unix seconds (integer string) at which this attempt was signed | Fresh on every attempt, including retries. |
| `X-PG-Event-Id` | UUID | Created once per outbox row; **identical on every retry**. |
| `X-PG-Signature` | `v1=` + lowercase hex of the HMAC (64 hex chars) | Must match `^v1=[0-9a-f]{64}$`. |

Staging only, if the staging domain is behind Deployment Protection: one extra static bypass header (`x-vercel-protection-bypass`, OPS-001 DP-13). It is **not** part of the signed material and the handler ignores it. This is a PROPOSAL; contract 3.10 does not mention it (see section 12, D-8).

### 3.2 Body

Serialise once, sign those exact bytes, send those exact bytes (no re-serialisation between signing and sending).

```json
{
  "type": "event | story | testimonial | site | media | legal | player | result",
  "action": "published | updated | unpublished | deleted | cancelled | completed | privacy_updated | emergency_purge",
  "id": "entity UUID, or section key for site and legal",
  "slug": "required for event and story; ^[a-z0-9]+(?:-[a-z0-9]+)*$, max 100 chars",
  "occurredAt": "ISO 8601 with offset",
  "version": 12
}
```

- `id`: entity UUID, except `site` (`home | community | nav | footer | meta`) and `legal` (`privacy | terms | refund-policy`).
- `version`: the entity's monotonic BIGINT counter (OD-06), incremented on every change, not only publish.
- Valid (type, action) pairs: `cancelled` and `completed` are event-only. `privacy_updated` and `emergency_purge` are valid for `player` only; `player` also accepts `deleted`; `result` accepts `deleted` (section 6). The web zod schema is `.strict()`: unknown fields are rejected with 400. The final enum is fixed by the TASK-022 export (see D-2, D-3).
- The backend MUST NOT put personal data in the body (no names, emails, player ids beyond the opaque uuid). The web handler never fetches or writes based on body content beyond expiring tags.

### 3.3 Responses

| Status | Meaning | Backend action |
|---|---|---|
| 202 `{"ok":true}` | Accepted, or duplicate event id (idempotent success) | Mark the outbox row delivered. |
| 401 `{"ok":false}` | Bad or missing headers, bad signature, timestamp outside window, or secret missing on the web side | Retry (a 401 after a secret rotation or clock drift is transient). Alert at exhaustion. |
| 400 `{"ok":false}` | Authenticated but body failed the schema (including the slug regex) | **Do not retry the same payload.** Mark failed, alert (a defect on one side). |
| 413 `{"ok":false}` | Body above 16 KB | Same as 400. Never expected. |
| 429 | Vercel Firewall rate limit (OPS-001 FW-01) | Retry with backoff. |
| 5xx / timeout | Web side fault | Retry with backoff. |

Failure bodies never say why. Note ARCH-001-web-frontend 9.1 lists 401 for "missing secret" while the FM-05 row in section 21 says 503: see section 12, D-4.

## 4. Signing, step by step

Signing string = `timestamp` + `"."` + `eventId` + `"."` + `rawBody`, all UTF-8, no trailing newline. Key = the `REVALIDATE_SECRET` value as UTF-8 bytes (not hex-decoded, not base64-decoded; it is at least 32 random bytes of entropy, generated per OPS-001 SEC-12 and held in Railway and Vercel only).

1. Build the body JSON and fix its bytes.
2. Read the current Unix time in seconds: `timestamp`.
3. Concatenate `timestamp`, `.`, `eventId`, `.`, `rawBody`.
4. Compute HMAC-SHA256 with the secret as key; take the 32-byte digest.
5. Encode as lowercase hex (64 chars) and prefix `v1=`.
6. Send headers and the same body bytes.

### 4.1 Worked example (fake key; values were computed, not invented)

**The key below is a fake documentation value. Never use it anywhere real.**

| Item | Value |
|---|---|
| key | `FAKE-EXAMPLE-KEY-DO-NOT-USE-0123456789` |
| timestamp | `1792674000` |
| eventId | `3f8e2a9c-5b1d-4c7e-9a40-2d6f1b8e7c35` |
| rawBody (162 bytes, one line, no spaces) | `{"type":"event","action":"published","id":"b6a1f0e2-7c3d-4e58-8f21-9d0c4a5b6e71","slug":"sunday-rapid-open","occurredAt":"2026-10-22T18:30:00+05:30","version":12}` |
| signing string (210 bytes) | `1792674000.3f8e2a9c-5b1d-4c7e-9a40-2d6f1b8e7c35.` immediately followed by the rawBody above |
| `X-PG-Signature` | `v1=b1277c92a9c76c4366140b0fa645f9db06e66d47d29d0e244fe021aa099233d4` |

Cross-check with the command line (the signing string is written without a trailing newline):

```sh
printf '%s.%s.%s' "$TS" "$EID" "$BODY" | openssl dgst -sha256 -hmac "$KEY"
```

Request as sent:

```http
POST /api/revalidate HTTP/1.1
Host: {SITE host}
Content-Type: application/json
X-PG-Timestamp: 1792674000
X-PG-Event-Id: 3f8e2a9c-5b1d-4c7e-9a40-2d6f1b8e7c35
X-PG-Signature: v1=b1277c92a9c76c4366140b0fa645f9db06e66d47d29d0e244fe021aa099233d4

{"type":"event","action":"published", ...as above...}
```

Response: `HTTP/1.1 202` with body `{"ok":true}`.

**Rejection examples (all with the same key):** changing one byte of the body, using a different event id header than the one signed, or signing `timestamp.rawBody` (without the event id) each produce `401`. A timestamp of `now - 301 s` or `now + 61 s` produces `401` even with a correct signature. The shared vector table for automated tests ships with the TASK-022 contract export (ARCH-001-web-frontend 9.7); this single vector is only an illustration and the TASK-022 table is the authority.

## 5. Replay window, duplicates and secret rotation (web-side behaviour the backend relies on)

Rationale: ARCH-001-web-frontend 9.2, F-07, OD-06. What the sender can depend on:

- **Window:** accepted if `now - 300 s <= timestamp <= now + 60 s`. Keep the dispatcher clock synced (NTP); the Railway clock is the signing clock.
- **Format check first:** the signature must match `^v1=[0-9a-f]{64}$`; only then is the equal-length digest comparison made (constant time). Malformed or short signatures are `401`, never `500`.
- **Duplicate event id:** recorded only after signature, window and schema all pass. A second delivery of the same id within about 10 minutes returns `202` and does nothing. The store is a bounded in-process map per Vercel instance (best effort, not global); idempotent expiry makes this safe. The sender MUST NOT rely on exactly-once effects and MUST reuse the event id on retry.
- **Two active secrets:** the verifier accepts `REVALIDATE_SECRET` and, during a rotation, `REVALIDATE_SECRET_PREVIOUS`. The sender signs with exactly one secret. Order (OPS-001 7.3, RT-01 to RT-06): web accepts both, then the backend switches, then the old value is removed after at least an hour (OPS-001 PROPOSAL values). The backend must let operators change its signing secret by configuration and restart.
- **Body cap:** a streaming cap at 16 KB is enforced before buffering.
- **Rate limit:** the Vercel Firewall may return `429` above about 120 requests per minute per IP (OPS-001 FW-01, PROPOSAL). A media change that fans out to many entities should be paced.

## 6. (type, action) to tags

Source: ARCH-001-web-frontend 9.4 (exhaustive unit-test table in TASK-114). Expiry call: `revalidateTag(tag, { expire: 0 })` per tag, so nothing stale is served after a publish and the first visitor pays one regeneration. No `revalidatePath` is used.

| type, action | Tags expired | Visible effect |
|---|---|---|
| event, published / updated | `event:{slug}`, `events`, `past-events`, `site:home`, `sitemap` | Page, lists, Home, sitemap refresh. Registration state flips (open, closed, sold out) are `updated`. |
| event, unpublished / deleted | same | Slug returns 404 on the next request. |
| event, cancelled | same | Page stays with a cancelled notice; leaves Play. |
| event, completed | same | Page switches to archive mode; appears in Past events. |
| story, any | `story:{slug}`, `stories`, `site:home`, `sitemap` | |
| testimonial, any | `testimonials`, `site:home` | |
| site, any | `site:{id}` (home, community, nav, footer, meta) | `nav` and `footer` refresh every page. |
| legal, any | `legal:{id}`, `sitemap` | |
| media, any | `events`, `stories`, `testimonials`, `site:home`, `site:community`, `site:nav`, `site:footer` | Coarse fallback. The backend SHOULD send one call per referencing entity instead. |
| player (`deleted`, `privacy_updated`, `emergency_purge`), result (`deleted`) | **Not in ARCH-001-web-frontend 9.4.** Contract 5.6 says purge `event:*`, `past-events`, standings | See D-2 and the proposal below. |

**PROPOSAL (for TASK-127, owner decision D-2):** tags cannot be wildcarded and no `player:{id}` tag exists. A `player` or `result` call would expire `events`, `past-events`, `site:home`, `stories`, `testimonials`, `sitemap`, and the backend would also send one `event` / `updated` call (with slug) for each event where the person or result appears, so every `event:{slug}` is expired. Image purge is separate: the `next/image` optimiser cache and the Storage object are handled by the purge runbook (ARCH-001-web-frontend 13.3, F-15: versioned object keys or reduced `minimumCacheTTL`). Contract 5.6 describes `emergency_purge` with a list of player ids, which does not fit the single `id` of the strict body; the backend should send one call per id. Until TASK-127 closes this, the web handler is expected to answer `400` for these types.

## 7. Flows (sequence diagrams as text)

### 7.1 Publish an event (happy path)

```
Admin browser   Railway API          Postgres     Dispatcher     Vercel /api/revalidate      Visitor
  |-- POST /admin/events/{id}/publish (Idempotency-Key) -->|
  |               | BEGIN; validate  |            |              |                          |
  |               | UPDATE event, version = version + 1        |              |            |
  |               | INSERT outbox row (same transaction)       |              |            |
  |               | COMMIT           |            |              |                          |
  |<-- 200 -------|-- on-commit kick ------------>|              |                          |
  |               |                  |<-- SELECT due row ---------|                         |
  |               |                  |            | sign(ts.id.body)                        |
  |               |                  |            |-- POST /api/revalidate ---------------->|
  |               |                  |            |   verify, validate, expire tags         |
  |               |                  |            |<-- 202 {"ok":true} ---------------------|
  |               |                  |<-- mark delivered ---------|                         |
  |               |                  |            |              |<-- first GET /events/slug-|
  |               |                  |            |              | regenerates from Railway  |
```

Expected publish to visible: seconds. Ceiling: 60 s.

### 7.2 Unpublish, cancel, complete

Same sequence with `action` = `unpublished`, `cancelled` or `completed`. Outcomes: unpublished gives 404 on the next request; cancelled leaves the page live with a notice and removes it from Play; completed switches to archive mode and lists it in Past events. The slug never changes after first publish (`SLUG_LOCKED`, contract 2.7), so URLs are stable through all of these.

### 7.3 Scheduler-driven transition (no admin action)

```
Railway scheduler (every minute): open/close registration, sold_out, ongoing, completed
  one transaction: UPDATE event, version + 1, INSERT outbox (type=event, action=updated | completed)
  dispatcher -> signed POST -> 202
```

Only transitions that change public state emit a call (contract 5.2). Hold expiry emits only if the public state flips.

### 7.4 Media replaced or archived

```
Admin replaces or archives a published asset
  -> backend finds referencing entities (events, stories, testimonials, site sections)
  -> one outbox row per referencing entity (that entity type, action=updated, slug, version)
  -> fallback only if the set cannot be computed: one type=media call (coarse mapping)
```

### 7.5 Failed delivery

```
Dispatcher -> POST -> timeout / 5xx / 429 / 401
  attempt n: backoff, re-sign with a fresh timestamp, SAME event id -> POST
  attempt 5 fails -> row marked failed, alert (contract 6.7, OPS-001 LOG-A3)
  web side self-heals within 15 minutes (revalidate = 900)
```

## 8. Outbox and retry expectations for the backend

Source: contract 3.10 and 5.6 (not repeated beyond what a tester needs).

| Item | Expectation |
|---|---|
| Table | `revalidation_outbox`: event id (UUID), type, action, entity id, slug, entity version, created timestamp, attempts, next attempt time, delivered/failed state. |
| Write | Same database transaction as the content change. If the outbox insert fails, the mutation fails. Rows are written after the change is made, within the commit. |
| Dispatch | API kicks on commit; the scheduler re-sends undelivered rows about every 30 s as backstop (contract 5.2). |
| Retry | Up to 5 attempts, exponential backoff (exact delays not fixed in the sources; PROPOSAL: about 2 s, 5 s, 15 s, 45 s, so the full ladder finishes inside the 60 s target only for early attempts). Same event id, fresh timestamp and signature each attempt. |
| Success | Only `202` counts as delivered. |
| Non-retryable | `400` and `413`: stop and alert (same payload would fail again). |
| Ordering | Per entity, calls should be sent in `version` order. Because the web side only expires tags, an out-of-order or stale call is harmless; the `version` field lets the backend skip an older queued row when a newer one for the same entity is already delivered. |
| Exhaustion | Alert (OPS-001 LOG-A3). The web safety net heals within 15 minutes, but the 60 s target is lost. |
| Timeout | PROPOSAL: 5 s per attempt (not in the sources). |

## 9. Freshness, safety net and volatile data

- **Publish to visible:** at most 60 s with the real backend (OQ-11), 5 s in mock mode (AC-16).
- **Safety net:** every public page and fetch uses `revalidate = 900`; a missed webhook heals in at most 15 minutes (AC-17). `check:build-output` fails if a `(public)` route lacks a finite `revalidate`.
- **Failed regeneration at runtime:** the previous good page keeps being served (AC-18). A failed prerender at build fails the build; `generateStaticParams` swallows transport errors and returns `[]` (ARCH-001-web-frontend 7.6).
- **Volatile data is not in HTML:** places left, registration open/closed and waitlist state come from `GET /api/events/{slug}/availability`, which the backend MUST answer with `Cache-Control: no-store` and a small payload `{ state, placesLeft, serverNow }`. The cached HTML shows a neutral "checking" state in reserved space; the island refreshes every 30 s while visible. JSON-LD `Offers.availability` and the CTA label use the last-known state and are corrected when the backend emits an `event` / `updated` call on sold out, closed or completed.
- **Backend consequence:** because availability is live, the backend must still emit `event` / `updated` on every public state flip (open, closed, full, completed) so the prerendered label does not stay wrong for up to 15 minutes.

## 10. Draft preview exchange (DEC-028)

Canonical: ARCH-001-web-frontend 8.4; backend side: contract PV01 (3.7) and 3.10. Drafts never appear on public endpoints; preview is a read-only capability scoped to one entity.

### 10.1 Sequence

```
Admin browser        Railway API                 Vercel /api/draft (Node)
  |-- POST /admin/preview-link {kind,id} (bearer admin) -->|
  |<-- 200 { url: "{SITE}/api/draft?token=<opaque>" } ------|   token: single use, 5 min
  |-- GET {SITE}/api/draft?token=... ---------------------------->|
  |                      |<-- POST {API_INTERNAL_URL}/api/preview/exchange
  |                      |    Authorization: Bearer <PREVIEW_SECRET>
  |                      |    body {"token":"<opaque>"}  -------------|
  |                      |--- 200 {"path":"/events/my-event","previewKey":"<opaque>"} -->|
  |<-- 302 to path (taken from the backend response only)
  |    Set-Cookie: __prerender_bypass, pg_preview=<previewKey>
  |-- GET /events/my-event (cookies) --> fetchers use no-store + X-Preview-Key
```

### 10.2 POST /api/preview/exchange (backend endpoint, server-to-server only)

| Item | Requirement |
|---|---|
| Path | `/api/preview/exchange` on the Railway API (settled; matches the rewrite model). Called by the Vercel function at `API_INTERNAL_URL`, not by browsers; the Firewall denies it on the public site (OPS-001 FW-11). |
| Auth | `Authorization: Bearer <PREVIEW_SECRET>`, compared in constant time. Mismatch: `401`. |
| Request | `{ "token": "<opaque>" }` |
| Token | Consumed on first exchange (single use). Expired, used or unknown: reject (status not fixed in the sources; PROPOSAL `401`, generic body, nothing about why). |
| Response | `{ "path": "/events/my-event", "previewKey": "<opaque>" }` in the normal envelope. `path` is relative, starts with `/`, and is on an allow-list (PROPOSAL: `^/(events|stories)/[a-z0-9-]+$` plus fixed site-page paths; see D-6). |
| previewKey | Authorises reading unpublished content of the named entity only, via the `X-Preview-Key` header on read endpoints. Lifetime: see D-5. |
| Draft responses | `Cache-Control: private, no-store` and `X-Robots-Tag: noindex`. |
| Anonymous read | After an exchange, an anonymous `GET /api/events/{slug}` returns the published content or 404 (no cache poisoning). |

### 10.3 Admin preview link (POST /admin/preview-link)

Body `{ kind: event | story | site, id }`; returns `{ url }` of the form `{SITE}/api/draft?token=<opaque>`. Token single use, 5 minutes. The link is a GET that exchanges and redirects immediately (DEC-028 keeps GET over the F-06 POST recommendation). Link unfurlers can consume the token, so the Firewall denies known unfurler user agents on `/api/draft` (OPS-001 FW-04).

## 11. Failure modes

| ID | Failure | Behaviour | Backend duty |
|---|---|---|---|
| R-1 | Web side down or Vercel 5xx | Outbox retries, then alert; safety net heals in 15 min | Do not drop rows; alert on exhaustion |
| R-2 | Signature mismatch (wrong secret, mid-rotation, body altered after signing) | `401`, nothing expires | Sign the exact bytes sent; follow the rotation order |
| R-3 | Clock skew over 300 s back or 60 s ahead | `401` | NTP on the dispatcher host |
| R-4 | Duplicate delivery | `202`, no effect | Reuse the event id on retry |
| R-5 | Invalid payload or slug | `400`, not retried | Validate before enqueue with the same regex; alert |
| R-6 | Burst above the Firewall limit | `429` | Back off; pace fan-out |
| R-7 | Missed call for good | Page stale up to 900 s, then self-heals | Alert on exhausted rows |
| R-8 | Web regeneration fails after a publish | Previous page keeps being served; backend still saw `202` | Keep public reads healthy; watch 5xx on public reads |
| R-9 | Backend down at web build | `generateStaticParams` returns `[]`; prerender failure fails the build; previous deployment keeps serving | Keep public reads up during deploys |
| R-10 | Preview token expired or used | Generic `401`; no draft mode | Single-use semantics, generic error |
| R-11 | Secret missing on web side | Rejected externally (see D-4), alert internally | None; fix configuration |

Note on R-8: `202` means accepted, not regenerated. With `expire: 0` the next visitor triggers regeneration.

## 12. Discrepancies found in the source documents

Reported, not resolved. The last column is what this file assumes until the owner or architect settles it.

| Id | Discrepancy | Assumed here |
|---|---|---|
| D-1 | Contract 8.2 item 1 and 8.3 (g) say ARCH-001-web-frontend 8.4 still writes `{API_INTERNAL_URL}/preview/exchange`; the current text of 8.4 step 2 already reads `/api/preview/exchange`. The contract note is stale. | `/api/preview/exchange` |
| D-2 | Type/action enums differ. Web 9.1 lists types `event, story, testimonial, site, media, legal` and actions `published, updated, unpublished, deleted, cancelled, completed`. Contract 3.10 and 5.6 add `player`, `result` and actions `privacy_updated`, `emergency_purge`; web 9.4 has no mapping for them. PLAN TASK-127 points at contract "section 9.4", which does not exist (the contract ends at section 8). | Section 6 proposal; web answers `400` until TASK-127 |
| D-3 | Contract 3.10 and 5.6 write the type as `site/<section>`; web 9.1 uses `type: site` with `id` = section key. | Web form |
| D-4 | Missing secret on the web side: 9.1 and F-07 say `401` externally with an internal alert; ARCH-001-web-frontend 21 (FM-05) says `503`. | `401` |
| D-5 | Preview key lifetime: contract 3.10 says 5 minutes; web 8.4 step 3 sets the `pg_preview` cookie for 1800 s. | Unresolved; the backend sets the true lifetime and the cookie must not outlive it |
| D-6 | Preview path allow-list: contract 3.10 shows an unanchored pattern that includes `admin.*`; SEC-001 F-06 recommends `/events/`, `/stories/` and site pages only; web 17.1 requires `safe-redirect` plus allow-list on the web side. | Strict allow-list on both sides |
| D-7 | Contract NCT-L16 says preview links must be relative paths; PV01 and web 8.4 say `createPreviewLink` returns an absolute `{SITE}/api/draft?token=...`. | Absolute link for the entry URL; only the exchange `path` is relative |
| D-8 | The staging bypass header for a protected staging domain (OPS-001 PRE-03, DP-13) is not in contract 3.10 or 5.6. | Optional unsigned header, staging only |
| D-9 | Slug rules: web 9.1 and F-08 use `^[a-z0-9]+(?:-[a-z0-9]+)*$` with max 100; contract 2.7 uses the same regex with 3 to 80 chars (length marked inferred); the F-07 text shows the looser `^[a-z0-9-]{1,100}$`. | Strict regex; backend limit 3 to 80 |
| D-10 | Cookie name: web 8.4 and 22 use `pg_preview`; web 17.1 (F-06) says `__Host-pg_preview`. | Web concern; `__Host-` implies `Secure`, `Path=/`, no `Domain` |
| D-11 | `version`: contract OD-06 suggests cheap change detection on the frontend; the web handler only expires tags and does not read it. | Backend uses it for stale-row skipping |
| D-12 | File names: plan TASK-115 and TASK-117 name `ARCH-001-hosting.md` and `ARCH-001-db-region-move.md`; delivered as `ARCH-001-hosting-runtime.md` and `RUNBOOK-001-database-region-move.md`. | Delivered names; plan owner to update |
| D-13 | Plan TASK-113 describes a signature over the raw body and a 5 minute window and a `X-PG-Signature` HMAC; ARCH-001 v2 (F-07) supersedes with `timestamp.eventId.rawBody` and 60 s forward skew. | F-07 |
| D-14 | Retry delays, per-attempt timeout and outbox column names are not fixed anywhere. | Section 8 proposals |
| D-15 | Plan TASK-113 lists the rendering and tag work per route as a deliverable; ARCH-001 has no per-route tag table (section 2 derived it). | Section 2, to be confirmed in TASK-111 |

## 13. Conformance checklist (backend tests)

Run against a staging web deployment with a staging-only secret, or a local `next start` with `REVALIDATE_SECRET` set to a test value. Each item names the expected result. Items the web side tests itself (TASK-114) are not repeated.

**Signing and transport**
- [ ] C-01 Reproduce the section 4.1 vector exactly (signature `v1=b127...33d4`) with the fake key.
- [ ] C-02 Signature is `v1=` + 64 lowercase hex; headers `X-PG-Timestamp`, `X-PG-Event-Id`, `X-PG-Signature` present on every attempt.
- [ ] C-03 The signed string uses the same bytes that are sent (assert by hashing the bytes handed to the HTTP client).
- [ ] C-04 Request goes to `{SITE}/api/revalidate` directly, not via the `/api/*` rewrite and not to Railway.
- [ ] C-05 Body at most 16 KB; never contains personal data.

**Web responses (black-box)**
- [ ] C-06 Valid call returns `202 {"ok":true}`.
- [ ] C-07 Same event id sent twice returns `202` both times.
- [ ] C-08 One flipped body byte returns `401`.
- [ ] C-09 Signing without the event id returns `401`.
- [ ] C-10 Timestamp 301 s old and 61 s ahead each return `401`; 299 s old and 59 s ahead return `202`.
- [ ] C-11 Short, upper-case or non-hex signature returns `401`, never `500`.
- [ ] C-12 Invalid slug (for example `a/b`, `A-b`, 101 chars) with a valid signature returns `400`.
- [ ] C-13 Body over 16 KB returns `413`.
- [ ] C-14 During a rotation test, calls signed with the previous and the new secret both return `202`; after removing the previous value, the old one returns `401`.

**Outbox and retry**
- [ ] C-15 A content change and its outbox row commit atomically; a forced outbox insert failure rolls back the change.
- [ ] C-16 On `503`/timeout the dispatcher retries with the same event id, a different timestamp and a new signature, up to 5 attempts, with growing delay.
- [ ] C-17 `400` is not retried and raises an alert; exhaustion after 5 attempts raises an alert.
- [ ] C-18 Scheduler transitions (open, close, sold out, completed) emit a call; hold expiry emits one only on a public state flip.
- [ ] C-19 A media change emits one call per referencing entity.
- [ ] C-20 `version` increases on every update, is returned by public reads, and is included in the call.
- [ ] C-21 Changing the signing secret needs configuration and restart only.

**Freshness (end to end on staging, TASK-116)**
- [ ] C-22 Publish an event: the public page shows it within 60 s; unpublish: 404 within 60 s; cancel and complete show the right page mode.
- [ ] C-23 With the dispatcher disabled, a change appears within 15 minutes through the safety net.
- [ ] C-24 `GET /api/events/{slug}/availability` returns `Cache-Control: no-store`.

**Preview**
- [ ] C-25 `POST /api/preview/exchange` with a wrong or missing bearer returns `401`; with the right bearer and a fresh token returns `{path, previewKey}`.
- [ ] C-26 Reusing the token returns an error; an expired token (over 5 min) returns an error.
- [ ] C-27 `path` is relative and on the allow-list.
- [ ] C-28 After an exchange an anonymous `GET /api/events/{slug}` returns published content or 404; draft responses carry `private, no-store` and `noindex`.
- [ ] C-29 The previewKey cannot read another entity.

**Privacy purge (after TASK-127)**
- [ ] C-30 `player` and `result` calls are accepted by the web side and the affected pages are regenerated without the removed data.
