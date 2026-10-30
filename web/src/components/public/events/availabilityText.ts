import type { AvailabilityDto } from '@/lib/api/types/event-state'

// Plain-language availability copy for the public availability island (TASK-123). Text only, never colour alone.

/** Shown while nothing is known yet (no live value and no prerendered hint). Neutral, never a number (AC-19). */
export const AVAILABILITY_CHECKING = 'Places left: checking'
/** Shown when the first live read failed and there is no hint to fall back on (ARCH-001 9.6). */
export const AVAILABILITY_FAILED = 'Availability could not be loaded'

function places(count: number): string {
  return count === 1 ? '1 place left' : `${count} places left`
}

/** Live availability as one short line. */
export function liveAvailabilityText(availability: AvailabilityDto): string {
  switch (availability.state) {
    case 'open':
      return availability.unlimited === true ? 'Open for registration' : places(availability.placesLeft)
    case 'full_waitlist':
      return 'Full, waitlist open'
    case 'sold_out':
      return 'Sold out'
    case 'closed':
      return 'Registration closed'
    case 'not_yet_open':
      return 'Registration opens soon'
    case 'completed':
      return 'Event completed'
    case 'cancelled':
      return 'Event cancelled'
  }
}

/** The coarse prerendered card hint (`placesLeftHint`) as text; null when there is no hint. */
export function hintAvailabilityText(hint: number | null | undefined): string | null {
  if (hint === null || hint === undefined) return null
  return hint === 0 ? 'Sold out' : places(hint)
}
