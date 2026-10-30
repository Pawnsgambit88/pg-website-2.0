import type { Route } from 'next'
import { TextLink } from '@/components/ui/TextLink'
import { ArrowRight } from '@/components/ui/icons/ArrowRight'
import type { EventCardDto } from '@/lib/api/types/event'
import { formatEventDate } from '@/lib/format/date'
import { eventPath } from './eventText'

interface NextEventLinkProps {
  /** The next relevant game (pickNextEvent), or null to point at the full list on Play. */
  next: EventCardDto | null
  className?: string
}

/**
 * "Next game" pointer for pages where this event cannot be joined (full, sold out, closed, live, completed, cancelled).
 * Falls back to the Play list when there is no other upcoming game. Server Component.
 */
export function NextEventLink({ next, className }: NextEventLinkProps) {
  if (next === null) {
    return (
      <p className={className}>
        <TextLink href={'/play' as Route} icon={<ArrowRight size="sm" />}>
          See all upcoming games
        </TextLink>
      </p>
    )
  }
  return (
    <div className={className}>
      <p className="type-eyebrow text-muted">Next game</p>
      <p className="mt-1">
        <TextLink href={eventPath(next.slug)} icon={<ArrowRight size="sm" />}>
          {next.title}, {formatEventDate(next.startsAt, { year: false })}
        </TextLink>
      </p>
    </div>
  )
}
