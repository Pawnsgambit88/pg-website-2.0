---
id: TASK-057
type: task
feature_id: FEAT-001
plan_id: PLAN-001
title: Registration paid flow and lazily loaded Razorpay checkout hook
owner: frontend-engineer
status: pending
priority: critical
estimate: L
parallel_group: G10
dependencies: [TASK-015, TASK-022, TASK-055]
affected_files:
  - web/src/features/registration/PaidPanel.tsx
  - web/src/features/registration/useRazorpayCheckout.ts
  - web/src/features/registration/HoldCountdown.tsx
  - web/src/features/registration/ConfirmingPayment.tsx
goal: A paid registration that never trusts the browser, loads Razorpay only when the player signals payment intent, and recovers from every failure without creating duplicate registrations.
context: Reference screen 18. Route /events/[slug]/register lives in the (auth) route group and is client-rendered and noindex. The new backend must satisfy the registration and payment contract in the PgApi interface (create order with server price and hold, verify, webhook reconciliation, idempotency); until it exists the flow runs on the mock adapter. See docs/requirements/FEAT-000-feature-inventory.md (pending, referenced by path) for the product feature list the backend contract is derived from.
implementation_notes:
  - "Server Component page shell for /events/[slug]/register passes only the slug string to client components (server-serialization). All payment logic is in client components."
  - "Flow: show server-provided price and availability; on 'Continue to secure payment' run createOrder(eventId, idempotencyKey) which returns orderId, amount in paise, currency, keyId and optional holdExpiresAt, or a domain error (EVENT_FULL leads to the waitlist view, ALREADY_REGISTERED, REGISTRATION_CLOSED)."
  - "useRazorpayCheckout loads https://checkout.razorpay.com/v1/checkout.js on demand with a single-flight promise and 10 s timeout, then opens checkout with only server-supplied values. Do not use a layout-level next/script; the script must not be requested before the user is on this panel and signals intent (pointerenter, focus or press on the payment button)."
  - "The paid panel itself is loaded with next/dynamic so free-event users never download it (bundle-dynamic-imports)."
  - "preconnect to the checkout origin (react-dom preconnect) is issued only while this panel is mounted."
  - "On success callback send order, payment id and signature to verifyPayment; show 'Confirming your payment' until the canonical registration status read from the server is confirmed."
  - "Uncertain verification (network drop, timeout, 5xx) keeps the confirming state and polls registration status with usePolling (backoff, cap 2 minutes), then shows a calm 'still confirming' state linking to My events."
  - "Dismissed checkout or failure leaves the registration non-paid; retry reuses the pending registration and the same idempotency key; never create a second registration."
  - "Hold countdown: exact expiry as static text plus a ref-driven once-per-second display; assistive-tech announcements only at 5 minutes, 1 minute and expiry; on expiry disable payment and offer to re-reserve."
  - "Security: amount, currency and key come only from the create-order response; reject non-INR or mismatched amount with a visible error and do not open checkout; payment identifiers live in memory only and are never logged or persisted; Razorpay prefill uses name and email only."
acceptance_criteria:
  - {id: AC-1, description: "DoD-S states are reachable by mock scenario: ready, creating order, checkout open, verifying, confirming (polling), failed, cancelled, hold expired, event filled during hold (becomes waitlist or sold out with no payment taken), success, script load failure."}
  - {id: AC-2, description: "No code path marks a registration paid from browser state; success UI appears only after the server reports confirmed."}
  - {id: AC-3, description: "Double-clicking 'Continue to secure payment' creates exactly one order (mutation de-duplicated and button disabled)."}
  - {id: AC-4, description: "Closing the checkout and retrying reuses the same pending registration; My events never shows two entries for one event."}
  - {id: AC-5, description: "The Razorpay script is requested only after the user is on this panel and signals payment intent; never on Home, Play, Event detail, Login or Dashboard (network assertion)."}
  - {id: AC-6, description: "Hold countdown is accessible: static expiry text, polite announcements at thresholds only, correct under reduced motion."}
  - {id: AC-7, description: "Price line, hold notice and primary action are visible at 390x844 and 320x568 without horizontal scroll; primary button 48px; any sticky action respects the safe area."}
  - {id: AC-8, description: "The paid panel chunk is not requested for free events (network assertion)."}
  - {id: AC-9, description: "Props crossing the server-to-client boundary on this route are limited to the slug and primitive display fields."}
tests_required:
  - {type: unit, description: "useRazorpayCheckout with a fake global: open, dismiss, fail, load timeout; idempotency key reuse; amount and currency guard."}
  - {type: integration, description: "Component tests for every panel state; countdown thresholds with fake timers."}
  - {type: e2e, description: "TASK-059 scenarios: abandonment, duplicate verification, captured-then-browser-closed reconcile, event fills during hold; network assertion that no other route requests the Razorpay script."}
  - {type: security, description: "No payment identifiers in storage, URLs or logs."}
  - {type: manual, description: "Razorpay test-mode transaction once the new backend contract is available; blocked until then."}
risk: high
blockers: ["Live verification needs the new backend (out of scope); mock adapter used until then."]
verification:
  commands: ["npm run check", "npm run test:e2e -- registration"]
  result: not_run
---

# TASK-057 Paid flow and Razorpay hook (long form)

Estimate L. Standards: DoD-S, DoD-G, DoD-R (react-best-practices: `bundle-defer-third-party`, `rendering-script-defer-async`, `bundle-dynamic-imports`, `server-serialization`).

Acceptance criteria, tests and implementation notes are in the schema-form front matter. The sequence below is the reasoning behind them.

1. The browser expresses intent only (event id, idempotency key). The server derives price, capacity, hold and payment state.
2. The checkout script is third-party code on the critical money path. Loading it lazily keeps it off every other route, and handling its load failure as a normal UI state keeps a blocked script from stranding a player.
3. Webhook reconciliation is the safety net for "paid but browser closed". The UI must therefore treat "unknown" as a first-class state and poll the server rather than guess.
