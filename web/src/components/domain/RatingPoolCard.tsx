import { Eyebrow } from '@/components/ui/Eyebrow'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { Surface } from '@/components/ui/Surface'
import type { RatingPoolSummary } from '@/lib/api/types/rating'
import { formatRatingDelta } from '@/lib/format/rating'

interface RatingPoolCardProps {
  summary: RatingPoolSummary
  /** Marks the pool currently shown in the chart; text "Selected" accompanies the copper rule (never colour alone). */
  selected?: boolean
  className?: string
}

const POOL_LABEL = { blitz: 'Blitz', rapid: 'Rapid', classical: 'Classical' } as const

/**
 * One rating pool (Blitz, Rapid or Classical): never blended. States are words: "Unrated", "Provisional" (few games,
 * high RD) and established. RD is explained in text. Server Component; selection behaviour belongs to the parent.
 */
export function RatingPoolCard({ summary, selected = false, className }: RatingPoolCardProps) {
  const label = POOL_LABEL[summary.pool]
  return (
    <Surface
      as="article"
      aria-label={`${label} rating`}
      className={`${selected ? 'border-t-4 border-t-copper' : ''} ${className ?? ''}`.trim()}
    >
      <div className="flex min-w-0 flex-wrap items-center justify-between gap-2">
        <Eyebrow as="p">{label}</Eyebrow>
        {selected ? <StatusBadge tone="copper">Selected</StatusBadge> : null}
      </div>
      {summary.state === 'unrated' ? (
        <>
          <p className="mt-2 font-display text-3xl leading-none">Unrated</p>
          <p className="mt-2 text-sm text-muted">
            No rated games in this pool yet. Play a rated event to get a rating.
          </p>
        </>
      ) : (
        <>
          <p className="mt-2 font-display text-3xl leading-none">{summary.rating}</p>
          <p className="mt-2 flex flex-wrap items-center gap-2 text-sm text-muted">
            <span>
              {summary.games} {summary.games === 1 ? 'game' : 'games'} · RD {summary.rd}
            </span>
            {summary.state === 'provisional' ? <StatusBadge tone="warning">Provisional</StatusBadge> : null}
            {summary.lastChange === null ? null : (
              <span>
                Last change <strong className="font-mono text-ink">{formatRatingDelta(summary.lastChange)}</strong>
              </span>
            )}
          </p>
          <p className="mt-2 text-sm text-muted">
            RD is rating deviation: lower means PG has more recent information about your strength.
            {summary.state === 'provisional' ? ' Your rating will settle as you play more games.' : ''}
          </p>
        </>
      )}
    </Surface>
  )
}
