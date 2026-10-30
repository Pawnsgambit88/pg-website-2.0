import type { Route } from 'next'
import { ActionLink } from '@/components/ui/ActionLink'
import { ArrowRight } from '@/components/ui/icons/ArrowRight'
import { Heading } from '@/components/ui/Heading'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { Text } from '@/components/ui/Text'
import { TextLink } from '@/components/ui/TextLink'
import { VisuallyHidden } from '@/components/ui/VisuallyHidden'
import { MediaFrame } from '@/components/ui/media/MediaFrame'
import {
  eventAudienceLabel,
  eventDateChip,
  eventStatusLabel,
  eventStatusTone,
  eventTypeLabel,
  placesText,
} from '@/components/domain/eventLabels'
import type { HeadingLevel } from '@/components/ui/headingLevel'
import type { AvailabilityDto } from '@/lib/api/types/event-state'
import type { EventSummaryDto } from '@/lib/api/types/event'
import { cn } from '@/lib/cn'
import { formatEventDate, formatTimeRange } from '@/lib/format/date'
import { formatInr } from '@/lib/format/money'
import { NO_VALUE } from '@/lib/format/placeholder'

/**
 * Look of the card.
 *  default  catalogue card: price, status badge and places hint (Play, archive, player areas).
 *  home     reference `approved-card` (screen 01): square hairline card on parchment, mono date chip over the photo,
 *           type and audience labels, title, promise, time and area, one stretched CTA. No price, status, places hint
 *           or first-timer count. The parent draws the grid dividers.
 */
export type EventCardVariant = 'default' | 'home'

interface EventCardProps {
  event: EventSummaryDto
  /** Default `default`. */
  variant?: EventCardVariant
  /** Live availability when the parent has it; otherwise the coarse `placesLeftHint` is used. */
  availability?: AvailabilityDto
  /** Semantic level of the title; the parent decides from its own outline. Default 3. */
  headingLevel?: HeadingLevel
  /**
   * Action label. Default "See event". The accessible name always adds the event title: `aria-label` "{label}: {title}"
   * in the default variant, visually hidden " for {title}" in the home variant.
   */
  actionLabel?: string
  /** Mark the cover as the page's single LCP image. */
  priorityImage?: boolean
  className?: string
}

/**
 * Event card (COMPONENT-CATALOG): image, date, kind, audience, title, promise, time, place, price and one action.
 * The only interactive element is the action link, whose accessible name includes the title; nothing is nested.
 * Server Component: display only, no state. Long titles and places wrap (`wrap-break-word`, `min-w-0`).
 */
export function EventCard({
  event,
  variant = 'default',
  availability,
  headingLevel = 3,
  actionLabel = 'See event',
  priorityImage = false,
  className,
}: EventCardProps) {
  const href = `/events/${encodeURIComponent(event.slug)}` as Route
  const titleId = `event-card-${event.slug}`

  if (variant === 'home') {
    // Home (reference approved-card). The CTA's ::after covers the article (`relative`), so the whole card is clickable
    // while the CTA stays the only tab stop and nothing is nested. The cover is lazy unless the caller says otherwise.
    const area = event.area.trim() === '' ? NO_VALUE : event.area
    // The reference labels read like the format ("5+2 Blitz", "Start here"), not the type enum, so `format` wins.
    const kind = event.format.trim() === '' ? eventTypeLabel(event.type) : event.format
    return (
      <article
        aria-labelledby={titleId}
        className={cn('group relative flex h-full min-w-0 flex-col bg-parchment text-ink', className)}
      >
        <div className="relative">
          <MediaFrame
            media={event.cover}
            ratio="4:3"
            slot="card"
            priority={priorityImage}
            className="rounded-none border-0"
          />
          <time
            dateTime={event.startsAt}
            className="absolute top-0 left-0 bg-parchment px-3 py-2 font-mono text-eyebrow text-forest uppercase"
          >
            {eventDateChip(event.startsAt)}
          </time>
        </div>
        <div className="flex min-w-0 flex-1 flex-col p-4 sm:p-6">
          <p className="flex min-w-0 flex-wrap justify-between gap-x-4 gap-y-1 font-mono text-eyebrow text-copper-dark uppercase">
            <span className="wrap-break-word">{kind}</span>
            <span className="wrap-break-word">{eventAudienceLabel(event.audience)}</span>
          </p>
          <Heading level={headingLevel} size="panel" id={titleId} className="mt-3">
            {event.title}
          </Heading>
          <Text variant="small" className="mt-2">
            {event.promise}
          </Text>
          <p className="mt-4 flex min-w-0 flex-wrap gap-x-2 gap-y-1 border-t border-line pt-3 font-mono text-eyebrow uppercase">
            <span>{formatTimeRange(event.startsAt, event.endsAt)}</span>
            <span aria-hidden="true">·</span>
            <span className="wrap-break-word">{area}</span>
          </p>
          <div className="mt-auto pt-4">
            <ActionLink
              href={href}
              className="inline-flex max-w-full items-center gap-1 text-label wrap-break-word underline decoration-1 underline-offset-4 group-hover:decoration-2 after:absolute after:inset-0"
            >
              {actionLabel}
              <VisuallyHidden> for {event.title}</VisuallyHidden>
              <ArrowRight size="sm" />
            </ActionLink>
          </div>
        </div>
      </article>
    )
  }

  const place = [event.area, event.city].filter((part) => part.trim() !== '').join(', ') || NO_VALUE
  const places = placesText(availability, event.placesLeftHint)
  return (
    <article
      aria-labelledby={titleId}
      className={`flex min-w-0 flex-col border border-line bg-parchment-soft ${className ?? ''}`.trim()}
    >
      <MediaFrame
        media={event.cover}
        ratio="16:9"
        slot="card"
        priority={priorityImage}
        tag={formatEventDate(event.startsAt, { weekday: 'short', year: false })}
        className="rounded-none border-0"
      />
      <div className="flex min-w-0 flex-1 flex-col gap-3 p-4 sm:p-6">
        <div className="flex min-w-0 flex-wrap items-baseline justify-between gap-x-4 gap-y-1 font-mono text-eyebrow text-muted uppercase">
          <span className="wrap-break-word">
            {eventTypeLabel(event.type)} · {eventAudienceLabel(event.audience)}
          </span>
          <span className="text-ink">{formatInr(event.price.pricePaise)}</span>
        </div>
        <Heading level={headingLevel} size="card" id={titleId}>
          {event.title}
        </Heading>
        <Text>{event.promise}</Text>
        <div className="flex min-w-0 flex-col gap-1 font-mono text-eyebrow text-muted uppercase">
          <span>{formatTimeRange(event.startsAt, event.endsAt)}</span>
          <span className="wrap-break-word">{place}</span>
        </div>
        <div className="mt-auto flex min-w-0 flex-wrap items-center justify-between gap-x-4 gap-y-2 pt-2">
          <TextLink href={href} icon={<ArrowRight size="sm" />} aria-label={`${actionLabel}: ${event.title}`}>
            {actionLabel}
          </TextLink>
          <span className="flex min-w-0 flex-wrap items-center gap-2">
            {places === null ? null : <span className="text-sm text-muted">{places}</span>}
            <StatusBadge tone={eventStatusTone(event.status)}>{eventStatusLabel(event.status)}</StatusBadge>
          </span>
        </div>
      </div>
    </article>
  )
}
