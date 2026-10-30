'use client'

import { StepButtons } from '@/features/event-builder/StepButtons'
import type { StepperProps } from '@/features/event-builder/stepper-types'

/** Compact horizontal stepper: 720 to 1199px. */
export function StepStrip(props: StepperProps) {
  return (
    <nav aria-label="Event steps" className="hidden sm:block lg:hidden">
      <StepButtons {...props} stretch={false} />
    </nav>
  )
}
