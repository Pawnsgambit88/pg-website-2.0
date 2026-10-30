---
id: TASK-062
type: task
feature_id: FEAT-001
plan_id: PLAN-001
title: Event Room data layer, state derivation and deduplicated polling
owner: frontend-engineer
status: pending
priority: high
estimate: L
parallel_group: G11
dependencies: [TASK-015, TASK-019, TASK-028, TASK-037]
affected_files:
  - web/src/app/(app)/app/events/[id]/page.tsx
  - web/src/features/event-room/useEventRoom.ts
  - web/src/features/event-room/deriveRoomState.ts
  - web/src/features/event-room/RoomFrame.tsx
goal: A single, deduplicated source of truth for the player's event-day state, derived by a pure function, updated by visibility-aware polling with a manual refresh fallback.
context: Reference screens 24-29 share one route (/app/events/[id]) in the (app) group, which is client-rendered behind auth and noindex. The new backend must expose one event-room snapshot (contract in the PgApi interface); until then the mock adapter provides it. FEAT-000 (docs/requirements/FEAT-000-feature-inventory.md, pending) is the product feature source. Polling vs realtime was left to the frontend by docs/FRONTEND-BACKEND-INTEGRATION.md and polling was approved (P6); realtime may replace it behind the same hook later.
implementation_notes:
  - "The route page is a thin Server Component that passes only the id string to a 'use client' RoomFrame (server-serialization). No data is fetched on the server for this route because it is per-user and behind client-held tokens."
  - "deriveRoomState(snapshot, serverNow) is a pure function returning state: before_checkin, checkin_open, checked_in_waiting, pairing_pending, live, between_rounds, complete, plus modifiers hostCheckinRequired, resultSubmitted, resultDisputed, ratingProcessing (none, pending, complete), unrated, offline. Draft rounds are never visible; only published or later count."
  - "Screen mapping: 24 before_checkin; 25 checkin_open; 26 checked_in_waiting and pairing_pending; 27 live; 28 between_rounds; 29 complete."
  - "Only server timestamps decide 'check-in open'. The snapshot carries serverNow so client clock skew is corrected; the client clock only ticks display countdowns."
  - "One query key ['event-room', eventId] feeds every consumer; polling is TanStack Query refetchInterval via usePolling: 15 s default, 5 s in pairing_pending and between_rounds, 60 s in before_checkin and complete; paused in hidden tabs; refetch on focus and reconnect; exponential backoff to 60 s on error."
  - "Consumers subscribe through select to the smallest slice so unchanged slices do not re-render (rerender-derived-state); structural sharing keeps identical poll results referentially equal."
  - "Non-user-initiated changes (published pairing, round change) are applied inside startTransition so an open result sheet or scroll is not interrupted (rerender-transitions)."
  - "Manual refresh button (44px) calls refetch and shows 'Updated 12:41' using server time. Offline: banner with last update time; last snapshot kept; mutations disabled with explanation, not queued."
  - "A single live region announces only on a change of state, once, for example 'Your pairing is ready: board 7, you are White.'"
  - "Mutations checkIn(eventId) and submitResult(pairingId, result) update the cache only after server success and surface domain errors (CHECKIN_WINDOW_CLOSED, REGISTRATION_NOT_CONFIRMED, dispute). No optimistic success."
  - "Mock rule: the browser mock keeps room state in a client-side store reset on reload; no mutable module-level state is shared with server rendering (server-no-shared-module-state)."
acceptance_criteria:
  - {id: AC-1, description: "deriveRoomState has an exhaustive table test covering every state and modifier combination, including check-in window boundaries, unconfirmed registration, draft vs published round, result awaiting confirmation, disputed result, unrated event, rating pending, and complete without rating change."}
  - {id: AC-2, description: "Three components using the room cause exactly one network request per polling interval (request counter test)."}
  - {id: AC-3, description: "A poll returning identical data causes zero re-renders of room components (render-count test)."}
  - {id: AC-4, description: "A published pairing appears within one polling interval without manual refresh and the announcement fires once."}
  - {id: AC-5, description: "A hidden tab pauses polling; returning to the tab refetches immediately."}
  - {id: AC-6, description: "Loading, error and offline states keep the last known snapshot visible with a clear status line."}
  - {id: AC-7, description: "With a client clock 10 minutes off, check-in state still follows server time."}
  - {id: AC-8, description: "Manual refresh works while error backoff is waiting."}
  - {id: AC-9, description: "Only the event id crosses the server-to-client boundary on this route."}
tests_required:
  - {type: unit, description: "Derivation table; clock skew; backoff and interval selection with fake timers."}
  - {type: integration, description: "RoomFrame states, offline banner, manual refresh, live-region announcement count; scenario switcher walks all states in order."}
  - {type: e2e, description: "Render-count profiler assertions and request-per-interval assertion in the player journey (TASK-094)."}
risk: high
blockers: ["New backend event-room snapshot endpoint does not exist; mock adapter used until the new backend plan delivers it."]
verification:
  commands: ["npm run check"]
  result: not_run
---

# TASK-062 Event Room data layer (long form)

Estimate L. Standards: DoD-S, DoD-G, DoD-R (react-best-practices: `client-swr-dedup` via TanStack Query, `rerender-derived-state`, `rerender-transitions`, `async-parallel`, `server-serialization`, `server-no-shared-module-state`).

Acceptance criteria, tests and notes are in the schema-form front matter. Design intent: players at a venue are on poor networks and in a hurry, so the hook favours showing the last known state calmly over spinners, never requires a manual refresh to learn status, and announces a change once.
