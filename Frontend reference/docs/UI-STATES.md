# UI State Contract

A production flow is incomplete until these states are implemented. Visual examples are available at `/handoff/states`.

## Universal async states

### Loading
- Prefer skeletons when final layout is known.
- Do not block the whole page for one secondary request.
- Preserve previous data during background refresh where safe.

### Empty
- State what is absent.
- Explain whether this is normal.
- Give the next useful action if one exists.

### Error
- Identify the failed action, not a generic “something went wrong”.
- Preserve entered user data and intent.
- Provide retry when retry is safe.
- Never expose provider secrets/internal stack traces.

### Disabled
- Use only when the user can understand why; pair with visible explanatory text for important actions.

## Authentication

- Google redirect in progress
- OAuth callback success/failure
- invalid email/password
- new account requiring email confirmation where configured
- reset requested neutral response
- session expired while holding an event intent: return to login and restore route afterward

## Event registration

- open/free → immediate server confirmation
- open/paid → capacity hold created, countdown/expiry context, provider payment action
- full + waitlist enabled → join waitlist; no payment taken
- full + waitlist disabled → sold out; show next relevant event
- registration closed → explain date/state
- already registered → take user to My Events/Event Room
- pending payment → retry/reconcile, never create duplicate paid registration
- payment captured but callback uncertain → “confirming payment”, poll/reconcile server state
- payment failed/cancelled → registration remains non-paid; retain intent
- refund pending/refunded → explicit ledger state

## Event attendance

- check-in not open
- check-in open
- checked in
- host/manual check-in required
- pairing pending
- pairing published
- result submitted/awaiting confirmation where configured
- between rounds
- event complete
- rating processing pending/complete

## Player ratings

- no games in a pool
- provisional/high RD explanation
- rating ledger loading/error
- no delta for unrated/social game
- processed round must never change twice

## CMS

- clean/published
- local dirty changes
- validation blocked
- save successful but not published
- publish successful
- conflict/version changed by another admin
- media missing alt text
- carousel with 0/1 item degrades to static without broken controls
- testimonial cannot publish without quote + photo + consent

## Admin operations

- no upcoming event
- registration capacity warning
- payment reconciliation mismatch
- pairing draft generated but unpublished
- round published
- round result incomplete
- finalise blocked until required results complete
- message send partially failed
- audit log unavailable must not block safe read-only operation but should prevent unverifiable sensitive mutation if policy requires

## Offline/poor network

Public pages may show cached content if implemented. Mutations must never claim success until server confirmation. Result, payment and admin mutations need explicit pending/success/failure feedback.
