import type { Route } from 'next'
import { EventCard } from '@/components/domain/EventCard'
import { Shell } from '@/components/layout/Shell'
import { Button } from '@/components/ui/Button'
import { Eyebrow } from '@/components/ui/Eyebrow'
import { Text } from '@/components/ui/Text'
import { TextLink } from '@/components/ui/TextLink'
import { EmptyState } from '@/components/ui/feedback/EmptyState'
import { ArrowRight } from '@/components/ui/icons/ArrowRight'
import { copyFor } from '@/lib/api/error-copy'
import type { EventCardDto } from '@/lib/api/types/event'
import type { HomeContentDto } from '@/lib/api/types/site-content'

const TITLE_ID = 'home-upcoming-title'

// Fallback copy for states the CMS section does not model yet (HomeContentDto.upcoming has no empty or card-CTA
// fields). Overridable by props so HOME-07 can pass CMS copy when it exists.
const DEFAULT_CARD_ACTION = 'Save my board'
const DEFAULT_EMPTY_TITLE = 'No games on the calendar yet'
const DEFAULT_EMPTY_BODY = 'New dates go up every week. See everything we have planned so far.'
/** Developer-written verb phrase for the error-copy map ("We couldn't load upcoming games"). */
const ERROR_ACTION = 'load upcoming games'

interface HomeUpcomingProps {
  content: HomeContentDto['upcoming']
  /** Up to three upcoming cards, already filtered and sorted by the server fetcher. Ignored when `error` is set. */
  events: readonly EventCardDto[]
  /**
   * The events fetch failed (Promise.allSettled rejection). Renders an inline message in place of the list while the
   * rest of the page renders. Raw error text is never shown: copy comes from `copyFor`.
   */
  error?: unknown
  /** Card CTA label. Default "Save my board" (DEC Q2). The accessible name adds the event title. */
  cardActionLabel?: string
  emptyTitle?: string
  emptyBody?: string
}

/**
 * Home "Upcoming games" (screen 01, reference `approved-upcoming`). Server Component, no client JS beyond the card
 * images. Head: eyebrow, h2, intro and "See all" link. List: one column, three from 960px, square hairline cells; the
 * borders sit on each cell (collapsed by -1px margins), so one or two events never leave an empty bordered track.
 * Motion: `data-motion="reveal"` markers for the Home GSAP island (DEC-029); content is visible without it.
 */
export function HomeUpcoming({
  content,
  events,
  error,
  cardActionLabel = DEFAULT_CARD_ACTION,
  emptyTitle = DEFAULT_EMPTY_TITLE,
  emptyBody = DEFAULT_EMPTY_BODY,
}: HomeUpcomingProps) {
  const failed = error !== undefined && error !== null
  const cards = events.slice(0, 3)
  const ctaHref = content.cta.href as Route

  let body
  if (failed) {
    const copy = copyFor(error, { action: ERROR_ACTION })
    body = (
      <div className="border border-line bg-parchment-soft p-6 sm:p-8">
        <p className="font-ui text-xl leading-tight font-strong tracking-tight wrap-break-word">{copy.title}</p>
        <Text className="mt-2 max-w-prose">{copy.body}</Text>
      </div>
    )
  } else if (cards.length === 0) {
    body = (
      <EmptyState
        title={emptyTitle}
        action={
          <Button href={ctaHref} variant="secondary" icon={<ArrowRight size="sm" />} iconPosition="end">
            {content.cta.label}
          </Button>
        }
      >
        {emptyBody}
      </EmptyState>
    )
  } else {
    body = (
      <ul className="grid grid-cols-1 md:grid-cols-3">
        {cards.map((event, index) => (
          <li
            key={event.slug}
            data-motion="reveal"
            data-motion-index={index}
            className="-mt-px min-w-0 border border-line first:mt-0 md:mt-0 md:-ml-px md:first:ml-0"
          >
            <EventCard event={event} variant="home" headingLevel={3} actionLabel={cardActionLabel} />
          </li>
        ))}
      </ul>
    )
  }

  return (
    <section aria-labelledby={TITLE_ID}>
      <Shell className="border-t border-line pt-6 pb-12 sm:pb-16">
        <div
          data-motion="reveal"
          className="mb-4 grid grid-cols-1 items-end gap-3 md:mb-6 md:grid-cols-12 md:gap-8"
        >
          <div className="min-w-0 md:col-span-5">
            <Eyebrow>{content.eyebrow}</Eyebrow>
            {/* Reference h2 is the UI font at about 1.8rem, which no Heading size matches; level stays explicit. */}
            <h2
              id={TITLE_ID}
              className="mt-2 font-ui text-3xl leading-tight font-strong tracking-tight wrap-break-word"
            >
              {content.title}
            </h2>
          </div>
          <Text variant="small" className="min-w-0 max-w-prose md:col-span-5">
            {content.intro}
          </Text>
          <div className="min-w-0 md:col-span-2 md:justify-self-end">
            <TextLink href={ctaHref} icon={<ArrowRight size="sm" />}>
              {content.cta.label}
            </TextLink>
          </div>
        </div>
        {body}
      </Shell>
    </section>
  )
}
