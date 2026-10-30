---
id: TASK-085
type: task
feature_id: FEAT-001
plan_id: PLAN-001
title: Event Control Room pairings and rounds tab
owner: frontend-engineer
status: pending
priority: high
estimate: L
parallel_group: G16
dependencies: [TASK-029, TASK-031, TASK-082]
affected_files:
  - web/src/app/(admin)/admin/events/[id]/[tab]/page.tsx
  - web/src/features/event-control/Pairings.tsx
  - web/src/features/event-control/RoundSelector.tsx
  - web/src/features/event-control/PairingEditDialog.tsx
  - web/src/features/event-control/ResultsReview.tsx
  - web/src/features/event-control/FinaliseBar.tsx
goal: Let an admin generate, review, publish, correct and finalise rounds safely on desktop and on a phone, with every consequential action confirmed and every lifecycle state visible.
context: Reference screen 49 ("Round 3 is a draft until you publish it"). State machines from docs/STATE-MACHINES.md (Round draft, published, live, completed, void; Pairing result pending, submitted, disputed, final). The new backend must implement draft vs published rounds, versioned corrections with a reason, a result lifecycle and idempotent finalisation (ratings processed once); the PgApi interface and mocks are that contract. Admin area is client-rendered behind auth and noindex. Product features: docs/requirements/FEAT-000-feature-inventory.md (pending).
implementation_notes:
  - "Round lifecycle UI: none (create round or generate draft), draft ('Draft, players can't see this yet'; generate, edit, add or remove board, publish), published (view, correct with a mandatory reason as a new version, record results), live (results review, correct, finalise when allowed), completed (read-only, ratings-processed timestamp, cannot re-finalise), void (read-only with reason)."
  - "Board list: ResponsiveTable at 720px and up (Board, White, Rating, Black, Rating, Result, actions); under 720px each board is a card with board title, two player lines with colour words and ratings, result chip and Edit and Result buttons at least 44px. Rows are React.memo with stable props. Events with 60 or more boards use cv-auto with measured intrinsic height. A bye is a distinct row with no result action."
  - "Edit pairing dialog: choose White and Black from checked-in, unpaired players through a searchable select backed by a lookup map; prevents duplicates; flags rematches as a warning; swap colours shortcut; save shows pending, success or failure and keeps entered values on failure. On published rounds it requires a reason and states 'This creates version 2 and notifies the affected players.'"
  - "Results review: status chip with text (Pending, Submitted with who and when, Disputed, Final); progress 'N of M results final'; admin can enter or override a result after a confirmation naming the effect (audited). Finalise is disabled until every result is final and the disabled state names blockers with links ('2 results pending, 1 disputed', RESULTS_NOT_FINAL copy)."
  - "Finalise confirmation: 'This processes ratings for N players once. It cannot be repeated.' ROUND_ALREADY_FINALIZED renders the processed state, not an error."
  - "Publish confirmation repeats round number, boards, byes and the notification channel status from TASK-087; copper confirm button 48px; focus starts on Cancel."
  - "Mobile: round selector is a scroll-snap strip with the current round in view; Generate draft and Publish live in a sticky bottom action bar with safe-area padding; dialogs become bottom sheets under 720px."
  - "Edit dialog and results review load with next/dynamic on first use. Server Component route page passes only the event id and tab to client components."
acceptance_criteria:
  - {id: AC-1, description: "DoD-S states: no round, draft generated and unpublished, published, result incomplete, results disputed, finalise blocked, finalised/processed, void, generation failure (retry with draft preserved), loading and error."}
  - {id: AC-2, description: "Publish and finalise each require a confirmation naming consequences; finalise cannot be triggered twice and ROUND_ALREADY_FINALIZED shows the processed state."}
  - {id: AC-3, description: "Editing a pairing on a published round requires a reason and is presented as a new version."}
  - {id: AC-4, description: "At 320 and 390 the board list shows board number, both players, colour words, result status and the edit action with no horizontal scroll; the sticky bar does not cover content."}
  - {id: AC-5, description: "Editing one board re-renders only that board row (render-count test); an 80-board fixture scrolls without long tasks."}
  - {id: AC-6, description: "Status is communicated in text, not colour alone; dialogs trap and restore focus."}
  - {id: AC-7, description: "Duplicate-player and rematch conditions are detected and explained before save."}
  - {id: AC-8, description: "Fidelity to screen 49 at 1440."}
  - {id: AC-9, description: "Only the event id and tab string cross the server-to-client boundary on this route."}
tests_required:
  - {type: integration, description: "Each round state, edit dialog validations, finalise gating matrix."}
  - {type: e2e, description: "Draft to publish to results to finalise at 390 and 1440 (TASK-095)."}
  - {type: e2e, description: "Row render-count and 80-board performance fixture."}
  - {type: e2e, description: "Axe on every state and keyboard path through publish and finalise."}
risk: high
blockers: ["Round draft/publish/version/finalise semantics depend on the new backend contract (out of scope)."]
verification:
  commands: ["npm run check", "npm run test:e2e -- pairings"]
  result: not_run
---

# TASK-085 Pairings and rounds tab (long form)

Estimate L. Standards: DoD-S, DoD-G, DoD-R (react-best-practices: `rerender-memo`, `rendering-content-visibility`, `rerender-no-inline-components`, `bundle-dynamic-imports`).

Acceptance criteria, tests and implementation notes are in the schema-form front matter. This is the most consequential admin screen: publishing notifies players and finalising changes ratings exactly once, so every irreversible action is gated by a confirmation that names its effect.
