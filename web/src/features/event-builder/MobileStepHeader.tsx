'use client'

import { Button } from '@/components/ui/Button'
import { Sheet } from '@/components/ui/overlay/Sheet'
import { StepButtons } from '@/features/event-builder/StepButtons'
import type { StepperProps } from '@/features/event-builder/stepper-types'

interface MobileHeaderProps extends StepperProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

/** Phone header: "Step n of N" with a menu sheet of all steps. */
export function MobileStepHeader({ open, onOpenChange, ...props }: MobileHeaderProps) {
  const index = props.steps.findIndex((step) => step.id === props.current)
  const label = props.steps[index]?.label ?? ''
  return (
    <div className="flex items-center justify-between gap-3 sm:hidden">
      <p className="min-w-0 text-sm text-muted">
        Step {index + 1} of {props.steps.length}: {label}
      </p>
      <Button
        variant="secondary"
        onClick={() => {
          onOpenChange(true)
        }}
      >
        Steps
      </Button>
      <Sheet open={open} onOpenChange={onOpenChange} side="bottom" title="Steps" closeLabel="Close steps">
        <nav aria-label="Event steps">
          <StepButtons
            {...props}
            stretch
            onSelect={(step) => {
              onOpenChange(false)
              props.onSelect(step)
            }}
          />
        </nav>
      </Sheet>
    </div>
  )
}
