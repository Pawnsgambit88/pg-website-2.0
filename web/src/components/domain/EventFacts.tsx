import { InfoRow } from '@/components/ui/InfoRow'
import { InfoStack } from '@/components/ui/InfoStack'
import { eventAudienceLabel } from '@/components/domain/eventLabels'
import type { EventAudience } from '@/lib/api/types/event-state'
import { formatEventDate, formatTimeRange } from '@/lib/format/date'
import { formatInr } from '@/lib/format/money'
import { NO_VALUE } from '@/lib/format/placeholder'

interface EventFactsProps {
  startsAt: string
  endsAt?: string | null
  /** Venue name or area; the address line is optional. */
  place?: string | null
  /** Short format label ("Social chess", "5+2 Blitz"). */
  format?: string | null
  pricePaise?: number | null
  audience?: EventAudience
  className?: string
}

/** Date, time, place, format, fee and audience as a description list. Missing values show "—". Server Component. */
export function EventFacts({ startsAt, endsAt, place, format, pricePaise, audience, className }: EventFactsProps) {
  const orDash = (value: string | null | undefined) =>
    value === null || value === undefined || value.trim() === '' ? NO_VALUE : value
  return (
    <InfoStack className={className}>
      <InfoRow label="Date">{formatEventDate(startsAt)}</InfoRow>
      <InfoRow label="Time">{formatTimeRange(startsAt, endsAt)}</InfoRow>
      <InfoRow label="Place">{orDash(place)}</InfoRow>
      <InfoRow label="Format">{orDash(format)}</InfoRow>
      <InfoRow label="Fee">
        {pricePaise === null || pricePaise === undefined ? NO_VALUE : formatInr(pricePaise)}
      </InfoRow>
      <InfoRow label="Who it is for">{eventAudienceLabel(audience)}</InfoRow>
    </InfoStack>
  )
}
