import type {
  AvailabilityDto,
  EventAudience,
  EventType,
  PairingMode,
  PublicEventStatus,
} from '@/lib/api/types/event-state'
import type { StatusTone } from '@/components/ui/StatusBadge'
import type { InstantInput } from '@/lib/format/instant'
import { formatEventDate } from '@/lib/format/date'
import { NO_VALUE } from '@/lib/format/placeholder'

// Plain-language labels for the event vocabulary, shared by the event domain components. Unknown values fall back to
// NO_VALUE so a new enum member from the API never renders "undefined".

const TYPE_LABEL: Readonly<Record<EventType, string>> = {
  social: 'Social',
  rated_tournament: 'Rated tournament',
  league: 'League',
  workshop: 'Workshop',
  special: 'Special',
}

const AUDIENCE_LABEL: Readonly<Record<EventAudience, string>> = {
  all_levels: 'All levels',
  beginner: 'New players',
  solo: 'Come solo',
}

const STATUS_LABEL: Readonly<Record<PublicEventStatus, string>> = {
  published: 'Announced',
  registration_open: 'Open',
  sold_out: 'Sold out',
  ongoing: 'Live now',
  completed: 'Completed',
  cancelled: 'Cancelled',
}

const STATUS_TONE: Readonly<Record<PublicEventStatus, StatusTone>> = {
  published: 'neutral',
  registration_open: 'success',
  sold_out: 'warning',
  ongoing: 'copper',
  completed: 'neutral',
  cancelled: 'danger',
}

export function eventTypeLabel(type: EventType | undefined): string {
  return (type === undefined ? undefined : TYPE_LABEL[type]) ?? NO_VALUE
}

const PAIRING_MODE_LABEL: Readonly<Record<PairingMode, string>> = {
  social_balanced: 'Balanced',
  swiss: 'Swiss',
  round_robin: 'Round robin',
  none: '—',
}

export function pairingModeLabel(mode: PairingMode | undefined): string {
  return (mode === undefined ? undefined : PAIRING_MODE_LABEL[mode]) ?? NO_VALUE
}

export function eventAudienceLabel(audience: EventAudience | undefined): string {
  return (audience === undefined ? undefined : AUDIENCE_LABEL[audience]) ?? NO_VALUE
}

export function eventStatusLabel(status: PublicEventStatus | undefined): string {
  return (status === undefined ? undefined : STATUS_LABEL[status]) ?? NO_VALUE
}

export function eventStatusTone(status: PublicEventStatus | undefined): StatusTone {
  return (status === undefined ? undefined : STATUS_TONE[status]) ?? 'neutral'
}

/**
 * Date chip text for the Home card (reference `approved-card__date`): IST weekday, day and month without the comma,
 * `Sat 24 Oct` (upper-cased by CSS, so screen readers do not spell it out). Invalid input gives "—".
 */
export function eventDateChip(startsAt: InstantInput): string {
  return formatEventDate(startsAt, { weekday: 'short', year: false }).replace(',', '')
}

/** Places text from live availability, or the coarse card hint. Text only; null when there is nothing to say. */
export function placesText(availability: AvailabilityDto | undefined, hint: number | null | undefined): string | null {
  if (availability !== undefined) {
    switch (availability.state) {
      case 'open':
        if (availability.unlimited === true) return null
        return availability.placesLeft === 1 ? '1 place left' : `${availability.placesLeft} places left`
      case 'full_waitlist':
        return 'Full, waitlist open'
      case 'sold_out':
        return 'Sold out'
      default:
        return null
    }
  }
  if (hint === null || hint === undefined) return null
  if (hint === 0) return 'Sold out'
  return hint === 1 ? '1 place left' : `${hint} places left`
}
