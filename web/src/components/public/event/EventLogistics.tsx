import { Eyebrow } from '@/components/ui/Eyebrow'
import { Heading } from '@/components/ui/Heading'
import { InfoRow } from '@/components/ui/InfoRow'
import { InfoStack } from '@/components/ui/InfoStack'
import { MapPin } from '@/components/ui/icons/MapPin'
import type { EventDetailDto } from '@/lib/api/types/event'
import { formatEventDate, formatTimeRange } from '@/lib/format/date'
import { NO_VALUE } from '@/lib/format/placeholder'
import { hasText } from './eventText'

interface EventLogisticsProps {
  id: string
  venue: EventDetailDto['venue']
  startsAt: string
  endsAt: string
  logistics: readonly string[]
}

const TITLE_ID = 'event-logistics-title'

/**
 * Venue and logistics ("arrival anchor"): venue name and address, date and time, then the host's practical notes as a
 * hairline list. Server Component.
 */
export function EventLogistics({ id, venue, startsAt, endsAt, logistics }: EventLogisticsProps) {
  const area = [venue.area, venue.city].filter(hasText).join(', ')
  return (
    <section id={id} aria-labelledby={TITLE_ID} className="min-w-0">
      <Eyebrow>Getting there</Eyebrow>
      <Heading level={2} size="section" id={TITLE_ID} className="mt-3 mb-6 max-w-2xl">
        Where and when
      </Heading>
      <div className="grid grid-cols-1 gap-8 md:grid-cols-2">
        <div className="flex min-w-0 gap-3">
          <MapPin className="mt-1 shrink-0 text-copper-dark" />
          <address className="min-w-0 not-italic">
            <strong className="block font-strong wrap-break-word">
              {hasText(venue.venueName) ? venue.venueName : NO_VALUE}
            </strong>
            {hasText(venue.address) ? (
              <span className="block wrap-break-word text-ink-soft">{venue.address}</span>
            ) : null}
            {area === '' ? null : <span className="block text-sm wrap-break-word text-muted">{area}</span>}
          </address>
        </div>
        <InfoStack>
          <InfoRow label="Date">{formatEventDate(startsAt, { weekday: 'long' })}</InfoRow>
          <InfoRow label="Time">{formatTimeRange(startsAt, endsAt)}</InfoRow>
        </InfoStack>
      </div>
      {logistics.length === 0 ? null : (
        <ul className="mt-8 max-w-2xl border-t border-line">
          {logistics.map((note, index) => (
            <li key={index} className="border-b border-line py-4 wrap-break-word text-ink-soft">
              {note}
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
