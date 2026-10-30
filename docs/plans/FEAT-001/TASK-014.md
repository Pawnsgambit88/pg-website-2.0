---
id: TASK-014
type: task
feature_id: FEAT-001
plan_id: PLAN-001
title: API client core, envelope handling and error-code to copy map
owner: frontend-engineer
status: pending
priority: critical
estimate: L
parallel_group: G1
dependencies: [TASK-002, TASK-007]
affected_files:
  - web/src/lib/api/envelope.ts
  - web/src/lib/api/errors.ts
  - web/src/lib/api/error-copy.ts
  - web/src/lib/api/http.ts
  - web/src/lib/api/server/fetch.ts
  - web/src/lib/api/browser/client.ts
  - web/src/lib/api/browser/tokens.ts
goal: One HTTP layer with a server entry (public reads during rendering) and a browser entry (authenticated calls from client islands), both speaking the unified envelope, with safe token refresh in the browser and humane error copy everywhere.
context: The backend is being replaced (FEAT-000 inventory pending), so the client targets the approved unified envelope (docs/decisions/2026-09-15-unified-api-response-envelope.md) as the contract and does not special-case the legacy Django shapes. The PgApi interface and its mocks are the contract; this layer is the transport underneath. Public pages fetch on the server; (auth), (app) and (admin) areas call from the browser, where tokens live. Q2 resolved - a refresh token in browser storage is acceptable.
implementation_notes:
  - "Shared pure modules (envelope.ts, errors.ts, error-copy.ts) are importable from server and client. They have no browser or Node globals beyond fetch/URL."
  - "server/fetch.ts starts with import 'server-only' and exposes serverGet(path, {tags, revalidate, schema}) using API_INTERNAL_URL; it passes Next fetch options (next: {tags, revalidate}) and never reads or forwards user tokens (public data only)."
  - "browser/client.ts and browser/tokens.ts are client-only (guard with typeof window and a 'use client' consumer boundary). request(path, {method, body, signal, auth, schema, idempotencyKey}). Base URL from NEXT_PUBLIC_API_BASE_URL."
  - "Envelope detection is strict: object with boolean success and data or error. A non-envelope body or an HTML error page becomes ApiError(BAD_RESPONSE or NETWORK_OR_SERVER). 204/205 are bodyless."
  - "ApiError carries code, status, detail, fields, requestId (meta.request_id or X-Request-ID), retryAfter. AbortError is not surfaced as an error."
  - "Default 15 s timeout combined with the caller's AbortSignal (AbortSignal.any) so TanStack Query cancels superseded requests."
  - "Token policy (Q2): short-lived access token held in memory only; refresh token in versioned browser storage (key pg:auth:v1, try/catch wrapped, only the refresh token). Never in cookies readable by JS other than that, never in URLs, logs or error reports."
  - "Single-flight refresh: on 401 for an auth-required call one shared promise calls the contract refresh endpoint; concurrent 401s await it; the original request replays once; the rotated pair is stored atomically. Refresh failure clears tokens, emits onSessionExpired and rejects with AUTH_REQUIRED."
  - "Validate payloads with the zod schema passed by the PgApi adapter; schema failure becomes ApiError(BAD_RESPONSE) and logs path only, never the body."
  - "No axios. fetch only, so no extra client bundle."
  - "Mutations that create orders send an Idempotency-Key header supplied by the caller."
  - "Error copy map (error-copy.ts): AUTH_REQUIRED, ADMIN_REQUIRED, EVENT_NOT_FOUND, REGISTRATION_NOT_OPEN, REGISTRATION_CLOSED, EVENT_FULL, ALREADY_REGISTERED, PAYMENT_REQUIRED, PAYMENT_MISMATCH, INVALID_SIGNATURE, CHECKIN_WINDOW_CLOSED, REGISTRATION_NOT_CONFIRMED, ROUND_NOT_FOUND, RESULTS_NOT_FINAL, ROUND_ALREADY_FINALIZED, plus HTTP_400 with fields, HTTP_401 (login), HTTP_403, HTTP_404, HTTP_429 (with retry_after), HTTP_5xx, NETWORK, TIMEOUT, BAD_RESPONSE. Each names the failed action and the smallest recovery step; unknown codes fall back to the 5xx/NETWORK pattern with a caller-supplied action label."
acceptance_criteria:
  - {id: AC-1, description: "Envelope success, envelope failure, 204/205, non-JSON/HTML error, network failure, timeout and abort each have a unit test producing the specified ApiError or data."}
  - {id: AC-2, description: "Ten concurrent 401s cause exactly one refresh request; refresh failure signs the user out once and preserves the current route as return-to intent."}
  - {id: AC-3, description: "All 15 codes in docs/BACKEND-CONTRACT.md plus the HTTP and transport fallbacks have copy; a test asserts no copy string is empty or contains an unresolved placeholder."}
  - {id: AC-4, description: "Aborting a request via signal yields no error state and no console noise."}
  - {id: AC-5, description: "No log or error message contains a token, request body, response body or stack trace (spy test)."}
  - {id: AC-6, description: "The server entry cannot be imported into a client component: the build fails when a 'use client' module imports server/fetch.ts (server-only), and the browser entry throws if executed on the server."}
  - {id: AC-7, description: "Access token is never persisted; only the refresh token is stored, under a versioned key, and storage failures (private mode, quota) degrade to an in-memory session without throwing."}
  - {id: AC-8, description: "The browser client adds no dependency beyond fetch and zod, verified in the bundle report."}
tests_required:
  - {type: unit, description: "Envelope handling matrix, single-flight refresh, timeout, abort, error copy completeness, storage degradation."}
  - {type: contract, description: "Handed to TASK-092: the same envelope fixtures run against every adapter."}
  - {type: security, description: "Token never appears in logged output, URLs or error payloads."}
  - {type: integration, description: "server-only boundary test: client import of server/fetch.ts fails the build."}
risk: high
blockers: []
verification:
  commands: ["npm run check", "npm run build"]
  result: not_run
---

# TASK-014 API client core (long form)

Estimate L. Standards: DoD-S not applicable; DoD-G and DoD-R apply (react-best-practices: `server-only` boundaries, `server-serialization`, `server-no-shared-module-state`, `client-localstorage-schema`).

## Why two entries

Public pages are prerendered, so their data is fetched on the server with Next's data cache tags (TASK-111, TASK-113). Authenticated areas are client-rendered, so their calls need the in-memory access token. Sharing envelope parsing and error types between the two avoids two divergent error vocabularies; separating the entries stops a token-aware client from ever running during server rendering, where module scope is shared across requests.

## Shared state rule

No module-level mutable state may be written during a server render. The server entry is stateless. The only mutable module state is in `browser/tokens.ts` and is created lazily inside a client-only function, never at import time on the server.

## Error-copy table (draft; product-manager approves)

| Code | Copy | Next step |
|------|------|-----------|
| AUTH_REQUIRED | Please log in to continue. We'll bring you back here. | login with returnTo |
| ADMIN_REQUIRED | This area is for PG admins only. | go to My PG |
| EVENT_NOT_FOUND | We can't find that event. It may have moved or been removed. | go to Play |
| REGISTRATION_NOT_OPEN | Registration for this event hasn't opened yet. | show opening date |
| REGISTRATION_CLOSED | Registration for this event has closed. | see next events |
| EVENT_FULL | This event is full. | waitlist if enabled, else next events |
| ALREADY_REGISTERED | You're already registered for this event. | go to My events |
| PAYMENT_REQUIRED | This event needs payment to confirm your place. | continue to payment |
| PAYMENT_MISMATCH | We couldn't match that payment to your place. Nothing has been charged twice; we're checking. | contact desk |
| INVALID_SIGNATURE | We couldn't verify that payment. If you were charged, your place will confirm shortly. | confirming state |
| CHECKIN_WINDOW_CLOSED | Check-in isn't open right now. | show window |
| REGISTRATION_NOT_CONFIRMED | Your place isn't confirmed yet, so you can't check in. | go to My events |
| ROUND_NOT_FOUND | That round no longer exists. | refresh |
| RESULTS_NOT_FINAL | Some results are still open, so this round can't be finalised. | show open results |
| ROUND_ALREADY_FINALIZED | This round has already been finalised. Ratings were processed once. | show processed state |
| HTTP_400 + fields | field-level server messages | focus first field |
| HTTP_401 (login) | That email and password don't match. | retry |
| HTTP_403 | You don't have access to this. | go back |
| HTTP_404 | We can't find that. | go back |
| HTTP_429 | Too many attempts. Try again in {retry_after} seconds. | wait |
| HTTP_5xx, NETWORK, TIMEOUT | We couldn't {action}. Your details are saved; try again. | retry |
| BAD_RESPONSE | Something unexpected came back. Please try again. | retry, quote requestId |

Acceptance criteria, tests and notes are in the front matter (schema form).
