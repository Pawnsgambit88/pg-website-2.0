import { Shell } from '@/components/layout/Shell'
import { eventAudienceLabel, eventStatusLabel, eventStatusTone, eventTypeLabel } from '@/components/domain/eventLabels'
import type { EventCardDto, EventDetailDto } from '@/lib/api/types/event'
import { formatEventDate, formatTimeRange } from '@/lib/format/date'
import { formatInr } from '@/lib/format/money'
import { NO_VALUE } from '@/lib/format/placeholder'
import { DecisionPanel } from './DecisionPanel'
import { EventAtAGlance } from './EventAtAGlance'
import { EventExperience } from './EventExperience'
import { EventFaq } from './EventFaq'
import { EventLogistics } from './EventLogistics'
import { EventOpenHero } from './EventOpenHero'
import { MobileActionBar } from './MobileActionBar'
import { lastKnownDecision } from './eventDecision'
import { hasText } from './eventText'

interface EventOpenViewProps {
  event: EventDetailDto
  next: EventCardDto | null
}

const TITLE_ID = 'event-title'
const DETAILS_ID = 'details'
const ARRIVAL_ID = 'arrival'

/**
 * Event detail, open-mode layout (screen 03): published, registration open, full with waitlist, sold out, live.
 * Mobile order: hero summary, decision panel, experience, at a glance, logistics, FAQ, then the sticky action bar.
 * From 960px: hero across, then the editorial column (8/12) next to the sticky decision panel (4/12). The panel is
 * first in the DOM of that grid, so phones get the decision essentials right under the summary. Server Component.
 */
export function EventOpenView({ event, next }: EventOpenViewProps) {
  const opensAtText = event.registration.opensAt === null ? null : formatEventDate(event.registration.opensAt)
  const decision = lastKnownDecision(event, opensAtText)
  const priceText = formatInr(event.price.pricePaise)
  const place = [event.venue.venueName, event.venue.area].filter(hasText).join(' · ') || NO_VALUE
  const when = `${formatEventDate(event.startsAt, { weekday: 'long', year: false })} · ${formatTimeRange(event.startsAt, event.endsAt)}`
  const eyebrow = [eventTypeLabel(event.type), eventAudienceLabel(event.audience)].join(' · ')
  const statusLabel = event.status === 'registration_open' ? null : eventStatusLabel(event.status)

  return (
    <>
      <EventOpenHero
        titleId={TITLE_ID}
        eyebrow={eyebrow}
        title={event.title}
        promise={event.promise}
        statusLabel={statusLabel}
        statusTone={eventStatusTone(event.status)}
        detailsHref={`#${DETAILS_ID}`}
        media={event.cover ?? event.media.items[0] ?? null}
        facts={[
          { label: 'When', value: when },
          { label: 'Where', value: place },
          { label: 'Format', value: hasText(event.format) ? event.format : NO_VALUE },
          { label: 'Price', value: priceText },
        ]}
      />
      <div className="pb-16 sm:pb-24">
        <Shell className="grid grid-cols-1 items-start gap-12 md:grid-cols-12 md:gap-16">
          <DecisionPanel
            slug={event.slug}
            title={event.title}
            priceText={priceText}
            dateText={formatEventDate(event.startsAt, { weekday: 'long' })}
            timeText={formatTimeRange(event.startsAt, event.endsAt)}
            placeText={place}
            firstTimerCount={event.firstTimerCount}
            placesLeftHint={event.placesLeftHint}
            decision={decision}
            next={next}
            className="md:order-2 md:col-span-4"
          />
          <div className="grid min-w-0 gap-16 md:order-1 md:col-span-8 sm:gap-24">
            <EventExperience id={DETAILS_ID} experience={event.experience} description={event.description} />
            <EventAtAGlance
              atAGlance={event.atAGlance}
              rating={event.rating}
              firstTimerCount={event.firstTimerCount}
            />
            <EventLogistics
              id={ARRIVAL_ID}
              venue={event.venue}
              startsAt={event.startsAt}
              endsAt={event.endsAt}
              logistics={event.logistics}
            />
            <EventFaq faq={event.faq} />
          </div>
        </Shell>
      </div>
      {decision.action === null ? null : (
        <MobileActionBar slug={event.slug} title={event.title} priceText={priceText} action={decision.action} />
      )}
    </>
  )
}
