# Backend Contract

## Rule of ownership

The browser may express intent. The server derives authoritative facts.

The browser may send: `eventId`, requested action, submitted result, content edits.
The server derives: current user, role, event fee, membership discount, capacity, registration window, payment state, rating pool, round/event relationship and audit actor.

## Public reads

Use Supabase RLS-protected table queries for published events/media and `get_public_site_content('home')` for stable homepage copy contract.

## Privileged commands

### create-payment-order
Input: `{ eventId }` plus authenticated JWT and idempotency header.
Behavior:
1. `reserve_event_place()` atomically verifies registration window/capacity and returns server price.
2. Free event confirms immediately.
3. Full event returns waitlist.
4. Paid event creates a Razorpay order using server price and stores `payment_orders`.

### verify-payment
Input: Razorpay order/payment/signature only.
Server resolves order/user/event, verifies HMAC, fetches provider payment, validates order ID/amount/currency/status, writes payment and confirms registration.

### razorpay-webhook
Verify raw-body signature before JSON trust. Deduplicate provider event ID. Reconcile captured/refunded/failed state. Must be safe to replay.

### check-in
Authenticated player, event ID. Server verifies confirmed registration and time window.

### generate-pairings
Admin only. Server derives registered/check-in players, rating/score/opponent history and event pairing method. Creates unpublished draft round/pairings. Admin reviews, then publishes.

### finalize-round
Admin only. Requires all results final. Idempotent on `ratings_processed_at`. For rated events, calculates all players from the same pre-round snapshot, writes rating ledger, then updates current ratings.

### admin-set-role
Admin only; updates `user_roles` and Auth app metadata, with audit record.

### send-event-message
Admin only. Stores message/audience first, then delivery adapter processes it. Initial email provider can be Resend. WhatsApp/SMS integration must use an approved provider and explicit consent rules.

## Error codes

Use stable codes rather than raw Postgres messages in UI:
- AUTH_REQUIRED
- ADMIN_REQUIRED
- EVENT_NOT_FOUND
- REGISTRATION_NOT_OPEN
- REGISTRATION_CLOSED
- EVENT_FULL
- ALREADY_REGISTERED
- PAYMENT_REQUIRED
- PAYMENT_MISMATCH
- INVALID_SIGNATURE
- CHECKIN_WINDOW_CLOSED
- REGISTRATION_NOT_CONFIRMED
- ROUND_NOT_FOUND
- RESULTS_NOT_FINAL
- ROUND_ALREADY_FINALIZED

Map these to humane UX copy in the frontend.
