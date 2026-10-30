import { Button } from '@/components/ui/Button'
import { Eyebrow } from '@/components/ui/Eyebrow'
import { Heading } from '@/components/ui/Heading'
import { ArrowRight } from '@/components/ui/icons/ArrowRight'
import { Surface } from '@/components/ui/Surface'
import { Text } from '@/components/ui/Text'
import { TextLink } from '@/components/ui/TextLink'
import { eventPageHref, eventRoomHref } from '@/features/registration/links'
import type { EventDetailDto } from '@/lib/api/types/event'
import { formatEventDateTime } from '@/lib/format/date'

// Screen 21 (register, success). Shown for any confirmed registration: right after a free confirm, after a verified
// payment (EV-04 hands over here) and when the player reloads the page. It states only what R01 said is true.

const NEXT_STEPS: readonly string[] = [
  'We email you the venue and arrival details before the event.',
  'Check in from your event room when the doors open.',
  'You can cancel from My events if your plans change.',
]

export function SuccessPanel({ event, eventId }: { event: EventDetailDto; eventId: string }) {
  return (
    <Surface as="section" padding="lg" aria-labelledby="registration-screen-title" className="flex flex-col gap-4">
      <div data-registration-slot="FE-06" data-registration-screen="registered" className="flex flex-col gap-4">
        <Eyebrow>Confirmed</Eyebrow>
        <Heading level={2} size="panel" id="registration-screen-title">
          You&rsquo;re playing.
        </Heading>
        <Text className="max-w-prose">
          Board saved. You&rsquo;ll get the venue details and a useful reminder before the event.
        </Text>
        <Surface tone="forest" padding="md" aria-label="Your event">
          <span className="inline-block border border-line-light px-2 py-1 type-eyebrow">Confirmed</span>
          <Heading level={3} size="panel" className="mt-4">
            {event.title}
          </Heading>
          <p className="mt-2">{formatEventDateTime(event.startsAt)}</p>
          <p>
            {event.venue.venueName}, {event.venue.area}
          </p>
        </Surface>
        <section aria-labelledby="registration-next-title" className="flex flex-col gap-2">
          <Heading level={3} size="card" id="registration-next-title">
            What happens next
          </Heading>
          <ol className="list-decimal pl-5 text-muted">
            {NEXT_STEPS.map((step) => (
              <li key={step}>{step}</li>
            ))}
          </ol>
        </section>
        <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
          <Button href="/app" icon={<ArrowRight />} iconPosition="end">
            Open My PG
          </Button>
          <Button href={eventRoomHref(eventId)} variant="secondary">
            Open event room
          </Button>
          <TextLink href={eventPageHref(event.slug)}>Back to event</TextLink>
          <TextLink href="/app/events">My events</TextLink>
        </div>
      </div>
    </Surface>
  )
}
