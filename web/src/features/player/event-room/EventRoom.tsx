'use client'

import { Shell } from '@/components/layout/Shell'
import { Button } from '@/components/ui/Button'
import { Eyebrow } from '@/components/ui/Eyebrow'
import { Heading } from '@/components/ui/Heading'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { Text } from '@/components/ui/Text'
import { Banner } from '@/components/ui/feedback/Banner'
import { ErrorState } from '@/components/ui/feedback/ErrorState'
import { Skeleton } from '@/components/ui/feedback/Skeleton'
import { SkeletonRegion } from '@/components/ui/feedback/SkeletonRegion'
import { formatEventDateTime } from '@/lib/format/date'
import { BeforeCheckInScreen } from '@/features/player/event-room/BeforeCheckInScreen'
import { BetweenRoundsScreen } from '@/features/player/event-room/BetweenRoundsScreen'
import { CheckInScreen } from '@/features/player/event-room/CheckInScreen'
import { CompleteScreen } from '@/features/player/event-room/CompleteScreen'
import { LiveRoundScreen } from '@/features/player/event-room/LiveRoundScreen'
import { PairingPendingScreen } from '@/features/player/event-room/PairingPendingScreen'
import { ROOM_STATE_LABEL } from '@/features/player/event-room/room-state'
import { useEventRoom } from '@/features/player/event-room/useEventRoom'
import { useEventRoomActions } from '@/features/player/event-room/useEventRoomActions'

/**
 * Event Room (screens 24 to 29). Mobile first: the header, the state panel and the essentials (board, opponent,
 * colour, time control, result actions) come first and stack in one column; standings follow below. Everything needed
 * at the venue is on this page, never behind the menu. The refresh button is always present.
 *
 * `contactHref` (from P12 PublicSettingsDto.deskContactHref) is passed to each state screen's HelpPanel so the
 * "Message event desk" link is a plain, offline-safe href (EV-06).
 */
export function EventRoom({ eventId, contactHref }: { eventId: string; contactHref?: string | null }) {
  const room = useEventRoom(eventId)
  const actions = useEventRoomActions(eventId)
  const snapshot = room.data

  if (snapshot === undefined) {
    return (
      <Shell className="flex flex-col gap-6 py-8 sm:py-12">
        <Heading level={1} size="page-intro">
          Event room
        </Heading>
        {room.isPending ? (
          <SkeletonRegion label="Loading your event room">
            <div className="flex flex-col gap-4">
              <Skeleton shape="card" className="h-56" />
              <Skeleton shape="card" />
            </div>
          </SkeletonRegion>
        ) : (
          <ErrorState
            error={room.error}
            action="open your event room"
            onRetry={() => void room.refresh()}
            retrying={room.isFetching}
            headingLevel={2}
          />
        )}
      </Shell>
    )
  }

  return (
    <Shell className="flex flex-col gap-6 py-8 sm:py-12">
      <header className="flex min-w-0 flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          <Eyebrow>EVENT ROOM</Eyebrow>
          <Heading level={1} size="page-intro">
            {snapshot.title}
          </Heading>
          <Text className="mt-1">
            {formatEventDateTime(snapshot.startsAt)} · {snapshot.venue}
          </Text>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          {/* Registration status badge (EV-06: reference shows "Confirmed" in the header) */}
          <StatusBadge tone="success">Confirmed</StatusBadge>
          <StatusBadge tone={snapshot.roomState === 'live_round' ? 'success' : 'neutral'}>
            {ROOM_STATE_LABEL[snapshot.roomState]}
          </StatusBadge>
          <Button
            variant="secondary"
            size="sm"
            loading={room.isFetching}
            loadingLabel="Refreshing"
            onClick={() => void room.refresh()}
          >
            Refresh
          </Button>
        </div>
      </header>

      {room.isError ? (
        <Banner
          tone="warning"
          title="Could not refresh."
          action={
            <Button variant="secondary" size="sm" onClick={() => void room.refresh()}>
              Try again
            </Button>
          }
        >
          You are seeing the last update. Check your connection; the host desk can help at the venue.
        </Banner>
      ) : room.isPollingPaused ? (
        <Banner tone="info">
          Updates are paused while you are offline or the tab is hidden. They resume on return.
        </Banner>
      ) : null}

      {snapshot.roomState === 'before_checkin' ? (
        <BeforeCheckInScreen room={snapshot} contactHref={contactHref} />
      ) : null}
      {snapshot.roomState === 'checkin_open' ? (
        <CheckInScreen room={snapshot} actions={actions} contactHref={contactHref} />
      ) : null}
      {snapshot.roomState === 'pairing_pending' ? (
        <PairingPendingScreen room={snapshot} contactHref={contactHref} />
      ) : null}
      {snapshot.roomState === 'live_round' ? (
        <LiveRoundScreen room={snapshot} actions={actions} contactHref={contactHref} />
      ) : null}
      {snapshot.roomState === 'between_rounds' ? (
        <BetweenRoundsScreen room={snapshot} contactHref={contactHref} />
      ) : null}
      {snapshot.roomState === 'complete' ? <CompleteScreen room={snapshot} contactHref={contactHref} /> : null}
    </Shell>
  )
}
