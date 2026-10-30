import type { ComponentType } from 'react'
import type { ZodType } from 'zod'
import type { BuilderDraftDto, BuilderStep } from '@/lib/api/types/admin/event-builder'
import type { EventType } from '@/lib/api/types/event-state'

// Event Builder shell types (FE-25, TASK-077). Step tasks FE-26..29 depend on `BuilderStepDefinition`, `BuilderStepProps`
// and the hooks in `context.tsx` (`useStepForm`, `useLockedField`, `useBuilderSelector`).

/** Keys of the data-bearing steps on the builder resource (`BuilderDraftDto`). `review` has no data. */
export const STEP_DATA_KEYS = [
  'basics',
  'experience',
  'registration',
  'payment',
  'gameSystem',
  'media',
  'communications',
] as const
export type StepDataKey = (typeof STEP_DATA_KEYS)[number]

/** Read shape of one step (what the step form edits). */
export type StepValues<K extends StepDataKey> = BuilderDraftDto[K]

/** Unsent edits in WRITE shape (the PATCH body of E04 without `version`), for example `{ basics: { title: 'x' } }`. */
export type PendingPatch = Partial<Record<StepDataKey, Record<string, unknown>>>

/** Props every step component receives. Everything else comes from the hooks in `context.tsx`. */
export interface BuilderStepProps {
  stepId: BuilderStep
  /** Null for the read-only `review` step. */
  dataKey: StepDataKey | null
}

export interface BuilderStepDefinition {
  id: BuilderStep
  label: string
  /** The slice of the draft this step edits; null for `review`. */
  dataKey: StepDataKey | null
  /** Zod schema of the step's form values (read shape); null for `review`. */
  schema: ZodType | null
  /** False hides the step for this event type. Hidden values stay in the draft and are never discarded. */
  relevantFor: (type: EventType) => boolean
  /** Lazy (next/dynamic) step body. */
  component: ComponentType<BuilderStepProps>
  /** Starts loading the step chunk (called when the previous step is valid). */
  preload: () => Promise<unknown>
}
