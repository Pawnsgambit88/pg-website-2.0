import { z } from 'zod'
import { isoInstantSchema, plainText, uuidSchema } from '@/lib/api/types/primitives'

// Shared admin building blocks (backend contract 2.5, 2.9, 3.5 to 3.8; ARCH-001 11.1 capability negotiation, AC-84).
// Pure zod, no server-only or browser-only imports.

/** Who did something (audit rows, "updated by", the other editor in a conflict). Name only: no email, no role. */
export const adminActorSchema = z.object({ id: uuidSchema, name: plainText(80) })
export type AdminActor = z.infer<typeof adminActorSchema>

/** A reason something cannot proceed. `code` is a stable machine token; `reason` is the text a disabled control shows. */
export const blockerSchema = z.object({
  code: z.string().min(1).max(64),
  reason: plainText(300),
  /** Dotted field path when the blocker belongs to one field, for example `payment.pricePaise`. */
  field: z.string().min(1).max(120).optional(),
})
export type BlockerDto = z.infer<typeof blockerSchema>

/**
 * Capability flag with a MANDATORY text reason when disabled (contract 2.9, AC-84). The UI renders from this and never
 * infers whether an action is allowed. A discriminated union makes "disabled without a reason" unrepresentable.
 */
export const capabilityFlagSchema = z.discriminatedUnion('allowed', [
  z.object({ allowed: z.literal(true) }),
  z.object({
    allowed: z.literal(false),
    reason: plainText(300),
    blockers: z.array(blockerSchema).max(50).optional(),
  }),
])
export type CapabilityFlag = z.infer<typeof capabilityFlagSchema>

/** "Ready to publish" result: not ready always lists at least one blocker. */
export const publishReadinessSchema = z.discriminatedUnion('ready', [
  z.object({ ready: z.literal(true) }),
  z.object({ ready: z.literal(false), blockers: z.array(blockerSchema).min(1).max(50) }),
])
export type PublishReadiness = z.infer<typeof publishReadinessSchema>

/**
 * Summary of the other editor's change, carried on every versioned admin resource (`lastChange`). When a save fails with
 * VERSION_CONFLICT the UI re-reads the resource and shows this (F-ACMS-003). The error envelope has no slot for it.
 */
export const lastChangeSchema = z.object({
  by: adminActorSchema,
  at: isoInstantSchema,
  summary: plainText(300).nullable(),
})
export type LastChangeDto = z.infer<typeof lastChangeSchema>

/** Authoring text: a draft may hold an empty string; the publish blockers say what is missing. Trimmed, bounded. */
export const draftText = (max: number) => z.string().trim().max(max)

/** Search box value on list queries. */
export const searchTextSchema = z.string().trim().min(1).max(100)

/** Optimistic-concurrency token sent on every versioned write (contract OD-06, F-ACMS-003). */
export const writeVersionSchema = z.int().min(0)

/**
 * Short-lived access token from `POST /auth/step-up` (contract 2.4), valid 5 minutes for ONE sensitive operation (refund,
 * role change, audit export). Branded so a normal access token cannot be passed by accident. Never stored or logged.
 */
export const stepUpTokenSchema = z.string().min(1).max(4096).brand<'StepUpToken'>()
export type StepUpToken = z.infer<typeof stepUpTokenSchema>

/** Draft/published state shared by stories, testimonials and CMS rows (STATE-MACHINES "CMS page/story"). */
export const PUBLICATION_STATUSES = ['draft', 'published'] as const
export const publicationStatusSchema = z.enum(PUBLICATION_STATUSES)
export type PublicationStatus = z.infer<typeof publicationStatusSchema>

/** Result of a publish or unpublish of one entity. */
export const publicationResultSchema = z.object({
  id: uuidSchema,
  status: publicationStatusSchema,
  version: writeVersionSchema,
  at: isoInstantSchema,
})
export type PublicationResult = z.infer<typeof publicationResultSchema>
