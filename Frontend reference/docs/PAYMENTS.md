# Payments

## Provider
Initial provider: Razorpay Standard Checkout.

## Secure flow

1. Authenticated player requests registration for event ID.
2. Server locks/checks event and computes capacity + server price.
3. Free event confirms without Razorpay.
4. Paid event creates a short registration hold and a server-side Razorpay order.
5. Browser opens Razorpay using public key + server order ID.
6. Browser returns order/payment/signature to verification function.
7. Server verifies signature and fetches payment from Razorpay.
8. Server validates provider order ID, exact amount, currency and acceptable status.
9. Server writes payment ledger and confirms registration.
10. Webhook provides asynchronous reconciliation/replay safety.

## Rules

- Never accept amount or user ID as authoritative browser input.
- Razorpay secret and webhook secret live only in backend secrets.
- Webhooks verify the raw body.
- Every provider event has a deduplication key.
- Refunds update both payment and registration state, never only one.
- Admin UI shows mismatches instead of silently fixing them.
