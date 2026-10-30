import type { ApiError } from '@/lib/api/errors'
import type { AvailabilityDto } from '@/lib/api/types/event-state'
import type { Slug } from '@/lib/api/types/primitives'
import type { ReserveInput } from '@/lib/api/types/registration'
import { copyFor } from '@/lib/api/error-copy'

// Free-registration logic (EV-02 / FE-06; screens 19 and 21). Pure: the component only wires it to React.
// The server owns eligibility, capacity and the price, so the request carries intent only (the event slug); R01 has
// already said the event is free before this runs.

/** R02 body for a free event: intent only, no price, amount or currency (AC-35). */
export function reserveFreeInput(slug: Slug): ReserveInput {
  return { eventSlug: slug }
}

/**
 * What the screen does after a failed confirm.
 *  settled   the player already has a place: the server state is the truth, so show it (no error)
 *  moved     the event changed under the player (full, closed, not open, profile): re-read R01 and let the resolver pick
 *            the right screen; the message explains why the screen changed
 *  retry     nothing is known to have changed: keep the page and offer another tap (same Idempotency-Key)
 */
export type FreeFailureKind = 'settled' | 'moved' | 'retry'

export interface FreeFailure {
  kind: FreeFailureKind
  title: string
  body: string
}

const MOVED_CODES: ReadonlySet<string> = new Set([
  'EVENT_FULL',
  'REGISTRATION_CLOSED',
  'REGISTRATION_NOT_OPEN',
  'EVENT_NOT_FOUND',
])

/** R02 answers an incomplete profile with VALIDATION_FAILED and a `profile` field message (contract R02). */
export function isProfileIncomplete(error: ApiError): boolean {
  return error.code === 'VALIDATION_FAILED' && error.fields?.['profile'] !== undefined
}

export function describeFreeFailure(error: ApiError): FreeFailure {
  if (error.code === 'ALREADY_REGISTERED') {
    return { kind: 'settled', title: "You're already registered", body: 'Your place is already confirmed.' }
  }
  if (isProfileIncomplete(error)) {
    return {
      kind: 'moved',
      title: 'Finish your profile to register',
      body: 'Hosts need a few more details before you can take a place.',
    }
  }
  const copy = copyFor(error, { action: 'confirm your place' })
  if (MOVED_CODES.has(error.code)) return { kind: 'moved', title: copy.title, body: copy.body }
  return { kind: 'retry', title: copy.title, body: copy.body }
}

/** "7 joining" for the first-timer row. */
export function firstTimersText(count: number): string {
  return count === 0 ? 'Be the first' : `${count} joining`
}

/**
 * Availability row text. An unlimited event never shows a number (the backend sends a sentinel `placesLeft`), and an
 * unknown value shows nothing rather than a guess. Null hides the row.
 */
export function availabilityRowText(availability: AvailabilityDto | undefined): string | null {
  if (availability === undefined) return null
  switch (availability.state) {
    case 'open':
      if (availability.unlimited === true) return 'Open to everyone'
      return availability.placesLeft === 1 ? '1 place left' : `${availability.placesLeft} places left`
    case 'full_waitlist':
      return 'Full, waitlist open'
    case 'sold_out':
      return 'Sold out'
    case 'closed':
    case 'not_yet_open':
    case 'completed':
    case 'cancelled':
      return null
  }
}
