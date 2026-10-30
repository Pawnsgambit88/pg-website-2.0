import type { EventDetailDto } from '@/lib/api/types/event'

// Last-known registration decision for the event detail page (TASK-043, screen 03). Pure, no directive.
//
// The prerendered page only knows the cached DTO: `status`, the coarse `placesLeftHint` and the registration window.
// It never knows the live count (ARCH-001 9.6, AC-19): that is the availability island's job. So this picks the action
// and the calm explanation from the last-known state, and the copy is honest about it. Revalidation on sold out,
// close, complete and cancel (ARCH-001 9.3) moves a cached page to the next decision.
//
// `closed` (window over, event not started) has no public status of its own: the DTO cannot express it, only the live
// availability can. Its copy lives here so the island and this panel share one wording when the island lands.

export type EventDecisionKind = 'open' | 'full_waitlist' | 'sold_out' | 'closed' | 'not_yet_open' | 'live'

export interface EventDecision {
  kind: EventDecisionKind
  /** Whether a registration route action is offered (register or join the waitlist). */
  action: 'register' | 'waitlist' | null
  /** Short heading for the explanation. Null when the action speaks for itself (open). */
  title: string | null
  /** Calm, plain explanation. Null for open. */
  body: string | null
  /** Offer the next relevant game instead of (or next to) the action. */
  offerNext: boolean
}

/** Label of the registration action, shared by the decision panel and the mobile action bar. */
export const ACTION_LABEL = { register: 'Save my board', waitlist: 'Join the waitlist' } as const

/** Statuses rendered in the open-mode layout (everything except completed and cancelled). */
export function isOpenModeStatus(status: EventDetailDto['status']): boolean {
  return status !== 'completed' && status !== 'cancelled'
}

/** The decision from the cached DTO. `closesAtText` is the formatted close date for the closed copy. */
export function lastKnownDecision(
  event: Pick<EventDetailDto, 'status' | 'placesLeftHint' | 'registration'>,
  opensAtText: string | null,
): EventDecision {
  const waitlist = event.registration.waitlistEnabled
  switch (event.status) {
    case 'registration_open':
      // A hint of 0 on an open event means it filled after the last publish; treat it like sold out until revalidated.
      if (event.placesLeftHint === 0) return waitlist ? decisionFor('full_waitlist') : decisionFor('sold_out')
      return decisionFor('open')
    case 'sold_out':
      return waitlist ? decisionFor('full_waitlist') : decisionFor('sold_out')
    case 'published':
      return {
        ...decisionFor('not_yet_open'),
        title: opensAtText === null ? 'Registration opens soon' : `Registration opens ${opensAtText}`,
      }
    case 'ongoing':
      return decisionFor('live')
    case 'completed':
    case 'cancelled':
      // Rendered by the archive and cancelled views; the panel never sees these. Closed is the safe fallback.
      return decisionFor('closed')
  }
}

/** Fixed copy per decision (no CMS field models it yet). */
export function decisionFor(kind: EventDecisionKind): EventDecision {
  switch (kind) {
    case 'open':
      return { kind, action: 'register', title: null, body: null, offerNext: false }
    case 'full_waitlist':
      return {
        kind,
        action: 'waitlist',
        title: 'This game is full',
        body: 'Join the waitlist and we will offer you a board if one opens up. No payment is taken to join.',
        offerNext: true,
      }
    case 'sold_out':
      return {
        kind,
        action: null,
        title: 'This game is sold out',
        body: 'Every board is taken and this game has no waitlist. There is always another game coming up.',
        offerNext: true,
      }
    case 'closed':
      return {
        kind,
        action: null,
        title: 'Registration has closed',
        body: 'We have closed the list so the hosts can plan the boards. Come along to the next one.',
        offerNext: true,
      }
    case 'not_yet_open':
      return {
        kind,
        action: null,
        title: 'Registration opens soon',
        body: 'You can save a board as soon as registration opens. Until then, have a look at the other games.',
        offerNext: true,
      }
    case 'live':
      return {
        kind,
        action: null,
        title: 'This game is on right now',
        body: 'Registration has closed while the boards are in play. The next game is open for you.',
        offerNext: true,
      }
  }
}
