'use client'

import { Text } from '@/components/ui/Text'
import { formatRatingDelta } from '@/lib/format/rating'
import type { CompleteRoom } from '@/features/player/event-room/room-state'

export function RatingMovement({ room }: { room: CompleteRoom }) {
  const rating = room.ratingProcessing
  if (rating.status === 'not_rated') {
    return <Text tone="on-dark">This was a social event, so there is no rating change.</Text>
  }
  if (rating.status === 'pending') {
    return (
      <Text tone="on-dark">Your rating update is being processed. This page refreshes by itself when it is ready.</Text>
    )
  }
  return (
    <>
      <p className="font-display text-section leading-none text-copper-soft">{formatRatingDelta(rating.delta)}</p>
      <Text tone="on-dark" variant="small">
        {rating.before} → {rating.after} ({rating.pool} rating)
      </Text>
    </>
  )
}
