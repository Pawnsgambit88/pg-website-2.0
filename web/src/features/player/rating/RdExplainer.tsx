import { Eyebrow } from '@/components/ui/Eyebrow'
import { Surface } from '@/components/ui/Surface'
import { Text } from '@/components/ui/Text'
import type { RatingPoolSummary } from '@/lib/api/types/rating'

/**
 * Plain-language RD / provisional explanation (screen 30 explainer). Static copy, one paragraph per idea, no jargon
 * without a definition. Server-safe.
 */
export function RdExplainer({ summary }: { summary: RatingPoolSummary }) {
  return (
    <Surface as="aside" aria-label="How to read your rating">
      <Eyebrow>HOW TO READ THIS</Eyebrow>
      <Text className="mt-2">
        Your rating is PG&apos;s best estimate of your strength. RD (rating deviation) says how sure that estimate is: a
        lower RD means PG has more recent information about how you play.
      </Text>
      {summary.state === 'provisional' ? (
        <Text className="mt-2">
          Provisional means you have played only a few rated games in this pool. Your rating moves more after each game
          until PG knows you better, then it settles.
        </Text>
      ) : null}
      {summary.state === 'unrated' ? (
        <Text className="mt-2">You get a rating in this pool after your first rated game.</Text>
      ) : null}
      <Text className="mt-2">Blitz, Rapid and Classical are separate pools. They are never added together.</Text>
    </Surface>
  )
}
