import 'server-only'

// Constants of the revalidation contract (ARCH-001-isr-revalidation sections 3 and 5). Backend side:
// backend/content/revalidation.py sends the same header names.

export const MAX_BODY_BYTES = 16 * 1024
/** Accepted if `now - 300 s <= timestamp <= now + 60 s`. */
export const MAX_PAST_SKEW_SECONDS = 300
export const MAX_FUTURE_SKEW_SECONDS = 60
/** A repeated event id inside this window is a duplicate (202, no effect). */
export const DUPLICATE_WINDOW_MS = 10 * 60 * 1000
export const MAX_REMEMBERED_EVENTS = 1000

export const HEADER_TIMESTAMP = 'x-pg-timestamp'
export const HEADER_EVENT_ID = 'x-pg-event-id'
export const HEADER_SIGNATURE = 'x-pg-signature'
