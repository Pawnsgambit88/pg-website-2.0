'use client'

import { formatTimeRange } from '@/lib/format/date'
import { formatOrdinal } from '@/lib/format/rating'
import { HelpPanel } from '@/features/player/event-room/HelpPanel'
import { PanelFacts } from '@/features/player/event-room/PanelFacts'
import { StatePanel } from '@/features/player/event-room/StatePanel'
import { StandingsList } from '@/features/player/event-room/StandingsList'
import { WhatHappensNextPanel } from '@/features/player/event-room/WhatHappensNextPanel'
import type { BetweenRoom } from '@/features/player/event-room/room-state'

export function BetweenRoundsScreen({ room, contactHref }: { room: BetweenRoom; contactHref?: string | null }) {
  const place = room.score.place
  const placeLabel = place === null ? 'Not ranked yet' : `Currently ${formatOrdinal(place)}`
  return (
    <>
      <StatePanel
        eyebrow="ROUND COMPLETE"
        title="Result saved. Next pairing is being prepared."
        extra={
          <>
            {/* Score in reference format: "1.5 / 2, Currently 8th" */}
            <div>
              <p className="font-display text-3xl leading-none">
                {room.score.points} / {room.score.roundsPlayed}
              </p>
              <p className="mt-1 text-sm text-parchment-muted">{placeLabel}</p>
            </div>
            <PanelFacts
              rows={[
                ...(room.nextRoundAt === null
                  ? []
                  : [{ label: 'Next round', value: formatTimeRange(room.nextRoundAt) }]),
              ]}
            />
          </>
        }
      >
        You do not need to refresh. We&rsquo;ll update this room when the next board is published.
      </StatePanel>
      <StandingsList rows={room.standings} myPlace={room.score.place} />
      <WhatHappensNextPanel snapshot={room} />
      <HelpPanel contactHref={contactHref} />
    </>
  )
}
