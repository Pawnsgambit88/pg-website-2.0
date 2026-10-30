import type { Route } from 'next'
import { ActionLink } from '@/components/ui/ActionLink'
import { Heading } from '@/components/ui/Heading'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { Text } from '@/components/ui/Text'
import { VisuallyHidden } from '@/components/ui/VisuallyHidden'
import { ArrowRight } from '@/components/ui/icons/ArrowRight'
import { MediaFrame } from '@/components/ui/media/MediaFrame'
import type { ArchiveItem } from '@/components/public/archive/archiveItem'
import { formatEventDate } from '@/lib/format/date'

interface ArchiveCardProps {
  item: ArchiveItem
}

/**
 * One past event (reference `.event-card` on screen 05): photo, mono topline (kind and date), title, promise, archive
 * indicator and one stretched "Open archive" link to /events/{slug}, which renders archive mode. The link is the only
 * tab stop; its ::after covers the card. No hooks, so it renders on the server and inside the search island alike.
 */
export function ArchiveCard({ item }: ArchiveCardProps) {
  const href = `/events/${encodeURIComponent(item.slug)}` as Route
  const titleId = `archive-card-${item.slug}`
  const cancelled = item.status === 'cancelled'
  const kind = item.format.trim() === '' ? 'Past event' : item.format
  const actionLabel = cancelled ? 'See notice' : item.archivePublished ? 'Open archive' : 'See event'

  return (
    <article
      aria-labelledby={titleId}
      className="group relative flex h-full min-w-0 flex-col border border-line bg-parchment-soft"
    >
      <MediaFrame media={item.cover} ratio="4:3" slot="card" className="rounded-none border-0" />
      <div className="flex min-w-0 flex-1 flex-col gap-3 p-4 sm:p-6">
        <p className="flex min-w-0 flex-wrap justify-between gap-x-4 gap-y-1 font-mono text-eyebrow text-copper-dark uppercase">
          <span className="wrap-break-word">{kind}</span>
          <time dateTime={item.startsAt}>{formatEventDate(item.startsAt, { weekday: 'none' })}</time>
        </p>
        <Heading level={3} size="panel" id={titleId}>
          {item.title}
        </Heading>
        <Text>{item.promise}</Text>
        <div className="mt-auto flex min-w-0 flex-wrap items-center justify-between gap-x-4 gap-y-2 pt-2">
          <ActionLink
            href={href}
            className="tap inline-flex max-w-full items-center gap-1 text-sm wrap-break-word text-copper-dark underline decoration-1 underline-offset-4 group-hover:decoration-2 after:absolute after:inset-0"
          >
            {actionLabel}
            <VisuallyHidden>: {item.title}</VisuallyHidden>
            <ArrowRight size="sm" />
          </ActionLink>
          {cancelled ? (
            <StatusBadge tone="danger">Cancelled</StatusBadge>
          ) : item.archivePublished ? (
            <StatusBadge tone="success">Results and photos</StatusBadge>
          ) : (
            <StatusBadge>Archive coming</StatusBadge>
          )}
        </div>
      </div>
    </article>
  )
}
