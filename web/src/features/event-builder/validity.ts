import { overlayStep } from '@/features/event-builder/patch'
import { BUILDER_STEP_DEFINITIONS } from '@/features/event-builder/steps'
import type { BuilderState } from '@/features/event-builder/store'
import type { BuilderStep } from '@/lib/api/types/admin/event-builder'

// Which data steps currently pass their form schema (server resource plus unsent edits). Returned as ONE joined string so
// a subscriber re-renders only when the set changes, not on every keystroke (rerender-derived-state).

let lastServer: BuilderState['server'] | null = null
let lastPending: BuilderState['pending'] | null = null
let lastResult = ''

export function validStepKey(state: BuilderState): string {
  if (state.server === lastServer && state.pending === lastPending) return lastResult
  const valid: BuilderStep[] = []
  for (const step of BUILDER_STEP_DEFINITIONS) {
    if (step.dataKey === null || step.schema === null) {
      valid.push(step.id)
      continue
    }
    const values = overlayStep(step.dataKey, state.server[step.dataKey], state.pending[step.dataKey])
    if (step.schema.safeParse(values).success) valid.push(step.id)
  }
  lastServer = state.server
  lastPending = state.pending
  lastResult = valid.join(',')
  return lastResult
}

export function parseValidSteps(key: string): ReadonlySet<BuilderStep> {
  return new Set(key === '' ? [] : (key.split(',') as BuilderStep[]))
}
