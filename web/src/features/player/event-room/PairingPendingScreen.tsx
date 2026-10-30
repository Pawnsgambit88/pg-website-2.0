'use client'

import { formatTimeRange } from '@/lib/format/date'
import { HelpPanel } from '@/features/player/event-room/HelpPanel'
import { PanelFacts } from '@/features/player/event-room/PanelFacts'
import { StatePanel } from '@/features/player/event-room/StatePanel'
import { WhatHappensNextPanel } from '@/features/player/event-room/WhatHappensNextPanel'
import type { RoomSnapshot } from '@/features/player/event-room/room-state'

type Of<S extends RoomSnapshot['roomState']> = Extract<RoomSnapshot, { roomState: S }>

export function PairingPendingScreen({
  room,
  contactHref,
}: {
  room: Of<'pairing_pending'>
  contactHref?: string | null
}) {
  return (
    <>
      <StatePanel
        eyebrow="YOU'RE CHECKED IN"
        title="Pairing is being prepared."
        extra={
          <PanelFacts
            rows={[
              { label: 'Status', value: 'Ready to pair' },
              ...(room.checkIn.status === 'checked_in'
                ? [{ label: 'Checked in', value: formatTimeRange(room.checkIn.at) }]
                : []),
            ]}
          />
        }
      >
        No refresh needed. This room updates as soon as your board and opponent are published.
      </StatePanel>
      <WhatHappensNextPanel snapshot={room} />
      <HelpPanel contactHref={contactHref} />
    </>
  )
}
