---
id: PLAN-004
type: plan
feature_id: FEAT-004
architecture_id: ARCH-004
version: 1
status: ready
date: 2026-10-30
---

# PLAN-004: Open Registrations

**Feature:** Open Registrations — expose the `published → registration_open` status transition through an API endpoint and Control Room UI button.  
**Scope:** 8 tasks across backend and frontend. No model migrations, no new DB tables. Pure capability, service, view, URL, type, and UI work.  
**Execution:** Tasks TASK-001 through TASK-005 are backend (sequential by dependency). Tasks TASK-006 through TASK-008 are frontend and can start in parallel with the backend once the API contract is agreed (i.e., immediately — the contract is fully defined in this document).

---

## API contract (agreed before implementation)

### Endpoint

```
POST /admin/events/<event_id>/open-registration
```

**Request:** no body required. Idempotency-Key header **required** (same convention as `publish`).

**Success response** — HTTP 200, envelope `{success: true, data: ...}`:

```json
{
  "id": "<uuid>",
  "status": "registration_open",
  "version": 3
}
```

**Error cases (same pattern as publish):**

| Code | HTTP | When |
|------|------|------|
| `NOT_PUBLISHABLE` | 422 | Event is not in `published` status |
| `NOT_FOUND` | 404 | Unknown event ID |
| `UNAUTHORIZED` | 401 | No valid admin session |
| Idempotency-Key missing | 400 | Header absent (enforced by `run_idempotent(required=True)`) |

### Capability field

`capabilities.canOpenRegistration` — a `CapabilityFlag` (same shape as `canPublish`):

```json
{ "allowed": true }
// or
{ "allowed": false, "reason": "Only a published event can open registrations." }
```

Allowed **only when** `event.status == 'published'`. Denied for every other status.

---

## Tasks

| ID | Title | Owner | Depends On | Effort | Status |
|----|-------|-------|-----------|--------|--------|
| TASK-001 | Add `can_open_registration` to `capabilities()` | backend-engineer | — | S | pending |
| TASK-002 | Add `open_registration()` service function | backend-engineer | TASK-001 | S | pending |
| TASK-003 | Add `OpenRegistrationView` | backend-engineer | TASK-002 | S | pending |
| TASK-004 | Register URL `events/<id>/open-registration` | backend-engineer | TASK-003 | S | pending |
| TASK-005 | Serialize `canOpenRegistration` in the overview DTO | backend-engineer | TASK-001 | S | pending |
| TASK-006 | Add `canOpenRegistration` to `EventCapabilitiesDto` (TS type) | frontend-engineer | — | S | pending |
| TASK-007 | Add `openRegistrations()` to API adapter interface + real implementation | frontend-engineer | TASK-006 | S | pending |
| TASK-008 | Add "Open registrations" button to `LifecycleActions` | frontend-engineer | TASK-006, TASK-007 | S | pending |

---

## Task Details

---

### TASK-001 — Add `can_open_registration` to `capabilities()`

- **Owner:** backend-engineer
- **Goal:** The `capabilities()` function in `event_builder.py` returns a dict that drives all lifecycle buttons on every surface (list row, control room header). Add a `canOpenRegistration` entry that is `allowed` only when `event.status == 'published'`.
- **Rationale:** The capabilities dict is the single source of truth for all lifecycle permissions (AC-84). The frontend never infers from `status` directly — it reads the capability flag. Without this key, no button is ever shown.
- **Dependencies:** none
- **Affected Files:**
  - `backend/adminapi/event_builder.py` — `capabilities()` function (lines ~251–272)
- **Implementation Notes:**
  - Add one local variable before the `return` statement in `capabilities()`:
    ```python
    can_open_registration = (
        _allowed() if status == 'published'
        else _denied('Only a published event can open registrations.')
    )
    ```
  - Add `'canOpenRegistration': can_open_registration` to the returned dict alongside `canPublish`, `canUnpublish`, `canCancel`, `canEdit`.
  - Use `_allowed()` and `_denied(reason)` — the existing private helpers at lines ~225–232 — no new helpers needed.
  - Do **not** add blockers to the denied branch (no sub-reasons needed; the status alone explains it).
  - The `LIVE_STATUSES` constant (line 42) is `('published', 'registration_open', 'sold_out')`. The condition must be exactly `status == 'published'`, not `status in LIVE_STATUSES`, so that `sold_out` and `registration_open` are denied.
- **Acceptance Criteria:**
  - [ ] `capabilities(event)['canOpenRegistration']` returns `{'allowed': True}` when `event.status == 'published'`
  - [ ] Returns `{'allowed': False, 'reason': 'Only a published event can open registrations.'}` for status `draft`, `registration_open`, `sold_out`, `ongoing`, `completed`, `cancelled`
  - [ ] All existing capability keys (`canPublish`, `canUnpublish`, `canCancel`, `canEdit`) are still present and unchanged
  - [ ] `row_dto()` (which calls `capabilities()`) includes the new key in its output
- **Tests Required:**
  - [ ] Unit test: `capabilities()` returns `allowed=True` for `published`
  - [ ] Unit test: `capabilities()` returns `allowed=False` with reason for at least `draft` and `registration_open`
- **Risk:** low — purely additive, no existing logic is touched

---

### TASK-002 — Add `open_registration()` service function

- **Owner:** backend-engineer
- **Goal:** Add a `open_registration(request, event_id)` function to `event_service.py` that transitions the event status from `published` to `registration_open`, saves it, and writes an audit log entry.
- **Rationale:** Following the exact same pattern as `publish()` (lines 267–283) and `unpublish()` (lines 288–300) provides a consistent, transactionally safe implementation. The service layer owns all mutation logic; the view is thin.
- **Dependencies:** TASK-001 (imports `eb.capabilities` shape for the error, though the error text is defined inline)
- **Affected Files:**
  - `backend/adminapi/event_service.py` — add function after `unpublish()` (after line ~300)
- **Implementation Notes:**
  - Insert immediately after the `unpublish` function, before the `# --- E09 cancel` block.
  - Use `transaction.atomic()` wrapper, `_locked_event(event_id)` to select-for-update, and `_save(event, request.user, 'Opened registrations')` to persist:
    ```python
    # ---------------------------------------------------------------- E?? open registration

    def open_registration(request, event_id) -> Event:
        with transaction.atomic():
            event = _locked_event(event_id)
            if event.status != 'published':
                raise NotPublishable(
                    blockers=[eb._b('NOT_PUBLISHED', 'Only a published event can open registrations.')],
                    fields={'form': ['Only a published event can open registrations.']},
                )
            event.status = 'registration_open'
            _save(event, request.user, 'Opened registrations')
            audit.write(
                request,
                action='event.open_registration',
                object_type='event',
                object_id=event.pk,
                before={'status': 'published'},
                after={'status': 'registration_open'},
            )
        return event
    ```
  - `NotPublishable` is already imported at line 18 from `core.errors`. `eb._b` is the blocker helper at `event_builder._b`.
  - The `audit` module is already imported (used in `publish`, `unpublish`).
  - No idempotency logic inside the service — `run_idempotent` in the view handles replays (same as `publish`).
  - No `readiness()` check needed — the event is already published, so it was already verified fit.
- **Acceptance Criteria:**
  - [ ] Calling with a `published` event transitions status to `registration_open` and returns the event
  - [ ] Calling with a non-`published` event raises `NotPublishable`
  - [ ] An audit log row with `action='event.open_registration'` is written inside the same transaction
  - [ ] The `event.last_change_summary` is set to `'Opened registrations'`
- **Tests Required:**
  - [ ] Unit/integration test: transitions `published → registration_open`
  - [ ] Unit/integration test: raises `NotPublishable` for `draft`, `registration_open`, `cancelled`
  - [ ] Unit/integration test: audit row is created
- **Risk:** low — identical pattern to `publish`/`unpublish`; no complex branching

---

### TASK-003 — Add `OpenRegistrationView`

- **Owner:** backend-engineer
- **Goal:** Add a `POST` view class `OpenRegistrationView` in `views_events.py` that calls `svc.open_registration()` and returns the updated event fields in the standard envelope.
- **Rationale:** Every lifecycle transition has its own thin view class (see `PublishView`, `UnpublishView`, `CancelView`, `CompleteView`). This keeps URL routing explicit and each view independently testable.
- **Dependencies:** TASK-002
- **Affected Files:**
  - `backend/adminapi/views_events.py` — add class after `UnpublishView` (after line ~230)
- **Implementation Notes:**
  - Insert after the `UnpublishView` class, before `CancelView`:
    ```python
    class OpenRegistrationView(AdminView):
        def post(self, request, event_id):
            def work():
                event = svc.open_registration(request, event_id)
                return ok({'id': str(event.pk), 'status': event.status, 'version': event.version})
            return run_idempotent(request, work, required=True)
    ```
  - `required=True` mirrors `PublishView` — the Idempotency-Key header is mandatory. A missing header returns 400 automatically by `run_idempotent`.
  - The response payload `{id, status, version}` mirrors `UnpublishView`'s response — simple and sufficient. No `registrationOpenedAt` timestamp is included (the audit log carries it; the frontend only needs to refresh the overview).
  - `AdminView` base class, `ok()`, and `run_idempotent` are already imported in this file.
  - `svc` is already aliased to `event_service` (line 19: `from . import event_service as svc`).
- **Acceptance Criteria:**
  - [ ] `POST /admin/events/<id>/open-registration` with a valid Idempotency-Key and `published` event returns HTTP 200 with `{id, status: "registration_open", version}`
  - [ ] Missing Idempotency-Key header returns HTTP 400
  - [ ] Non-`published` event returns HTTP 422 with `NOT_PUBLISHABLE` error code
  - [ ] Unauthenticated request returns HTTP 401
  - [ ] A second request with the same Idempotency-Key returns the cached original 200 response (idempotency replay)
- **Tests Required:**
  - [ ] Integration test: happy path — status transitions and response shape is correct
  - [ ] Integration test: idempotency replay returns same response
  - [ ] Integration test: 422 for wrong status
  - [ ] Integration test: 401 for unauthenticated
- **Risk:** low — thin view, no business logic; pattern is well-established

---

### TASK-004 — Register URL `events/<id>/open-registration`

- **Owner:** backend-engineer
- **Goal:** Wire `OpenRegistrationView` to the URL `events/<str:event_id>/open-registration` in `adminapi/urls.py`.
- **Rationale:** Without a URL entry the view is unreachable. The URL pattern must follow the same `<str:event_id>` placeholder convention as all other event action endpoints.
- **Dependencies:** TASK-003
- **Affected Files:**
  - `backend/adminapi/urls.py` — add one `path()` entry
- **Implementation Notes:**
  - Insert after the `unpublish` line (line 11) and before `cancel` (line 12):
    ```python
    path('events/<str:event_id>/open-registration', ev.OpenRegistrationView.as_view(), name='admin-event-open-registration'),
    ```
  - Use kebab-case in the URL path (`open-registration`) — matches the convention of all multi-word paths (`check-in`, `preview-link`, `reconcile`).
  - The `name` kwarg follows the `admin-event-<action>` pattern.
  - No `<uuid:event_id>` — existing patterns all use `<str:event_id>` (the service function calls `eb.parse_event_id()` for UUID conversion/validation).
- **Acceptance Criteria:**
  - [ ] `python manage.py show_urls` (or equivalent) lists `admin-event-open-registration`
  - [ ] `POST /admin/events/<id>/open-registration` routes to `OpenRegistrationView`
  - [ ] No existing URL is broken (run the URL resolver tests)
- **Tests Required:**
  - [ ] The integration test from TASK-003 implicitly covers this; no additional URL-only test needed
- **Risk:** low — mechanical one-liner

---

### TASK-005 — Serialize `canOpenRegistration` in the overview DTO

- **Owner:** backend-engineer
- **Goal:** The control room overview endpoint (`/admin/events/<id>/overview`) already serializes `capabilities`. Confirm that `canOpenRegistration` flows through automatically, or add it explicitly if the serializer filters keys.
- **Rationale:** The `LifecycleActions` frontend component reads `overview.capabilities.canOpenRegistration`. If the overview serializer selects only a fixed list of capability keys, the new key will be silently dropped.
- **Dependencies:** TASK-001
- **Affected Files:**
  - `backend/adminapi/views_control.py` — `OverviewView` (check how `capabilities` is serialized)
  - `backend/adminapi/event_builder.py` — `row_dto()` already includes capabilities (line ~281); overview may use a different path
- **Implementation Notes:**
  - Locate `OverviewView` in `views_control.py`. Check whether it calls `eb.capabilities(event)` directly and constructs a whitelist dict, or whether it passes the full dict through.
  - **Case A — full dict pass-through:** no code change needed; the new key flows automatically. Verify with a quick test request.
  - **Case B — explicit key list:** add `'canOpenRegistration': caps['canOpenRegistration']` to the dict literal alongside `canPublish`, `canUnpublish`, `canComplete`, `canCancel`.
  - In either case, add an assertion in the integration test that the overview response includes `capabilities.canOpenRegistration`.
- **Acceptance Criteria:**
  - [ ] `GET /admin/events/<id>/overview` response includes `capabilities.canOpenRegistration` for a `published` event with value `{allowed: true}`
  - [ ] Same endpoint for a `draft` event includes `capabilities.canOpenRegistration` with `{allowed: false, reason: "..."}`
- **Tests Required:**
  - [ ] Integration test: overview response shape includes `canOpenRegistration` for both `published` and `draft` states
- **Risk:** low if pass-through, low-medium if explicit (easy fix once identified)

---

### TASK-006 — Add `canOpenRegistration` to `EventCapabilitiesDto` (TypeScript types)

- **Owner:** frontend-engineer
- **Goal:** Extend the Zod schema and derived TypeScript type in `control-overview.ts` to include the optional `canOpenRegistration` capability field, consistent with the pattern established for `canPublish` and `canUnpublish`.
- **Rationale:** The Zod schema is the contract between the API and the frontend. Adding the field as `optional()` (`.optional()`) means existing clients that receive a server response without the field will still parse successfully — matching the additive pattern noted in the comment above `canPublish` (line 64: "Absent from an older server means 'not offered'").
- **Dependencies:** none (can be done before backend is deployed; optional field is safe)
- **Affected Files:**
  - `web/src/lib/api/types/admin/control-overview.ts` — `eventOverviewSchema`, `capabilities` sub-object (lines ~62–68)
- **Implementation Notes:**
  - In the `capabilities` z.object inside `eventOverviewSchema`, add:
    ```ts
    /** FE-XX: lifecycle button shown when status is published. Absent from an older server means "not offered". */
    canOpenRegistration: capabilityFlagSchema.optional(),
    ```
  - Place it between `canUnpublish` and `serverNow`, keeping the declaration order consistent with the lifecycle progression: publish → unpublish → **open registrations** → complete → cancel.
  - No other type files need to change for this step — `EventOverviewDto` is re-exported from this schema.
- **Acceptance Criteria:**
  - [ ] `EventOverviewDto` TypeScript type includes `canOpenRegistration?: CapabilityFlag`
  - [ ] Zod parse of a server response **without** `canOpenRegistration` succeeds (field is optional)
  - [ ] Zod parse of a server response **with** `canOpenRegistration: {allowed: true}` succeeds
  - [ ] Zod parse of a server response **with** `canOpenRegistration: {allowed: false, reason: "..."}` succeeds
  - [ ] No TypeScript compiler errors (`tsc --noEmit`)
- **Tests Required:**
  - [ ] TypeScript compilation passes
  - [ ] If schema unit tests exist for `eventOverviewSchema`, add a case for the new field
- **Risk:** low — purely additive optional field

---

### TASK-007 — Add `openRegistrations()` to API adapter interface and real implementation

- **Owner:** frontend-engineer
- **Goal:** Expose the new `POST /admin/events/<id>/open-registration` endpoint in the `PgAdminEventsApi` interface (`pg-admin-api.ts`) and implement it in `real-admin.ts`, following the identical conventions used by `publishEvent`.
- **Rationale:** All API calls go through the typed adapter interface — the UI never calls `fetch` directly. Adding the method here makes it available to `LifecycleActions` and any future consumer.
- **Dependencies:** TASK-006 (needs the result type, though a minimal `{id, status, version}` shape is sufficient)
- **Affected Files:**
  - `web/src/lib/api/types/admin/event-builder.ts` — add `OpenRegistrationResult` schema + type (alongside `unpublishEventResultSchema`)
  - `web/src/lib/api/types/response-schemas.ts` — add `openRegistrationEvent` entry to `adminEventsResponses`
  - `web/src/lib/api/pg-admin-api.ts` — add `openRegistrations()` method to the events interface
  - `web/src/lib/api/adapters/real-admin.ts` — implement the method
- **Implementation Notes:**

  **1. `event-builder.ts`** — add after `unpublishEventResultSchema` (line ~281):
  ```ts
  /** E-OR response: registration is now open. */
  export const openRegistrationResultSchema = z.object({
    id: uuidSchema,
    status: eventStatusSchema,
    version: versionSchema,
  })
  export type OpenRegistrationResult = z.infer<typeof openRegistrationResultSchema>
  ```
  This is identical in shape to `UnpublishEventResult`. Reusing the same schema is acceptable, but naming it explicitly aids API documentation clarity.

  **2. `response-schemas.ts`** — in `adminEventsResponses` (lines ~155–166), add after `unpublishEvent`:
  ```ts
  openRegistrationEvent: openRegistrationResultSchema,
  ```
  Also add the import for `openRegistrationResultSchema` in the import block from `event-builder`.

  **3. `pg-admin-api.ts`** — in the `PgAdminEventsApi` interface, add after `unpublishEvent` (line ~169):
  ```ts
  /** E-OR. Idempotency-Key required. NOT_PUBLISHABLE when not in published status. */
  openRegistrations(eventId: EventId, key: IdempotencyKey, opts?: AdminRequestOpts): Promise<OpenRegistrationResult>
  ```
  Also add `OpenRegistrationResult` to the imports from `event-builder`.

  **4. `real-admin.ts`** — in the `events` object (lines ~107–129), add after `unpublishEvent`:
  ```ts
  openRegistrations: (eventId, key, opts) =>
    http.json(
      spec('POST', `${ev(eventId)}/open-registration`, opts, { idempotencyKey: key }),
      adminEventsResponses.openRegistrationEvent,
    ),
  ```
  Note the URL path uses a hyphen: `open-registration` (matching the Django URL).

- **Acceptance Criteria:**
  - [ ] `api.events.openRegistrations(id, key)` is callable and TypeScript-typed
  - [ ] The method sends `POST /admin/events/<id>/open-registration` with the Idempotency-Key header
  - [ ] The return type is `Promise<OpenRegistrationResult>`
  - [ ] `tsc --noEmit` passes with no errors
  - [ ] Importing from `real-admin.ts` does not import anything from the public (non-admin) API graph
- **Tests Required:**
  - [ ] TypeScript compilation passes
  - [ ] If adapter unit tests / MSW mocks exist, add a handler for the new endpoint
- **Risk:** low — mechanical addition of a 4-line method following an established pattern

---

### TASK-008 — Add "Open registrations" button to `LifecycleActions`

- **Owner:** frontend-engineer
- **Goal:** Render an "Open registrations" `ConfirmAction` button in `LifecycleActions.tsx` when `caps.canOpenRegistration?.allowed === true`, following the identical structure of the existing "Publish" button.
- **Rationale:** The UI must not infer lifecycle actions from status — all buttons are driven by the capability flags from the server (AC-84). The `ConfirmAction` pattern provides an idempotency key and a confirmation dialog for free.
- **Dependencies:** TASK-006 (`canOpenRegistration` field on `EventCapabilitiesDto`), TASK-007 (`api.events.openRegistrations`)
- **Affected Files:**
  - `web/src/features/event-control/LifecycleActions.tsx`
- **Implementation Notes:**
  - Add the new block **after** the `canUnpublish` block and **before** the `canComplete` check (line ~77), so the rendered order matches the lifecycle: Publish → Unpublish → **Open registrations** → Complete → Cancel.
  - Model it on the `canPublish` block (lines ~35–53):
    ```tsx
    {caps.canOpenRegistration?.allowed === true ? (
      <ConfirmAction
        renderTrigger={(open) => <Button onClick={open}>Open registrations</Button>}
        title="Open registrations for this event?"
        consequence="Players will be able to register from the public event page immediately."
        confirmLabel="Open registrations"
        actionLabel="open registrations for this event"
        onConfirm={async (key) => {
          try {
            await api.events.openRegistrations(id, key)
          } catch (error) {
            await refresh() // a refusal changes what the server lists as blockers
            throw error
          }
        }}
        onDone={() => {
          void refresh()
          toast.success('Registrations opened')
        }}
      />
    ) : null}
    ```
  - Use `optional chaining` (`?.allowed`) — same as `canPublish` and `canUnpublish` — because the field is declared optional in the Zod schema. `canComplete` and `canCancel` use `.allowed` without `?.` because they are non-optional in the schema; do not change those.
  - The `Button` variant is default (no `variant="secondary"`) — same as `Publish`, to distinguish it from `Unpublish`.
  - The `consequence` text must be user-safe: it describes the visible effect without mentioning internal status names.
  - Do **not** add a `stepUp` requirement — opening registrations has no financial or user-impacting reversal risk that would warrant step-up re-authentication.
- **Acceptance Criteria:**
  - [ ] "Open registrations" button appears when `caps.canOpenRegistration?.allowed === true`
  - [ ] Button is absent when the field is missing (`undefined`) or `allowed === false`
  - [ ] Clicking opens a `ConfirmAction` dialog with the correct title, consequence, and confirm label
  - [ ] Confirming calls `api.events.openRegistrations(eventId, idempotencyKey)`
  - [ ] On success the overview query is invalidated (via `refresh()`) and a toast reads "Registrations opened"
  - [ ] On error the overview is still refreshed before re-throwing (blockers may have changed)
  - [ ] No TypeScript errors
- **Tests Required:**
  - [ ] Component test (RTL or equivalent): renders button when `canOpenRegistration.allowed = true`
  - [ ] Component test: does not render when field is absent
  - [ ] Component test: calls adapter method on confirm and shows toast on success
- **Risk:** low — pure UI composition, no new patterns introduced

---

## Critical Path

```
TASK-001 (capabilities)
  → TASK-002 (service)
    → TASK-003 (view)
      → TASK-004 (URL)         ← backend feature complete

TASK-001 (capabilities)
  → TASK-005 (overview DTO)   ← backend overview updated

TASK-006 (TS types)
  → TASK-007 (adapter)
    → TASK-008 (UI button)    ← frontend feature complete
```

The **overall critical path** for end-to-end functionality is:

`TASK-001 → TASK-002 → TASK-003 → TASK-004` (backend API ready)  
`TASK-006 → TASK-007 → TASK-008` (frontend UI ready)  
`TASK-001 → TASK-005` (overview capability visible in control room)

All three chains must be complete before the feature is testable end-to-end.

---

## Parallel Work Opportunities

| Group | Tasks | Earliest start | Notes |
|-------|-------|---------------|-------|
| Group A — Backend API | TASK-001 → 002 → 003 → 004 | Immediately | Sequential by dependency; total ~1h |
| Group B — Overview DTO | TASK-005 | After TASK-001 | Independent of Group A tasks 002–004 |
| Group C — Frontend | TASK-006 → 007 → 008 | Immediately (contract is defined above) | Fully parallelisable with Groups A and B; the optional Zod field is safe before the backend deploys |

---

## Feature Acceptance Criteria (end-to-end)

- [ ] A `published` event shows an "Open registrations" button in the Control Room header
- [ ] Clicking the button shows a confirmation dialog; confirming sends `POST /admin/events/<id>/open-registration`
- [ ] After confirmation the event status changes to `registration_open` in the UI (overview refreshes)
- [ ] A toast reads "Registrations opened"
- [ ] The "Open registrations" button disappears after the transition (capability is now `allowed: false`)
- [ ] A `draft`, `registration_open`, `sold_out`, `ongoing`, `completed`, or `cancelled` event shows no "Open registrations" button
- [ ] The backend rejects duplicate requests with the same Idempotency-Key gracefully (replays the first 200)
- [ ] The audit log records `event.open_registration` with `before: {status: 'published'}`, `after: {status: 'registration_open'}`
- [ ] No regression to existing Publish, Unpublish, Cancel, or Complete buttons

---

## Blockers

None. All required primitives (`_allowed`, `_denied`, `_b`, `_locked_event`, `_save`, `NotPublishable`, `audit`, `run_idempotent`, `AdminView`, `ok`, `ConfirmAction`, `capabilityFlagSchema`) already exist in the codebase.
