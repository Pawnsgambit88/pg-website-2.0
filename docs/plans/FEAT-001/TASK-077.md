---
id: TASK-077
type: task
feature_id: FEAT-001
plan_id: PLAN-001
title: Event Builder framework (8 steps, split state, deferred preview, mobile one-step mode)
owner: frontend-engineer
status: pending
priority: high
estimate: L
dependencies: [TASK-020, TASK-027, TASK-029, TASK-030, TASK-034, TASK-069]
affected_files:
  - web/src/app/(admin)/admin/events/new/page.tsx
  - web/src/app/(admin)/admin/events/[id]/edit/page.tsx
  - web/src/features/event-builder/BuilderFrame.tsx
  - web/src/features/event-builder/useBuilderForm.ts
  - web/src/features/event-builder/steps.ts
  - web/src/features/event-builder/PreviewPanel.tsx
  - web/src/features/event-builder/PreviewSheet.tsx
  - web/src/features/event-builder/StepFooter.tsx
goal: The container that makes the 8-step builder usable on a desktop (steps, editor, public preview) and on a 320px phone (one step at a time, explicit preview) without whole-form re-renders.
context: Reference screens 38-45 and docs/COMPONENT-CATALOG.md (8 sequential steps with persistent public preview), docs/RESPONSIVE-BEHAVIOR.md (Event Builder). Admin area is client-rendered behind auth and noindex. The new backend must provide draft persistence, an event slug unique and immutable once published, and the full event configuration; the PgApi interface and mocks define that contract. Builder editing at /admin/events/[id]/edit reuses this framework (Q6 default, user can veto). Product features: docs/requirements/FEAT-000-feature-inventory.md (pending).
implementation_notes:
  - "Steps in steps.ts as {id, label, schema, component (next/dynamic), relevantFor(eventType)}: 1 Basics, 2 Experience, 3 Registration, 4 Payment, 5 Game system, 6 Media, 7 Communications, 8 Review. Experience deliberately precedes mechanics."
  - "One BuilderDraft model with a zod schema composed from per-step schemas. Storage (vanilla store with useSyncExternalStore slices, or react-hook-form with scoped useWatch) is chosen in ARCH-001; this task implements it behind useBuilderField(path) and useBuilderSelector(selector). No component outside the active step subscribes to the whole draft."
  - "Draft autosave debounced 2 s off the render path plus explicit Save draft; save status is its own small subscriber. Versioned session backup pg:builder-draft:v1:<id> (try/catch, event content only) restores after a crash or reload."
  - "Changing event type updates relevantFor; fields for hidden mechanics stay in the draft but are excluded from validation and the publish payload, so switching back loses nothing."
  - "Money is integer paise; dates are ISO with the Asia/Kolkata offset; native pickers with 16px inputs."
  - "Layout: at 1200px and above steps column, editor and persistent preview; 720-1199px compact horizontal stepper with the preview below; under 720px 'Step n of 8' header with a step menu sheet, exactly one step, and an explicit Preview button opening a full-screen PreviewSheet. Sticky footer (Back, Continue, Save draft in a menu) respects the safe area, stays above the on-screen keyboard (visual viewport) and never covers the focused field."
  - "Continue validates the current step only and focuses the first invalid field; forward jumps only to visited steps or steps with valid predecessors; Review lists all issues as deep links."
  - "Preview renders the same public components used by the live site (EventCard and the event head from TASK-043) in a non-interactive preview mode labelled 'Preview. Not published.' Desktop and tablet update through useDeferredValue; the mobile sheet mounts only when opened."
  - "Each step component and PreviewSheet are loaded with next/dynamic; when step N becomes valid, step N+1 is preloaded (bundle-preload). Public components imported by the preview must not pull server-only modules; keep them pure presentational."
  - "Re-render budget: typing one character re-renders that field, the save-status indicator at most once per debounce, and the preview (deferred); not other steps, the stepper or sibling fields."
acceptance_criteria:
  - {id: AC-1, description: "DoD-S states: empty draft, loading an existing draft, validation errors per step, saving, saved, save failure with changes kept, ready to publish, publishing."}
  - {id: AC-2, description: "At 390 and 320 exactly one step is visible; preview is reachable only through an explicit control and opens as a full-screen sheet; the form is never squeezed into a narrow column."}
  - {id: AC-3, description: "At 768 the stepper is compact with the preview below; at 1440 three columns; no horizontal scroll at 1280 and 1024."}
  - {id: AC-4, description: "Preview uses the same public components as the live site (imported, not copied) and matches the public event page for the same data (snapshot comparison)."}
  - {id: AC-5, description: "Changing event type hides irrelevant mechanics without discarding entered values (switch away and back test)."}
  - {id: AC-6, description: "Render-count test: typing in one field does not re-render other steps, sibling fields or the stepper; typing stays responsive under 4x CPU throttle."}
  - {id: AC-7, description: "A draft survives an accidental reload (session backup) and the unsaved-changes guard blocks navigation when dirty."}
  - {id: AC-8, description: "The sticky footer is never obscured by the iOS keyboard or overlapping the focused input (WebKit test at 390x844)."}
  - {id: AC-9, description: "Keyboard operable; focus moves to the step heading on step change and announces 'Step n of 8'."}
  - {id: AC-10, description: "Step chunks, the preview sheet and the media editor load on demand; the builder entry chunk stays within the admin route budget."}
tests_required:
  - {type: unit, description: "Step relevance by event type, validity derivation, draft backup and restore, money handling."}
  - {type: integration, description: "Step flow, per-step validation, issue deep links, preview mapping."}
  - {type: e2e, description: "Builder at 390, 768 and 1440 (full journey in TASK-095)."}
  - {type: e2e, description: "Render-count and responsiveness test with profiler."}
risk: high
blockers: ["Draft persistence and slug rules depend on the new backend contract (out of scope)."]
verification:
  commands: ["npm run check", "npm run test:e2e -- builder"]
  result: not_run
---

# TASK-077 Event Builder framework (long form)

Estimate L. Standards: DoD-S, DoD-G, DoD-R (react-best-practices: `rerender-defer-reads`, `rerender-derived-state`, `rerender-use-deferred-value`, `rerender-split-combined-hooks`, `bundle-dynamic-imports`, `bundle-preload`).

Acceptance criteria, tests and implementation notes are in the schema-form front matter. The preview must never become a third squeezed column on a phone: it is an action, not a layout region.
