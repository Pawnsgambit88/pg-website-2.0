'use client'

import { BoardCard } from '@/components/domain/BoardCard'
import { Eyebrow } from '@/components/ui/Eyebrow'
import { Heading } from '@/components/ui/Heading'
import { Surface } from '@/components/ui/Surface'
import { TextLink } from '@/components/ui/TextLink'
import type { LinkHref } from '@/components/ui/linkHref'
import { HelpPanel } from '@/features/player/event-room/HelpPanel'
import { ResultActions } from '@/features/player/event-room/ResultActions'
import { StandingsList } from '@/features/player/event-room/StandingsList'
import { StatePanel } from '@/features/player/event-room/StatePanel'
import { WhatHappensNextPanel } from '@/features/player/event-room/WhatHappensNextPanel'
import type { LiveRoom } from '@/features/player/event-room/room-state'
import type { useEventRoomActions } from '@/features/player/event-room/useEventRoomActions'

type Actions = ReturnType<typeof useEventRoomActions>

export function LiveRoundScreen({
  room,
  actions,
  contactHref,
}: {
  room: LiveRoom
  actions: Actions
  contactHref?: string | null
}) {
  const deskHref: LinkHref =
    typeof contactHref === 'string' && contactHref.length > 0 ? (contactHref as LinkHref) : '/contact'

  if (room.pairing === null) {
    return (
      <>
        <StatePanel
          eyebrow={room.bye === null ? 'ROUND LIVE' : `ROUND ${room.bye.round} - BYE`}
          title={room.bye === null ? 'Your pairing is not shown yet.' : 'You have a bye this round.'}
        >
          {room.bye === null
            ? 'The round is on. If you do not see a board soon, ask the host at the desk.'
            : 'You do not play this round and there is no result to send. You are still in the event.'}
        </StatePanel>
        <StandingsList rows={room.standings} myPlace={null} />
        <WhatHappensNextPanel snapshot={room} />
        <HelpPanel contactHref={contactHref} />
      </>
    )
  }
  return (
    <>
      <BoardCard
        pairing={{
          ...room.pairing,
          opponent: { ...room.pairing.opponent, rating: room.pairing.opponent.rating?.value ?? null },
        }}
      />
      <Surface as="section" aria-labelledby="result-heading">
        <Eyebrow>YOUR RESULT</Eyebrow>
        <Heading level={2} size="card" id="result-heading" className="mt-1">
          {room.result.state === 'final' ? 'Game finished' : 'When your game ends'}
        </Heading>
        <div className="mt-3">
          <ResultActions room={room} actions={actions} />
        </div>
        <div className="mt-4">
          {/* "Pairing issue?" points at the desk contact (EV-06 PLAN-003) */}
          <TextLink href={deskHref} inline>
            Pairing issue?
          </TextLink>
        </div>
      </Surface>
      <StandingsList rows={room.standings} myPlace={null} />
      <WhatHappensNextPanel snapshot={room} />
      <HelpPanel contactHref={contactHref} />
    </>
  )
}
