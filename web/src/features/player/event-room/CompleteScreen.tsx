'use client'

import type { Route } from 'next'
import { Button } from '@/components/ui/Button'
import { HelpPanel } from '@/features/player/event-room/HelpPanel'
import { PanelFacts } from '@/features/player/event-room/PanelFacts'
import { RatingMovement } from '@/features/player/event-room/RatingMovement'
import { StandingsList } from '@/features/player/event-room/StandingsList'
import { StatePanel } from '@/features/player/event-room/StatePanel'
import { WhatHappensNextPanel } from '@/features/player/event-room/WhatHappensNextPanel'
import { deriveCompleteHeadline, type CompleteRoom } from '@/features/player/event-room/room-state'
import { formatOrdinal } from '@/lib/format/rating'

export function CompleteScreen({ room, contactHref }: { room: CompleteRoom; contactHref?: string | null }) {
  const complete = room.ratingProcessing.status === 'complete'
  const place = room.score.place
  return (
    <>
      <StatePanel
        eyebrow="EVENT COMPLETE"
        title={deriveCompleteHeadline(room.score.roundsPlayed)}
        extra={
          <>
            <PanelFacts
              rows={[
                {
                  label: 'Final score',
                  value: `${room.score.points} / ${room.score.roundsPlayed}`,
                },
                {
                  label: 'Final place',
                  value: place === null ? 'Not ranked' : formatOrdinal(place),
                },
              ]}
            />
            <RatingMovement room={room} />
            <div className="flex flex-col gap-3 xs:flex-row xs:flex-wrap">
              {complete ? (
                <Button href="/app/rating" variant="copper">
                  See rating movement →
                </Button>
              ) : null}
              <Button href={`/events/${encodeURIComponent(room.eventSlug)}` as Route} variant="secondary">
                Event results and archive
              </Button>
            </div>
          </>
        }
      >
        Your rating update and game ledger are now available.
      </StatePanel>
      <StandingsList rows={room.standings} myPlace={room.score.place} />
      <WhatHappensNextPanel snapshot={room} />
      <HelpPanel contactHref={contactHref} />
    </>
  )
}
