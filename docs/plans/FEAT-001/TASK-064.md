---
id: TASK-064
type: task
feature_id: FEAT-001
plan_id: PLAN-001
title: Event Room pairing pending and live round with result submission
owner: frontend-engineer
status: pending
priority: critical
estimate: L
parallel_group: G12
dependencies: [TASK-029, TASK-034, TASK-062]
affected_files:
  - web/src/features/event-room/PairingPending.tsx
  - web/src/features/event-room/LiveRound.tsx
  - web/src/features/event-room/SubmitResultSheet.tsx
  - web/src/features/event-room/PairingIssue.tsx
goal: The screen a player uses at a physical event, on a phone, under time pressure. Board, opponent, colour, time control and the result action are visible at a glance at 390px and 320px.
context: Reference screens 26 (pairing pending) and 27 (live). Mobile is the priority condition (docs/RESPONSIVE-BEHAVIOR.md). Client-rendered in the (app) group. Who may submit results is open question Q13. The backend contract for player result submission is part of the PgApi interface; mock-backed until the new backend exists. Product features are listed in docs/requirements/FEAT-000-feature-inventory.md (pending).
implementation_notes:
  - "Layout contract in the first viewport at 390x844 and 320x568 under the compact top bar: event title and status badge on one line; live-game panel with eyebrow 'YOUR NEXT GAME' and 'Round 3 . 10+3'; board number in mono at least 72px; opponent card with avatar, colour word WHITE or BLACK, name (two lines max) and rating; own colour stated in text ('You are Black'); primary 'Submit result' (copper, 48px, full width) and secondary 'Pairing issue?' (44px target). Standings and history follow below."
  - "Below 480px board block and opponent card stack; from 480px they sit side by side. Panel padding reduces from 24px to 16px at 480px and below. Landscape phones (568x320) keep the action reachable and switch the panel to two columns."
  - "States: pairing_pending (calm 'You're checked in. We're finding the game.' with last-updated and manual refresh); live; bye (no result action); result_submitting; result_submitted (awaiting confirmation); result_confirmed; result_disputed (neutral text, host contacted, 'Message event desk'); submit_failed (domain copy, value preserved, retry); pairing_issue sheet (wrong opponent, opponent missing, other)."
  - "SubmitResultSheet is a bottom sheet under 720px and a dialog above: three large choices 'I won', 'Draw', 'I lost' (at least 56px), the exact outcome stated in plain text before a single explicit confirm tap, focus trap, Escape, focus return, safe-area padding. It is loaded with next/dynamic and preloaded on pointer or focus intent over 'Submit result' (bundle-dynamic-imports, bundle-preload)."
  - "LiveRound is presentational and fed by useEventRoom slices selected with select (board, opponent, colour, timeControl, resultStatus) so a poll that changes only standings does not re-render it."
  - "Standings and history below the fold use the cv-auto utility and memoised rows (rendering-content-visibility, rerender-memo)."
  - "Colour is never conveyed by swatch alone: text WHITE or BLACK plus an icon with an accessible name. Board number and rating use Fragment Mono with tabular numerals."
  - "Transition announcement comes from TASK-062 only; do not add a second live region."
acceptance_criteria:
  - {id: AC-1, description: "At 390x844 and 320x568, board, opponent, colour, time control and the result action are fully visible without scrolling (Playwright bounding-box assertions); at 200% text zoom the action remains reachable by scroll."}
  - {id: AC-2, description: "No horizontal scroll at 320 and 390; all targets at least 44px and the primary action 48px."}
  - {id: AC-3, description: "Result submission never claims success before the server confirms; pending, confirmed, failed and disputed states are distinct and tested."}
  - {id: AC-4, description: "Opponent colour and own colour are in text; screen reader reading order is board, opponent, colour, time control, action."}
  - {id: AC-5, description: "The sheet traps focus, returns focus to its trigger, closes with Escape and a visible Close, and a mistaken tap is recoverable through the confirm step."}
  - {id: AC-6, description: "A poll that changes only standings causes no re-render of LiveRound (render-count test)."}
  - {id: AC-7, description: "Reduced motion removes sheet slide and any pulse on state change."}
  - {id: AC-8, description: "Fidelity to screens 26 and 27 at 1440 inside the player shell."}
  - {id: AC-9, description: "The result sheet chunk is not requested until the player shows intent or opens it (network assertion)."}
tests_required:
  - {type: integration, description: "Every state in the list including bye and long-name fixtures."}
  - {type: e2e, description: "390 and 320 fold test, failed-submission scenario, sheet keyboard test, landscape spot-check (TASK-096)."}
  - {type: manual, description: "VoiceOver pass on the live state (TASK-097)."}
risk: high
blockers: ["Player result-submission contract pending Q13 and the new backend plan."]
verification:
  commands: ["npm run check", "npm run test:e2e -- event-room"]
  result: not_run
---

# TASK-064 Pairing pending and live round (long form)

Estimate L. Standards: DoD-S, DoD-G, DoD-R (react-best-practices: `rendering-content-visibility`, `bundle-dynamic-imports`, `rerender-memo`, `rerender-derived-state`).

Acceptance criteria, tests and layout contract are in the schema-form front matter. The first-viewport rule is the single most important requirement in this task: if any of the five essentials needs a scroll at 320x568, the layout is wrong, not the viewport.
