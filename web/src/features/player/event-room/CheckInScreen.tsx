'use client'

import { Banner } from '@/components/ui/feedback/Banner'
import { Button } from '@/components/ui/Button'
import { Text } from '@/components/ui/Text'
import { copyFor } from '@/lib/api/error-copy'
import { formatTimeRange } from '@/lib/format/date'
import { HelpPanel } from '@/features/player/event-room/HelpPanel'
import { StatePanel } from '@/features/player/event-room/StatePanel'
import { WhatHappensNextPanel } from '@/features/player/event-room/WhatHappensNextPanel'
import { disabledReason, type RoomSnapshot } from '@/features/player/event-room/room-state'
import type { useEventRoomActions } from '@/features/player/event-room/useEventRoomActions'

type Actions = ReturnType<typeof useEventRoomActions>
type Of<S extends RoomSnapshot['roomState']> = Extract<RoomSnapshot, { roomState: S }>

export function CheckInScreen({
  room,
  actions,
  contactHref,
}: {
  room: Of<'checkin_open'>
  actions: Actions
  contactHref?: string | null
}) {
  const manual = room.checkIn.status === 'manual_required'
  const reason = disabledReason(room, 'canCheckIn')
  const error = actions.checkIn.error
  const copy = error === null ? null : copyFor(error, { action: 'check you in' })
  return (
    <>
      <StatePanel
        eyebrow={manual ? 'CHECK IN AT THE DESK' : 'CHECK-IN OPEN'}
        title={manual ? 'Check in with the host.' : "You're at the venue. Tell us."}
        extra={
          manual ? (
            <Text tone="on-dark">
              {room.checkIn.status === 'manual_required'
                ? room.checkIn.reason
                : 'The host will mark you present at the desk.'}
            </Text>
          ) : (
            <>
              <Button
                variant="copper"
                size="lg"
                fullWidth
                disabled={!room.capabilities.canCheckIn}
                loading={actions.checkIn.isPending}
                loadingLabel="Checking you in"
                aria-describedby={!room.capabilities.canCheckIn ? 'checkin-hint' : undefined}
                onClick={() => actions.checkIn.mutate()}
              >
                I&rsquo;m at the venue →
              </Button>
              {!room.capabilities.canCheckIn && (
                <Text tone="on-dark" variant="small" id="checkin-hint">
                  {reason ?? 'Check-in is not available right now.'}
                  {room.checkIn.status === 'open' && room.checkIn.closesAt !== null
                    ? ` Check-in closes at ${formatTimeRange(room.checkIn.closesAt)}.`
                    : ''}
                </Text>
              )}
            </>
          )
        }
      >
        {manual
          ? 'This event uses desk check-in, so there is nothing to tap here. Your pairing appears when the host has checked you in.'
          : 'Tap once. The host desk sees you immediately and your pairing eligibility updates.'}
      </StatePanel>
      {copy === null ? null : (
        <Banner tone="danger" live="alert" title={copy.title}>
          {copy.body}
        </Banner>
      )}
      <WhatHappensNextPanel snapshot={room} />
      <HelpPanel contactHref={contactHref} />
    </>
  )
}
