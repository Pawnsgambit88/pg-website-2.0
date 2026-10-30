# Plan: Event Control Pairings page completion (screen 49)

**ID:** PLAN-004
**Type:** plan
**Feature:** FEAT-001
**Architecture:** ARCH-001
**Version:** 1
**Status:** draft (not validated against schemas/plan.schema.yaml; the schema targets YAML front matter and this document follows templates/plan.md markdown layout)
**Date:** 2026-10-30

**Scope:** Finish `/admin/events/[id]/pairings` (screen 49) against the original TASK-085 spec. Backend first, then frontend. No new test tasks: the only test file touched is the existing `web/src/features/event-control/pairings/pairings-logic.test.ts`. No new mocks (admin always uses the real backend). Security review and the excluded items from PLAN-002 stay excluded.

**Why this plan exists:** PLAN-002 marks FE-33 `[x]` and BE-05 `[x]`, and PLAN-003 marks row 49 `DONE`. Reading the code shows C06 to C12 exist and are wired, but the page is missing several things TASK-085 requires, and two UI promises are not backed by the server. Those claims should be corrected when this plan is executed.

---

## 1. Verified state

### 1.1 Backend C06 to C12 (code present, not run)

Routes are in `backend/adminapi/urls.py` (lines 15-24), mounted at `api/admin/` by `backend/pgchess/urls.py` line 14. Handlers are in `backend/adminapi/views_rounds.py`; logic is in `backend/adminapi/round_service.py`.

| Contract | Endpoint | Code | Status |
|---|---|---|---|
| C06 list | `GET events/<id>/rounds` | `round_service.list_rounds` (290-294) | Present |
| C07 generate | `POST events/<id>/rounds/generate` | `generate_round` (349-403), Swiss and social balanced via `pairing_engine.build_round` | Present. Rematch count is audited only (399-402), not returned |
| C08 edit | `PATCH .../rounds/<rid>/pairings` | `edit_pairings` (476-534); phase `draft` or `after_publish`, reason required after publish, `VersionConflict` | Present. Does not notify players. Does not report rematches |
| C09 publish | `POST .../publish` (IK required) | `publish_round` (550-569) | Present. **Does not notify players**. The only comment (568) says "No site revalidation"; no comms call exists in `adminapi` for rounds |
| C10 start | `POST .../start` | `start_round` (572-584) | Present |
| C11 result | `PUT .../pairings/<pid>/result` | `record_result` (601-630), `resolve` only on disputed | Present |
| C12 finalise | `POST .../finalise` (IK required) | `finalise_round` (700-736), same-key replay and `ROUND_ALREADY_FINALIZED` | Present. Rating runs in the same transaction via `process_round` |

Other backend facts:
- `backend/README.md` line 231: "`pairing_published` is not sent by any job yet." Line 220 lists the email template keys and does not include `pairing_published`.
- `backend/comms/transactional.py` line 74 defines `queue_event_trigger(event, trigger, registrations)`. Whether it fits the publish case is to be confirmed in TASK-001.
- Nothing in the round DTO (`_pairing_dto`, 190-208) exposes rematch or duplicate information. `_capabilities` (231-255) returns only a count of unresolved results, with no disputed breakdown.
- Backend has no automated tests for these endpoints (owner deferred). Runtime behaviour is unverified.

### 1.2 Frontend

Files under `web/src/features/event-control/pairings/`. Entry: `web/src/features/event-control/tabs.tsx` line 50 (dynamic import of `PairingsTab`). Route: `web/src/app/(admin)/admin/events/[id]/[tab]/page.tsx` renders `ControlFrame` with only the id and tab (AC-9 is satisfied).

| Part of TASK-085 | Found | Evidence |
|---|---|---|
| Loading, empty, error for the tab | Present | `PairingsTab.tsx` 31-53 (QueryView with skeleton and errorAction); `RoundsView.tsx` 79-86 (EmptyState "No rounds yet", generate action or reason) |
| Generate with confirmation, failure keeps dialog open | Present | `GenerateAction.tsx`; `ConfirmAction` keeps the dialog open on error |
| Publish, start, finalise with confirmation and IK | Present | `RoundActions.tsx` |
| Disputed queue and result entry or override with reason | Present | `RoundsView.tsx` 174-204; `ResultAction.tsx` |
| Post-publish reason field | Present | `EditPairings.tsx` 213-229 |
| Rating status (pending poll, complete, not rated) | Present | `RatingStatus.tsx`; `PairingsTab.tsx` 14-34 polls every 5 s while pending |
| Void banner | Present | `RoundsView.tsx` 155-158 |
| Swap colours | Present | `EditPairings.tsx` 108-111, `flipColours` in `pairings-logic.ts` 68-77 |
| Edit dialog with searchable White and Black select from checked-in unpaired players | **Missing** | `EditPairings.tsx` is an inline panel (`RoundsView.tsx` 206-229 swaps it in place of the table). Editing is select-to-swap between already seated players only. No candidate list, no add or remove board, no search |
| Duplicate prevention | Partly | Swap logic prevents duplicates by construction (`pairings-logic.ts` 56-65). No explanation before save. Server rejects duplicates (`round_service.py` 440-445) with a field error only |
| Rematch warning | **Missing** | No rematch logic in `web/src` (grep for rematch returns only unrelated text). Server computes `rematches` (`pairing_engine.py`) but only audits it |
| "Creates version N and notifies the affected players" on published rounds | **Partly** | Reason field present. Copy says "a new version" (`EditPairings.tsx` 145) with no number. The header shows "pairing version N" (`RoundsView.tsx` 119), not the round `version` |
| Publish confirmation repeats boards, byes, notification channel status | **Missing** | `RoundActions.tsx` 47 is static text, no counts, no channel status |
| Finalise confirmation "processes ratings for N players once" | **Missing** | `RoundActions.tsx` 93 says "Results lock and ratings are processed once." No N |
| Progress "N of M results final" | **Missing** | `RoundsView.tsx` 144-151 shows "N results still open" only |
| Disabled finalise names blockers with links ("2 results pending, 1 disputed") | **Missing** | `RoundActions.tsx` 20-21 shows the server text (`round_service.py` 247) which has no disputed split and no link |
| Rows are React.memo, stable props (AC-5) | **Missing** | No `memo` in the pairings folder (grep). `RoundsView.tsx` 97-99 creates a new `renderActions` closure every render |
| Mobile: sticky bottom action bar, round selector scroll-snap strip, bottom sheets under 720px (AC-4) | **Missing** | No `sticky`, `scroll-snap` or `safe-area` in the pairings folder. Round selector is a plain `Select` (`RoundsView.tsx` 104-115) |
| Publish notifies players (copy in `RoundActions.tsx` 47, `RoundsView.tsx` 135, toast in `EditPairings.tsx` 80 "players notified") | **Not true on the server** | `publish_round` queues nothing. See TASK-001 |

### 1.3 Claims to correct

- PLAN-002 row FE-33 `[x]`: incorrect. The edit dialog, rematch warning, publish and finalise copy, progress and blocker breakdown, mobile layout and row memo are not done.
- PLAN-002 row BE-05 `[x]`: the C06 to C12 code exists and is wired, but publish does not notify players, and rematch and blocker detail is not exposed. No backend tests exist (excluded by owner), so runtime behaviour is unverified.
- PLAN-003 row 49 `DONE`: incorrect for the same reasons.

---

## 2. Tasks

| ID | Title | Owner | Size | Depends On | Risk | Status |
|----|-------|-------|------|-----------|------|--------|
| TASK-001 | Publish and post-publish edits notify affected players | backend-engineer | M | — | high | pending |
| TASK-002 | Expose rematch flags per game in the round DTO | backend-engineer | S | — | low | pending |
| TASK-003 | Expose checked-in unpaired candidates for the round editor | backend-engineer | M | — | medium | pending |
| TASK-004 | Split unresolved results into pending and disputed in blockers | backend-engineer | S | — | low | pending |
| TASK-005 | Update admin round types for the new fields | frontend-engineer | S | TASK-002, TASK-003, TASK-004 | low | pending |
| TASK-006 | Replace the inline swap editor with the edit dialog (searchable White and Black, add and remove board) | frontend-engineer | L | TASK-003, TASK-005 | high | pending |
| TASK-007 | Rematch warning, version copy and failure handling in the edit dialog | frontend-engineer | S | TASK-002, TASK-006 | medium | pending |
| TASK-008 | Round header: round and pairing version, "N of M results final", blocker breakdown with links | frontend-engineer | S | TASK-004, TASK-005 | low | pending |
| TASK-009 | Publish and finalise confirmations name their effect | frontend-engineer | S | TASK-001, TASK-005 | low | pending |
| TASK-010 | Mobile layout: sticky action bar, round selector strip, bottom sheets under 720px | frontend-engineer | M | TASK-006, TASK-008 | medium | pending |
| TASK-011 | Memoise pairing rows and stabilise row callbacks | frontend-engineer | S | TASK-010 | low | pending |

**Task count:** 11 (4 backend, 7 frontend). No test-engineer tasks (deferred by owner). The existing `pairings-logic.test.ts` is extended inside TASK-006, TASK-007, TASK-008 and TASK-009 only where a pure helper is added.

---

## 3. Task Details

### TASK-001 — Publish and post-publish edits notify affected players

- **Owner:** backend-engineer
- **Goal:** Publishing a round queues the `pairing_published` notification for each paired player. A post-publish correction queues it for players whose seat changed. Draft edits send nothing.
- **Rationale:** The UI tells the admin that publishing notifies players (`RoundActions.tsx` 47, `RoundsView.tsx` 135, `EditPairings.tsx` 80). The server does nothing, so the promise is false.
- **Dependencies:** none
- **Affected Files:**
  - `backend/adminapi/round_service.py` (`publish_round` 550-569, `edit_pairings` 476-534)
  - `backend/comms/transactional.py` (`queue_event_trigger` line 74, reuse if it fits)
  - `backend/comms/conf.py`, `backend/comms/models.py` (trigger already listed)
  - `backend/README.md` (line 220 template list, line 231 note, update)
- **Implementation Notes:**
  - Queue inside the same `transaction.atomic()` as the state change, so a rollback drops the notification. Use the existing dedupe on (template, registration).
  - Confirm that a `pairing_published` email template exists or a default is used. `backend/README.md` line 220 does not list it.
  - Recipients on publish: confirmed registrations of paired players. Whether byes are notified is a decision for implementation; state it in the response.
  - On correction: players added to or removed from a board, and byes whose status changed.
  - Do not change response shapes.
- **Acceptance Criteria:**
  - [ ] Publishing a draft with boards queues one `pairing_published` per paired registration; a failed publish queues nothing.
  - [ ] A correction on a published or live round queues only the affected players.
  - [ ] A draft edit queues nothing.
  - [ ] `backend/README.md` line 231 is updated to reflect the new behaviour.
- **Tests Required:** none new (owner deferred tests). Verify by reading the code and by the existing backend import check only.
- **Risk:** high (sends mail to players; wrong recipients are visible to users)
- **Status:** pending

### TASK-002 — Expose rematch flags per game in the round DTO

- **Owner:** backend-engineer
- **Goal:** Each game DTO carries `rematch: true` when the two players already met in a published, live or completed round of this event (same rule as generation).
- **Rationale:** AC-7 needs the rematch warning before save. Generation computes `draft.rematches` but only audits the count (`round_service.py` 399-402). Nothing reaches the screen.
- **Dependencies:** none
- **Affected Files:**
  - `backend/adminapi/round_service.py` (`_pairing_dto` 190-208, `_View` 120-145, reuse `_history` 309-335)
- **Implementation Notes:**
  - Build the played set once per request in `_View` (no N+1). Exclude the current round's own pairings so a board is not flagged against itself.
  - The warning is advisory. Do not reject the edit for a rematch (TASK-085 says "flags rematches as a warning").
  - Byes do not carry the flag.
- **Acceptance Criteria:**
  - [ ] Every game DTO includes a `rematch` boolean; byes do not.
  - [ ] A pairing that matches a played pair in a visible round is `rematch: true`, otherwise `false`.
  - [ ] Response shape otherwise unchanged; the edit response (`round_dto`) carries the same flags.
- **Tests Required:** none new.
- **Risk:** low
- **Status:** pending

### TASK-003 — Expose checked-in unpaired candidates for the round editor

- **Owner:** backend-engineer
- **Goal:** The round DTO includes `candidates`: confirmed registrations with `pairing_active`, not already on a board or bye in this round, with name, rating, first-timer flag and checked-in state. Ordered by name.
- **Rationale:** TASK-085 requires the White and Black selects to offer checked-in, unpaired players. No such list exists in the admin API, so the editor cannot add a player who is not already seated.
- **Dependencies:** none
- **Affected Files:**
  - `backend/adminapi/round_service.py` (`_round_dto` 266-281, new helper near `_View`)
  - `backend/registrations/models.py` (read only: `Registration.checked_in_at`, `pairing_active`)
- **Implementation Notes:**
  - Include only `status='confirmed'` and `pairing_active=True`. Mark `checkedIn` so the UI can prefer checked-in players and still show others.
  - Only for rounds in `EDITABLE_STATES`; empty list otherwise, to keep the completed-round payload small.
  - Bounded: cap at 500 (matches the existing `boards` bound).
- **Acceptance Criteria:**
  - [ ] Draft and published round DTOs include `candidates` with the fields above.
  - [ ] A player already on a board or bye in this round is not a candidate.
  - [ ] Completed and void rounds return an empty list.
- **Tests Required:** none new.
- **Risk:** medium (payload size on large events; keep the cap)
- **Status:** pending

### TASK-004 — Split unresolved results into pending and disputed in blockers

- **Owner:** backend-engineer
- **Goal:** Finalise blockers and the `canFinalise` reason say how many results are pending and how many are disputed, for example "2 results pending, 1 disputed".
- **Rationale:** The finalise gating in TASK-085 names the blocker. Current text is "N results not final yet." (`round_service.py` 247 and 716).
- **Dependencies:** none
- **Affected Files:**
  - `backend/adminapi/round_service.py` (`_capabilities` 231-255, `finalise_round` 715-717; `_unresolved` 211-212 unchanged)
- **Implementation Notes:**
  - Keep `RESULTS_NOT_FINAL` as the code. Only the reason text and a pending and disputed count in the blocker change. Keep `unresolvedResults` as is for compatibility.
  - Do not change the error code or status.
- **Acceptance Criteria:**
  - [ ] Blocker reason reads "N pending" and "M disputed" in one sentence, with the zero parts omitted.
  - [ ] Finalise error body carries the same text.
  - [ ] Error code remains `RESULTS_NOT_FINAL`.
- **Tests Required:** none new.
- **Risk:** low
- **Status:** pending

### TASK-005 — Update admin round types for the new fields

- **Owner:** frontend-engineer
- **Goal:** `web/src/lib/api/types/admin/control-rounds.ts` accepts `rematch` on game pairings, `candidates` on rounds, and the new blocker text. Schema stays strict where it was strict.
- **Rationale:** The real adapter parses every response with zod, so the new fields must be in the schema before any screen reads them.
- **Dependencies:** TASK-002, TASK-003, TASK-004
- **Affected Files:**
  - `web/src/lib/api/types/admin/control-rounds.ts` (`adminPairingSchema` 71-87, `roundBase` 108-120)
  - `web/src/lib/api/types/response-schemas.ts` (lines 177-178, no change expected)
  - `web/src/lib/api/types/admin.test.ts` (existing fixtures, only if they break)
- **Implementation Notes:**
  - `candidates` as an array of `boardPlayerSchema` plus `checkedIn: boolean`, max 500.
  - Do not add a new mock. Admin is real-backend only.
- **Acceptance Criteria:**
  - [ ] Typecheck and lint pass.
  - [ ] Existing `admin.test.ts` still passes.
  - [ ] A real round response with the new fields parses.
- **Tests Required:** existing tests only.
- **Risk:** low
- **Status:** pending

### TASK-006 — Replace the inline swap editor with the edit dialog

- **Owner:** frontend-engineer
- **Goal:** The editor opens as a dialog (existing `Dialog` primitive, lazy loaded). It has a searchable White and Black select per board fed from `candidates` and the current seats, duplicate prevention, add and remove board, add and remove bye. Select-to-swap and swap colours stay as shortcuts.
- **Rationale:** TASK-085 specifies this dialog. Today the editor is an inline panel that only swaps seated players (`RoundsView.tsx` 206-229, `EditPairings.tsx`).
- **Dependencies:** TASK-003, TASK-005
- **Affected Files:**
  - `web/src/features/event-control/pairings/EditPairings.tsx` (rewrite as dialog body)
  - `web/src/features/event-control/pairings/RoundsView.tsx` (open state at 54-55, 91, 206-214; remove inline branch at 206-229)
  - `web/src/features/event-control/pairings/pairings-logic.ts` (pure helpers: candidate filter, duplicate check, add and remove board, bye move)
  - `web/src/features/event-control/pairings/pairings-logic.test.ts` (extend existing file only)
  - `web/src/components/ui/overlay/` (reuse `Dialog` and `ConfirmDialog`; check for a searchable select or combobox before building one)
- **Implementation Notes:**
  - Focus trap and restore per AC-6 (use the existing `Dialog`).
  - Locked boards (result present) stay read-only, as now.
  - Keep the `buildEditInput` contract (phase, version, boards, byes, reason).
  - Keep the `dynamic` import so the first chunk stays small.
- **Acceptance Criteria:**
  - [ ] Opening the editor shows a dialog; closing restores focus to the trigger.
  - [ ] White and Black selects search candidates and seated players; a player already on another board is not offered as a duplicate.
  - [ ] Add and remove board works; the saved payload matches `editPairingsSchema`.
  - [ ] Locked boards cannot change.
  - [ ] Existing `pairings-logic.test.ts` cases still pass; new pure helpers are covered in that file.
- **Tests Required:** extend `pairings-logic.test.ts` only. No new test files.
- **Risk:** high (largest change; touches the most consequential screen)
- **Status:** pending

### TASK-007 — Rematch warning, version copy and failure handling in the edit dialog

- **Owner:** frontend-engineer
- **Goal:** Before save, rematches are listed as a warning (save still allowed). Published-round copy says "This creates version N+1 and notifies the affected players", where N is the current round `version`. Failure keeps the entered values.
- **Rationale:** AC-3 and AC-7 in TASK-085. Current copy says "a new version" with no number (`EditPairings.tsx` 145). Current code already keeps values on error, so this is a check, not a rebuild.
- **Dependencies:** TASK-002, TASK-006
- **Affected Files:**
  - `web/src/features/event-control/pairings/EditPairings.tsx` (copy line 145, failure handling 83-90)
  - `web/src/features/event-control/pairings/pairings-logic.ts` (rematch list helper)
  - `web/src/features/event-control/pairings/pairings-logic.test.ts` (extend)
- **Implementation Notes:**
  - Use the round `version` from the DTO for N. Do not hard-code "2".
  - The success toast must not claim notification unless TASK-001 is live.
- **Acceptance Criteria:**
  - [ ] A board whose pair has `rematch: true` is listed before save as "already played".
  - [ ] Published-round dialog shows the version copy with the computed number and requires a reason.
  - [ ] A save failure shows the error and keeps every board and the reason.
- **Tests Required:** extend `pairings-logic.test.ts` only.
- **Risk:** medium
- **Status:** pending

### TASK-008 — Round header: versions, progress and blocker breakdown

- **Owner:** frontend-engineer
- **Goal:** Round header shows round version and pairing version as text. Live state shows "N of M results final". Disabled finalise lists blockers with a link to the disputed queue.
- **Rationale:** TASK-085 "Results review" and AC-1 states. Today only "N results still open" appears (`RoundsView.tsx` 144-151) and blockers are one server sentence (`RoundActions.tsx` 20-21).
- **Dependencies:** TASK-004, TASK-005
- **Affected Files:**
  - `web/src/features/event-control/pairings/RoundsView.tsx` (header 103-125, banner 142-153)
  - `web/src/features/event-control/pairings/RoundActions.tsx` (`reasonOf` 20-21, finalise 84-115)
- **Implementation Notes:**
  - "M" is the count of games (`gamesOf`, `pairings-logic.ts` 196-198).
  - Link to `#dispute-queue` (existing heading id at `RoundsView.tsx` 176).
- **Acceptance Criteria:**
  - [ ] Header shows "Round version N, pairing version M" as text.
  - [ ] Live banner reads "N of M results final".
  - [ ] Disabled finalise shows the blocker sentence from TASK-004 and a link when disputes exist.
- **Tests Required:** extend `pairings-logic.test.ts` only if a pure helper is added.
- **Risk:** low
- **Status:** pending

### TASK-009 — Publish and finalise confirmations name their effect

- **Owner:** frontend-engineer
- **Goal:** Publish confirmation lists round number, board count, bye count and whether email notifications are on. Finalise confirmation says "This processes ratings for N players once. It cannot be repeated." where N is the distinct non-bye players, and says no ratings change for unrated events.
- **Rationale:** TASK-085 "Publish confirmation" and "Finalise confirmation". Current consequence text is static (`RoundActions.tsx` 47, 93).
- **Dependencies:** TASK-001, TASK-005
- **Affected Files:**
  - `web/src/features/event-control/pairings/RoundActions.tsx` (consequence props 47 and 93, children for the list)
  - `web/src/features/event-control/pairings/pairings-logic.ts` (count helper)
  - Notification status: existing admin settings read in `web/src/lib/api/adapters/real-admin.ts` (do not add an endpoint). If the settings read is not on this tab, use the overview data and record which source was used.
- **Implementation Notes:**
  - Focus starts on Cancel (`ConfirmDialog` behaviour; verify, do not change).
- **Acceptance Criteria:**
  - [ ] Publish dialog lists boards, byes and notification status as text.
  - [ ] Finalise dialog shows the N-player sentence for a rated event and the not-rated sentence otherwise.
  - [ ] Focus starts on Cancel.
- **Tests Required:** extend `pairings-logic.test.ts` only if a count helper is added.
- **Risk:** low
- **Status:** pending

### TASK-010 — Mobile layout: sticky action bar, round strip, bottom sheets

- **Owner:** frontend-engineer
- **Goal:** Under 720px, the round selector is a horizontal scroll-snap strip with the current round in view. Generate draft and Publish sit in a sticky bottom bar with safe-area padding that does not cover content. Dialogs become bottom sheets.
- **Rationale:** TASK-085 "Mobile" and AC-4 at 320 and 390. None of these exist (grep).
- **Dependencies:** TASK-006, TASK-008
- **Affected Files:**
  - `web/src/features/event-control/pairings/RoundsView.tsx` (selector 104-115, action slot 121-124)
  - `web/src/features/event-control/pairings/RoundActions.tsx` (move Publish and Start into the bar on mobile)
  - `web/src/features/event-control/pairings/GenerateAction.tsx`
  - `web/src/components/ui/overlay/` (Dialog sheet variant under 720px, reuse if present)
- **Implementation Notes:**
  - The board list stacks under 720px through `ResponsiveTable` (already present, `ResponsiveTable.tsx` 44-52).
  - Buttons at least 44px.
  - Verify no horizontal scroll at 320 and 390 by reading the classes; runtime check is the owner's build step.
- **Acceptance Criteria:**
  - [ ] Round selector is a scroll-snap strip under 720px.
  - [ ] Sticky bar has safe-area padding and the table bottom is not hidden behind it.
  - [ ] Dialogs are bottom sheets under 720px with focus trap kept.
- **Tests Required:** none new.
- **Risk:** medium (layout only; owner verifies on device)
- **Status:** pending

### TASK-011 — Memoise pairing rows and stabilise row callbacks

- **Owner:** frontend-engineer
- **Goal:** Pairing rows and row actions do not re-render when an unrelated row changes.
- **Rationale:** AC-5 (render count) and the note "Rows are React.memo with stable props". No memo exists in the pairings folder; `RoundsView.tsx` 97-99 recreates `renderActions` each render.
- **Dependencies:** TASK-010
- **Affected Files:**
  - `web/src/features/event-control/pairings/RoundsView.tsx` (`renderActions` 97-99, `refresh` 60-63)
  - `web/src/features/event-control/pairings/PairingRowActions.tsx` (wrap in `memo`)
  - `web/src/features/event-control/pairings/pairings-columns.tsx` (column array already module-level)
- **Implementation Notes:**
  - Use `useCallback` for `refresh` and `renderActions`, with `round.id` and `eventId` as dependencies.
  - Do not add a render-count test (owner deferred tests). Verify by code review.
- **Acceptance Criteria:**
  - [ ] `PairingRowActions` is memoised with stable props.
  - [ ] `renderActions` and `refresh` are stable across renders when the round id is unchanged.
  - [ ] Typecheck and lint pass.
- **Tests Required:** none new.
- **Risk:** low
- **Status:** pending

---

## 4. Critical Path

TASK-003 → TASK-005 → TASK-006 → TASK-007 → TASK-010 → TASK-011

## 5. Parallel Groups

| Group | Tasks | Notes |
|-------|-------|-------|
| Backend A | TASK-001, TASK-002, TASK-003, TASK-004 | No task depends on another. All but TASK-001 edit `round_service.py`, so run them in one session or serially to avoid conflicts |
| Frontend A | TASK-005 | After all backend tasks |
| Frontend B | TASK-006 and TASK-009 | TASK-009 touches `RoundActions.tsx`; TASK-006 touches `EditPairings.tsx` and `RoundsView.tsx`. Can run in parallel |
| Frontend C | TASK-007 and TASK-008 | Both touch `RoundsView.tsx`/`EditPairings.tsx` area; run after TASK-006, not in parallel with it |
| Frontend D | TASK-010 → TASK-011 | Serial (both edit `RoundsView.tsx`) |

## 6. Stage order

1. Backend: TASK-001 to TASK-004.
2. Frontend: TASK-005, then TASK-006 and TASK-009 in parallel, then TASK-007 and TASK-008, then TASK-010 and TASK-011.
3. Agents run typecheck and lint only. The owner runs the single build per batch (standing rule).

## 7. Risks and open decisions

- **Notification recipients (TASK-001):** whether byes are notified on publish. Decide in implementation and state it in the response.
- **Rematch behaviour (TASK-002, TASK-007):** warn only, as TASK-085 says. Blocking would need owner approval.
- **Notification channel source (TASK-009):** settings read vs overview. Use the one already on the tab; do not add an endpoint.
- **Backend untested:** C06 to C12 have never been exercised against a database in this repo. Tests are deferred by owner, so the first real run will be the owner's manual check.
- **Out of scope:** check-in tab changes and the "check in all" button are not replanned here.

## 8. Rollout

- `feature_flag: false`
- `migration: false` (no schema change; only response fields are added)
- `rollback`: revert the frontend change; the added backend response fields are additive and can stay.
