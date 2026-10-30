import { z } from 'zod'
import { paginationWireSchema } from '@/lib/api/types/pagination'
import { isoInstantSchema } from '@/lib/api/types/primitives'

// Unified response envelope (backend contract 2.1, DEC-011). Envelope keys are snake_case, `data` keys camelCase (DEC-B03).
// These are the WIRE SCHEMAS only. Detection, the legacy-bare normaliser and ApiError live in lib/api/envelope.ts and
// lib/api/errors.ts (TASK-014), which import from here so there is one definition.

export const envelopeMetaSchema = z.object({
  request_id: z.string().min(1).max(128),
  timestamp: isoInstantSchema.optional(),
  pagination: paginationWireSchema.nullish(),
})
export type EnvelopeMeta = z.infer<typeof envelopeMetaSchema>

/** `error.code` stays a plain string on the wire: an unknown code must still parse and fall back to HTTP copy. */
export const envelopeErrorSchema = z.object({
  code: z.string().min(1).max(64),
  detail: z.string().max(2000).nullish(),
  fields: z.record(z.string(), z.array(z.string().max(500))).nullish(),
  retry_after: z.int().min(0).nullish(),
  /**
   * Why an AUTH_REQUIRED happened (contract 2.4: REFRESH_REUSED, SESSION_EXPIRED, ROLE_CHANGED, ACCOUNT_SUSPENDED).
   * Plain string on the wire so an unknown reason still parses; `ApiError` narrows it with `authFailureReasonSchema`.
   * Added by TASK-014 (TASK-125 note); optional, so existing payloads and fixtures are unaffected.
   */
  reason: z.string().max(64).nullish(),
})
export type EnvelopeError = z.infer<typeof envelopeErrorSchema>

/** Success envelope for a payload schema. */
export function successEnvelopeSchema<T extends z.ZodType>(data: T) {
  return z.object({
    success: z.literal(true),
    message: z.string().nullish(),
    data,
    error: z.null().optional(),
    meta: envelopeMetaSchema,
  })
}

export const failureEnvelopeSchema = z.object({
  success: z.literal(false),
  message: z.string().nullish(),
  data: z.null().optional(),
  error: envelopeErrorSchema,
  meta: envelopeMetaSchema,
})
export type FailureEnvelope = z.infer<typeof failureEnvelopeSchema>

export interface SuccessEnvelope<T> {
  success: true
  message?: string | null
  data: T
  error?: null
  meta: EnvelopeMeta
}
