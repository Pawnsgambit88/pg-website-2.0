'use client'

import { Button } from '@/components/ui/Button'
import type { BuilderStepDefinition } from '@/features/event-builder/types'
import type { StepperProps } from '@/features/event-builder/stepper-types'

function labelFor(step: BuilderStepDefinition, index: number, blockers: number | undefined, reachable: boolean) {
  return (
    <>
      <span aria-hidden="true">{index + 1}. </span>
      {step.label}
      {blockers ? <span className="font-normal"> ({blockers} to fix)</span> : null}
      {reachable ? null : <span className="sr-only"> (finish the earlier steps first)</span>}
    </>
  )
}

export function StepButtons({
  steps,
  current,
  reachable,
  blockerCounts,
  onSelect,
  stretch,
}: StepperProps & { stretch: boolean }) {
  return (
    <ol className={stretch ? 'flex flex-col gap-1' : 'flex flex-wrap gap-2'}>
      {steps.map((step, index) => {
        const allowed = reachable.has(step.id)
        return (
          <li key={step.id} className="min-w-0">
            <Button
              variant={step.id === current ? 'primary' : 'ghost'}
              size="lg"
              fullWidth={stretch}
              disabled={!allowed}
              aria-describedby={undefined}
              onClick={allowed ? () => onSelect(step.id) : undefined}
              className={stretch ? 'justify-start' : undefined}
            >
              {labelFor(step, index, blockerCounts[step.id], allowed)}
            </Button>
          </li>
        )
      })}
    </ol>
  )
}
