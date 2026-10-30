import type { ZodType } from 'zod'
import {
  basicsStepSchema,
  communicationsStepSchema,
  experienceStepSchema,
  gameSystemStepSchema,
  mediaStepSchema,
  paymentStepSchema,
  registrationStepSchema,
  updateBuilderDraftSchema,
} from '@/lib/api/types/admin/event-builder'
import type { StepDataKey } from '@/features/event-builder/types'

// Zod schemas per step, kept apart from the step registry so step components can import them without a cycle.
// FORM schemas validate read-shape values (what the step form edits). PATCH schemas validate the write shape that travels.

export const STEP_FORM_SCHEMAS: Readonly<Record<StepDataKey, ZodType>> = {
  basics: basicsStepSchema,
  experience: experienceStepSchema,
  registration: registrationStepSchema,
  payment: paymentStepSchema,
  gameSystem: gameSystemStepSchema,
  media: mediaStepSchema,
  communications: communicationsStepSchema,
}

/** Partial, strict write schema of one step (E04). Used to keep half-typed invalid values out of the autosave. */
export function patchSchemaFor(key: StepDataKey): ZodType {
  return updateBuilderDraftSchema.shape[key].unwrap() as unknown as ZodType
}
