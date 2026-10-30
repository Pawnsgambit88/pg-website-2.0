# Event and Pairing Engine

## Event types

Event type is a configurable default, not a hard-coded product fork.

### Social chess
Default pairing: `social_balanced`. Goal: produce enjoyable games, not standings. Suggested cost function considers rating distance, recent rematches and optional player preference. Admin/host may override.

### Rated tournament
Default pairing: `swiss`. Round pairings use score, rating, rematch history and color balance. PG must not claim official FIDE pairing compliance unless an approved certified pairing solution is integrated and validated.

### League
Usually round-robin or schedule-based; standings persist across dates.

### Workshop
Pairings optional; registration/attendance is primary.

### Special
Allows theme nights and custom rules without changing the schema.

## Registration state

`pending` → `confirmed` or `waitlist` → `cancelled/refunded`.

Paid registration creates a short capacity hold. Expired holds stop counting toward capacity and can be cleaned by scheduled job. Never take money after capacity is unavailable unless the event explicitly supports overbooking.

## Round lifecycle

`draft` → `published` → `live` → `completed`.

Pairings are versioned conceptually. Once published, edits require an explicit admin correction/audit event rather than silent regeneration.

## Result lifecycle

`pending` → `submitted` → `confirmed/final`, with `disputed` available. Ratings only use `final` results.

## Rating finalisation

Calculate every player's new Glicko-2 result from the same pre-round snapshot. Write rating transactions before replacing current rating values. `ratings_processed_at` is the idempotency gate.

## First-timer hospitality

Events should expose an admin list of first-time attendees before doors open. This is not decoration: it is an operational queue for hosts to welcome and place people quickly.
