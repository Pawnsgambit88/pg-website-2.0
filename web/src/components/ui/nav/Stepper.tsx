'use client'

import { Check } from '@/components/ui/icons/Check'
import { cn } from '@/lib/cn'

export interface StepperStep {
  id: string
  label: string
  /** Validation failed on this step: shown as "needs attention" with a "!" mark and text, not colour alone. */
  error?: boolean
}

export type StepState = 'complete' | 'current' | 'upcoming' | 'error'

interface StepperProps {
  steps: readonly StepperStep[]
  /** Id of the current step. */
  current: string
  /** Accessible name of the navigation landmark ("Event builder steps"). */
  label: string
  /**
   * Makes steps clickable. `true` allows all, a function decides per step (e.g. only visited or valid steps).
   * The current step is never a button. Omit for a read-only indicator. Needs `onStepSelect`.
   */
  canSelect?: boolean | ((stepId: string) => boolean)
  onStepSelect?: (stepId: string) => void
  className?: string
}

const STATE_TEXT: Record<StepState, string> = {
  complete: 'Complete',
  current: 'Current step',
  upcoming: 'Not started',
  error: 'Needs attention',
}

function stateOf(step: StepperStep, index: number, currentIndex: number): StepState {
  if (step.error === true) return 'error'
  if (index === currentIndex) return 'current'
  return index < currentIndex ? 'complete' : 'upcoming'
}

function renderMarker(state: StepState, number: number) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        'inline-flex size-7 shrink-0 items-center justify-center rounded-full border font-mono text-xs',
        state === 'complete' && 'border-success bg-success text-warm-white',
        state === 'current' && 'border-forest bg-forest text-parchment',
        state === 'upcoming' && 'border-stone bg-transparent text-ink-soft',
        state === 'error' && 'border-danger bg-danger/10 text-danger-ink',
      )}
    >
      {state === 'complete' ? <Check size="sm" /> : state === 'error' ? '!' : number}
    </span>
  )
}

/**
 * Builder stepper (ARCH-001 15; reference Event Builder, 8 steps). One ordered list, `aria-current="step"` on the
 * current item, and each state spelled out in text for assistive tech (and by icon/mark for sight):
 * complete = tick, current = number on a filled disc + bold label, upcoming = outlined number, error = "!".
 * Below 720px only the compact summary is shown ("Step 3 of 8: Registration") with a progress bar, since the builder
 * is one step at a time there; from 720px the full horizontal list appears (labels truncate before they overflow).
 * Steps are buttons only when `canSelect` allows; the current step is not. Client Component (click handler).
 */
export function Stepper({ steps, current, label, canSelect, onStepSelect, className }: StepperProps) {
  const currentIndex = Math.max(
    0,
    steps.findIndex((step) => step.id === current),
  )
  const total = steps.length
  const currentStep = steps[currentIndex]

  function selectable(step: StepperStep, index: number): boolean {
    if (onStepSelect === undefined || canSelect === undefined || canSelect === false || index === currentIndex)
      return false
    return canSelect === true ? true : canSelect(step.id)
  }

  return (
    <nav aria-label={label} className={className}>
      <div className="sm:hidden">
        <p className="type-button text-ink">
          Step {currentIndex + 1} of {total}
          {currentStep ? <span className="text-ink-soft">: {currentStep.label}</span> : null}
        </p>
        <div
          role="progressbar"
          aria-label={`${label} progress`}
          aria-valuemin={1}
          aria-valuemax={total}
          aria-valuenow={currentIndex + 1}
          aria-valuetext={`Step ${currentIndex + 1} of ${total}`}
          className="mt-2 h-1 overflow-hidden rounded-full bg-line"
        >
          <div
            className="h-full bg-forest"
            style={{ width: `${total === 0 ? 0 : ((currentIndex + 1) / total) * 100}%` }}
          />
        </div>
      </div>
      <ol className="hidden items-start gap-2 sm:flex">
        {steps.map((step, index) => {
          const state = stateOf(step, index, currentIndex)
          const isCurrent = index === currentIndex
          const body = (
            <>
              {renderMarker(state, index + 1)}
              <span className={cn('min-w-0 truncate', isCurrent && 'font-semibold')}>
                {step.label}
                <span className="sr-only">. {STATE_TEXT[state]}</span>
              </span>
            </>
          )
          const itemClass = 'type-button flex min-h-11 w-full min-w-0 items-center gap-2 px-1 text-left'
          return (
            <li key={step.id} aria-current={isCurrent ? 'step' : undefined} className="min-w-0 flex-1">
              {selectable(step, index) ? (
                <button
                  type="button"
                  onClick={() => onStepSelect?.(step.id)}
                  className={cn(itemClass, 'rounded-public text-ink hover:bg-line')}
                >
                  {body}
                </button>
              ) : (
                <div className={cn(itemClass, isCurrent ? 'text-ink' : 'text-ink-soft')}>{body}</div>
              )}
            </li>
          )
        })}
      </ol>
    </nav>
  )
}
