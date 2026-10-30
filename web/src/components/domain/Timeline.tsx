import type { ReactNode } from 'react'
import { NO_VALUE } from '@/lib/format/placeholder'

export type TimelineStepState = 'done' | 'current' | 'upcoming'

export interface TimelineItem {
  /** Stable key (not the index of a reorderable list). */
  id: string
  title: string
  /** Time, date or short detail ("5:00 PM IST"), already formatted. */
  meta?: string | null
  state?: TimelineStepState
  /** Optional longer text. */
  children?: ReactNode
}

interface TimelineProps {
  items: readonly TimelineItem[]
  /** Accessible name of the list ("Event schedule"). */
  label: string
  className?: string
}

const STATE_WORD: Record<TimelineStepState, string> = { done: 'Done', current: 'Now', upcoming: 'Next' }

/**
 * Ordered schedule or audit trail (event day, round history, state log). The state is text ("Done", "Now", "Next")
 * as well as the marker style, and the current step carries `aria-current="step"`. Server Component.
 */
export function Timeline({ items, label, className }: TimelineProps) {
  return (
    <ol aria-label={label} className={`flex min-w-0 flex-col ${className ?? ''}`.trim()}>
      {items.map((item) => {
        const state = item.state ?? 'upcoming'
        return (
          <li
            key={item.id}
            aria-current={state === 'current' ? 'step' : undefined}
            className="relative flex min-w-0 gap-4 border-l border-line pb-6 pl-6 last:pb-0"
          >
            <span
              aria-hidden="true"
              className={`absolute top-1 -left-1.5 size-3 rounded-full border border-forest ${
                state === 'done' ? 'bg-forest' : state === 'current' ? 'bg-copper' : 'bg-parchment'
              }`}
            />
            <div className="min-w-0 flex-1">
              <p className="font-mono text-label text-muted uppercase">
                {STATE_WORD[state]} ·{' '}
                {item.meta === null || item.meta === undefined || item.meta === '' ? NO_VALUE : item.meta}
              </p>
              <p className="font-strong wrap-break-word">{item.title}</p>
              {item.children === undefined ? null : (
                <div className="text-sm wrap-break-word text-muted">{item.children}</div>
              )}
            </div>
          </li>
        )
      })}
    </ol>
  )
}
