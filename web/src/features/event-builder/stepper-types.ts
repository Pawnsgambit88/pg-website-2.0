import type { BuilderStepDefinition } from '@/features/event-builder/types'
import type { BuilderStep } from '@/lib/api/types/admin/event-builder'

export interface StepperProps {
  steps: readonly BuilderStepDefinition[]
  current: BuilderStep
  /** Steps the admin may jump to now (visited, or all predecessors valid). */
  reachable: ReadonlySet<BuilderStep>
  /** Publish blockers per step id. */
  blockerCounts: Readonly<Record<string, number>>
  onSelect: (step: BuilderStep) => void
}
