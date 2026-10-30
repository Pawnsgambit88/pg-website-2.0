import { formatEventDate } from '@/lib/format/date'
import { formatRatingDelta } from '@/lib/format/rating'
import { NO_VALUE } from '@/lib/format/placeholder'
import type { GameOutcome } from '@/lib/api/types/rating'

interface ResultRowProps {
  outcome: GameOutcome
  opponentName: string
  /** Event title, optionally with the pool ("Saturday Social · Rapid"). */
  context?: string | null
  /** ISO instant; shown as a date when given. */
  playedAt?: string | null
  /** Rating change; null for unrated and social games (no delta shown). */
  delta?: number | null
  className?: string
}

const OUTCOME = {
  win: { letter: 'W', word: 'Win' },
  draw: { letter: 'D', word: 'Draw' },
  loss: { letter: 'L', word: 'Loss' },
} as const

/**
 * Game ledger row (list item): outcome letter plus the word for assistive technology, opponent, event, date and delta.
 * Colour is never the only cue: the letter and a hidden word carry the result. Render inside a `<ul>`/`<ol>`; add
 * `cv-auto cv-h-row` on the list items for long ledgers. Server Component.
 */
export function ResultRow({ outcome, opponentName, context, playedAt, delta, className }: ResultRowProps) {
  const spec = OUTCOME[outcome] ?? { letter: NO_VALUE, word: 'Result unknown' }
  const name = opponentName.trim() === '' ? NO_VALUE : opponentName
  return (
    <li
      className={`flex min-w-0 items-center gap-4 border-t border-line py-3 cv-auto cv-h-row ${className ?? ''}`.trim()}
    >
      <b
        aria-hidden="true"
        className="inline-grid size-8 shrink-0 place-items-center border border-line font-mono text-sm"
      >
        {spec.letter}
      </b>
      <span className="min-w-0 flex-1">
        <strong className="block font-strong wrap-break-word">
          <span className="sr-only">{spec.word} against </span>
          {name}
        </strong>
        <small className="block text-sm wrap-break-word text-muted">
          {[context, playedAt === null || playedAt === undefined ? null : formatEventDate(playedAt)]
            .filter((part): part is string => typeof part === 'string' && part !== '')
            .join(' · ') || NO_VALUE}
        </small>
      </span>
      <em className="shrink-0 font-mono text-body not-italic">
        {delta === null || delta === undefined ? NO_VALUE : formatRatingDelta(delta)}
      </em>
    </li>
  )
}
