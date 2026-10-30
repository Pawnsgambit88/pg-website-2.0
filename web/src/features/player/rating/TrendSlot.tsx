import { Eyebrow } from '@/components/ui/Eyebrow'
import { Surface } from '@/components/ui/Surface'
import { Text } from '@/components/ui/Text'
import type { RatingPool } from '@/lib/api/types/identity'
import { POOL_LABEL } from '@/features/player/rating/rating-labels'

/**
 * PLACEHOLDER SLOT for TASK-067 (lazy rating trend chart). The chart arrives as a `next/dynamic` client chunk rendered
 * here; keep this wrapper so the page layout does not change. Replace only the body.
 */
export function TrendSlot({ pool }: { pool: RatingPool }) {
  return (
    <Surface as="section" aria-label={`${POOL_LABEL[pool]} rating movement`}>
      <Eyebrow>RATING MOVEMENT</Eyebrow>
      <Text variant="small" className="mt-2">
        The {POOL_LABEL[pool]} movement chart is coming soon. The ledger lists every change in the meantime.
      </Text>
    </Surface>
  )
}
