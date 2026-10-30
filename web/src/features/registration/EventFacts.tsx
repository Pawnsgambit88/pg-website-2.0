import { InfoRow } from '@/components/ui/InfoRow'
import { InfoStack } from '@/components/ui/InfoStack'
import { Surface } from '@/components/ui/Surface'
import type { EventDetailDto } from '@/lib/api/types/event'
import { firstTimersText } from '@/features/registration/free-registration'
import { formatEventDateTime, formatTimeRange } from '@/lib/format/date'
import { formatInr } from '@/lib/format/money'

/** Public facts of the event beside the registration step. Plain values from the P03 projection. */
export function EventFacts({ event, availability }: { event: EventDetailDto; availability: string | null }) {
  return (
    <Surface as="section" aria-label="About this event" padding="md">
      <InfoStack>
        <InfoRow label="Date">{formatEventDateTime(event.startsAt)}</InfoRow>
        <InfoRow label="Time">{formatTimeRange(event.startsAt, event.endsAt)}</InfoRow>
        <InfoRow label="Venue">
          {event.venue.venueName}, {event.venue.area}
        </InfoRow>
        <InfoRow label="Format">{event.format}</InfoRow>
        <InfoRow label="First-timers">{firstTimersText(event.firstTimerCount)}</InfoRow>
        {availability === null ? null : <InfoRow label="Availability">{availability}</InfoRow>}
        <InfoRow label="Price">{formatInr(event.price.pricePaise)}</InfoRow>
      </InfoStack>
    </Surface>
  )
}
