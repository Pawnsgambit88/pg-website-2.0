'use client'

import { formatEventDateTime, formatTimeRange } from '@/lib/format/date'
import { HelpPanel } from '@/features/player/event-room/HelpPanel'
import { PanelFacts } from '@/features/player/event-room/PanelFacts'
import { StatePanel } from '@/features/player/event-room/StatePanel'
import { WhatHappensNextPanel } from '@/features/player/event-room/WhatHappensNextPanel'
import type { RoomSnapshot } from '@/features/player/event-room/room-state'

type Of<S extends RoomSnapshot['roomState']> = Extract<RoomSnapshot, { roomState: S }>

export function BeforeCheckInScreen({
  room,
  contactHref,
}: {
  room: Of<'before_checkin'>
  contactHref?: string | null
}) {
  const opensAt = room.checkIn.status === 'not_open' ? room.checkIn.opensAt : null
  return (
    <>
      <StatePanel
        eyebrow="WHEN YOU ARRIVE"
        title="Tell the host you're here. We'll take it from there."
        extra={
          <PanelFacts
            rows={[
              { label: 'Venue', value: room.venue },
              { label: 'Starts', value: formatEventDateTime(room.startsAt) },
              ...(opensAt === null ? [] : [{ label: 'Check-in opens', value: formatTimeRange(opensAt) }]),
            ]}
          />
        }
      >
        Check-in opens 30 minutes before the first game. Your live pairing will appear here as soon as the room is
        ready.
      </StatePanel>
      <WhatHappensNextPanel snapshot={room} />
      <HelpPanel contactHref={contactHref} />
    </>
  )
}
