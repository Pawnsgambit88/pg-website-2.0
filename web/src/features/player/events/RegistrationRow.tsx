import { Button } from '@/components/ui/Button'
import { Heading } from '@/components/ui/Heading'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { Surface } from '@/components/ui/Surface'
import { Text } from '@/components/ui/Text'
import { TextLink } from '@/components/ui/TextLink'
import { MediaFrame } from '@/components/ui/media/MediaFrame'
import type { MyRegistrationDto } from '@/lib/api/types/my-events'
import { formatEventDateTime } from '@/lib/format/date'
import { eventRoomHref, publicEventHref, registerHref } from '@/features/player/shared/links'
import { registrationStatusView } from '@/features/player/events/registration-labels'

interface RegistrationRowProps {
  row: MyRegistrationDto
  /** Upcoming rows get actions; history rows link back to the archive. */
  variant: 'upcoming' | 'history'
  /** Opens the cancel confirmation for this row. Upcoming only. */
  onCancel?: (row: MyRegistrationDto) => void
  className?: string
}

/**
 * One registration, as a card at every width (a table would push the state text into a secondary column on mobile).
 * Title, place and time, state badge in words, a detail line (hold, queue position, refund) and only the actions the
 * server allows: `canOpenRoom`, `canCancel`, or the text `cancelBlockedReason` where cancel is missing.
 */
export function RegistrationRow({ row, variant, onCancel, className }: RegistrationRowProps) {
  const { registration, event } = row
  const view = registrationStatusView(registration)
  const titleId = `reg-${registration.id}`
  const resumable = registration.status === 'pending'
  const offered = registration.status === 'waitlist' && registration.offer !== null
  const eventEnded = event.status === 'completed' || event.status === 'cancelled'

  return (
    <Surface as="article" aria-labelledby={titleId} className={className} padding="none">
      {/*
       * Card layout: thumbnail (fixed 128 px) + content with its own padding.
       * Reference 23-my-events: grid-template-columns 140px 1fr auto; gap 18px.
       * Tailwind v4 equivalent: flex row, w-32 shrink-0 image column, flex-1 content column.
       * Reduced-motion: MediaFrame does not animate; the empty tile is static.
       */}
      <div className="flex min-w-0 items-start">
        {/* Cover thumbnail — 128 px wide, ratio 3:2 (~85 px tall). Empty tile (gradient) when cover is null. */}
        <div className="w-32 shrink-0" aria-hidden="true">
          <MediaFrame media={event.cover} ratio="3:2" sizes="128px" className="h-full rounded-none border-0" />
        </div>

        {/* Content column */}
        <div className="flex min-w-0 flex-1 flex-col gap-3 p-4 sm:p-6">
          <div className="flex min-w-0 flex-wrap items-center gap-2">
            <StatusBadge tone={view.tone}>{view.label}</StatusBadge>
            {event.status === 'cancelled' ? <StatusBadge tone="danger">Event cancelled</StatusBadge> : null}
            {event.status === 'ongoing' ? <StatusBadge tone="copper">Event live now</StatusBadge> : null}
          </div>
          <div className="min-w-0">
            <Heading level={3} size="card" id={titleId}>
              {event.title}
            </Heading>
            <Text variant="small" className="mt-1">
              {formatEventDateTime(event.startsAt)} · {event.area}
            </Text>
          </div>
          {view.detail === null ? null : (
            <Text variant="small" tone="inherit">
              {view.detail}
            </Text>
          )}

          <div className="flex min-w-0 flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
            {variant === 'history' ? (
              <Button href={publicEventHref(event.slug)} variant="secondary" size="lg">
                View event archive
              </Button>
            ) : (
              <>
                {resumable || offered ? (
                  <Button href={registerHref(event.slug)} variant="copper" size="lg">
                    {resumable ? 'Resume payment' : 'Take your place'}
                  </Button>
                ) : null}
                {row.canOpenRoom && !eventEnded ? (
                  <Button href={eventRoomHref(event.id)} variant={resumable ? 'secondary' : 'primary'} size="lg">
                    Open event room
                  </Button>
                ) : null}
                {row.canCancel && onCancel !== undefined ? (
                  <Button
                    variant="secondary"
                    size="lg"
                    onClick={() => {
                      onCancel(row)
                    }}
                  >
                    Cancel registration
                  </Button>
                ) : null}
                <TextLink href={publicEventHref(event.slug)}>Event details</TextLink>
              </>
            )}
          </div>
          {variant === 'upcoming' && !row.canCancel && row.cancelBlockedReason !== null ? (
            <Text variant="small">Cancel is not available: {row.cancelBlockedReason}</Text>
          ) : null}
        </div>
      </div>
    </Surface>
  )
}
