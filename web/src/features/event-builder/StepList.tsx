'use client'

import type { StepperProps } from '@/features/event-builder/stepper-types'

// builder-step-list style (reference screen 38): bordered card, mono step numbers, copper left-bar on active.

/** Vertical step list: 1024px and up, left column. */
export function StepList({ steps, current, reachable, blockerCounts, onSelect }: StepperProps) {
  return (
    <nav
      aria-label="Event steps"
      className="hidden lg:sticky lg:top-4 lg:block lg:self-start border border-line-admin bg-admin-panel"
    >
      <ol>
        {steps.map((step, index) => {
          const isActive = step.id === current
          const isReachable = reachable.has(step.id)
          const blockers = blockerCounts[step.id]

          return (
            <li key={step.id} className="border-b border-line-admin last:border-b-0">
              <button
                type="button"
                disabled={!isReachable}
                onClick={isReachable ? () => onSelect(step.id) : undefined}
                aria-current={isActive ? 'step' : undefined}
                className={[
                  'flex w-full items-center gap-[10px] px-3 py-[14px] text-left text-[0.82rem] transition-colors',
                  isActive
                    ? 'font-semibold text-ink shadow-[inset_3px_0_0_var(--color-copper)]'
                    : isReachable
                      ? 'text-muted hover:text-ink'
                      : 'cursor-default text-muted opacity-40',
                ].join(' ')}
              >
                <span aria-hidden="true" className="shrink-0 font-mono text-[0.6rem] font-normal">
                  {String(index + 1).padStart(2, '0')}
                </span>
                <span>
                  {step.label}
                  {blockers ? (
                    <span className="ml-1 text-[0.75rem] font-normal text-warning-ink">
                      ({blockers})
                    </span>
                  ) : null}
                  {!isReachable ? (
                    <span className="sr-only"> (finish the earlier steps first)</span>
                  ) : null}
                </span>
              </button>
            </li>
          )
        })}
      </ol>
    </nav>
  )
}
