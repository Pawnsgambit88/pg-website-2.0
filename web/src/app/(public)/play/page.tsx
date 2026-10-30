import type { Metadata } from 'next'
import { EventCard } from '@/components/domain/EventCard'
import { Section } from '@/components/layout/Section'
import { Shell } from '@/components/layout/Shell'
import { PlayFilters, type PlayEntry } from '@/components/public/events/PlayFilters'
import { toPlayFilterItem } from '@/components/public/events/playFilterModel'
import { Button } from '@/components/ui/Button'
import { Eyebrow } from '@/components/ui/Eyebrow'
import { Heading } from '@/components/ui/Heading'
import { Text } from '@/components/ui/Text'
import { EmptyState } from '@/components/ui/feedback/EmptyState'
import { ArrowRight } from '@/components/ui/icons/ArrowRight'
import { MAX_PAGE_SIZE } from '@/lib/api/types/pagination'
import { getUpcomingEvents } from '@/lib/data/public/upcoming-events'
import { buildMetadata } from '@/lib/seo/metadata'

// Play (screen 02, TASK-042). Static, prerendered; 900 s matches the public ISR window (ARCH-001 7.3) and the `events`
// tag revalidates on demand. No searchParams or other request APIs: filters and search are a client island over the
// list delivered here, with their state in the URL hash, so /play stays static.
export const revalidate = 900

const PLAY_PATH = '/play'
const RESULTS_TITLE_ID = 'play-results-title'
const FIRST_TIME_TITLE_ID = 'play-first-time-title'

// Copy from reference screen 02.
const EYEBROW = 'Play'
const TITLE = 'Find the game you feel like playing.'
const LEAD = 'Social nights, beginner tables and rated formats. No hunting through tournament jargon.'
const CARD_ACTION = 'See event'
const FIRST_TIME_EYEBROW = 'First time?'
const FIRST_TIME_TITLE = 'Come solo. We’ll make the first hello easy.'
const FIRST_TIME_BODY =
  'Tell us roughly how you like to play. A host will help you settle in and find a good first game.'
const EMPTY_TITLE = 'No games on the calendar yet'
const EMPTY_BODY = 'New dates go up every week. Meanwhile, see how earlier nights went.'

export const metadata: Metadata = buildMetadata({ title: 'Play', description: LEAD, path: PLAY_PATH })

export default async function PlayPage() {
  // One unfiltered page serves every filter state. Failure throws to the (public) error boundary (never empty data).
  const page = await getUpcomingEvents(1, MAX_PAGE_SIZE)
  const events = page.items

  // Only filter keys and the rendered card cross into the island (RBP server-serialization); EventCard stays server code.
  const entries: PlayEntry[] = events.map((event, index) => ({
    ...toPlayFilterItem(event),
    card: <EventCard event={event} headingLevel={3} actionLabel={CARD_ACTION} priorityImage={index === 0} />,
  }))

  return (
    <>
      <Shell as="header" className="border-b border-line pt-16 pb-12 sm:pt-24 sm:pb-16">
        <Eyebrow>{EYEBROW}</Eyebrow>
        <Heading level={1} size="hero" className="mt-2 mb-4 max-w-3xl">
          {TITLE}
        </Heading>
        <Text variant="lead">{LEAD}</Text>
      </Shell>

      <Section aria-labelledby={RESULTS_TITLE_ID} space="compact">
        <h2 id={RESULTS_TITLE_ID} className="sr-only">
          Upcoming games
        </h2>
        {entries.length === 0 ? (
          <EmptyState
            title={EMPTY_TITLE}
            action={
              <Button href="/past-events" variant="secondary" icon={<ArrowRight size="sm" />} iconPosition="end">
                See past events
              </Button>
            }
          >
            {EMPTY_BODY}
          </EmptyState>
        ) : (
          <PlayFilters entries={entries} />
        )}
      </Section>

      <Section tone="forest" aria-labelledby={FIRST_TIME_TITLE_ID}>
        <Eyebrow>{FIRST_TIME_EYEBROW}</Eyebrow>
        <Heading level={2} id={FIRST_TIME_TITLE_ID} className="mt-2 mb-4 max-w-xl">
          {FIRST_TIME_TITLE}
        </Heading>
        <Text tone="on-dark" className="max-w-prose">
          {FIRST_TIME_BODY}
        </Text>
      </Section>
    </>
  )
}
