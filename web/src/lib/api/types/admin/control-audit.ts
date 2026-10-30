import { z } from 'zod'
import { adminActorSchema } from '@/lib/api/types/admin/common'
import { isoInstantSchema, plainText, uuidSchema } from '@/lib/api/types/primitives'

// Event audit log (contract C17, screen 53; 6.5). Time-ordered, read-only. `?format=csv` is a log export, distinct from the
// dropped player CSV export (FEAT-001 OQ-18); the browser downloads it as a Blob through the same client and the CSV is
// not parsed here. Before/after values are summaries, never raw rows, so no PII or secret can ride in an audit entry.

export const AUDIT_ACTIONS = [
  'event.created',
  'event.updated',
  'event.published',
  'event.unpublished',
  'event.cancelled',
  'event.completed',
  'registration.cancelled',
  'registration.moved_to_waitlist',
  'registration.promoted',
  'checkin.set',
  'round.generated',
  'round.edited',
  'round.published',
  'round.started',
  'round.finalised',
  'result.recorded',
  'result.resolved',
  'payment.refunded',
  'message.sent',
  'archive.published',
] as const
export const auditActionSchema = z.enum(AUDIT_ACTIONS)
export type AuditAction = z.infer<typeof auditActionSchema>

export const auditQuerySchema = z.strictObject({
  actor: uuidSchema.optional(),
  action: auditActionSchema.optional(),
  from: isoInstantSchema.optional(),
  to: isoInstantSchema.optional(),
  page: z.int().min(1).optional(),
  pageSize: z.int().min(1).max(100).optional(),
})
export type AuditQuery = z.infer<typeof auditQuerySchema>

export const auditEntrySchema = z.object({
  id: uuidSchema,
  at: isoInstantSchema,
  actor: adminActorSchema,
  action: auditActionSchema,
  /** The object the action applied to, as text ("Round 2", "Registration of Asha K"). */
  object: plainText(200),
  /** Short before/after summary for a reason or a change. Null when there is nothing to add. */
  summary: plainText(500).nullable(),
})
export type AuditEntryDto = z.infer<typeof auditEntrySchema>

/** Export request: the CSV is a download, so the method returns a Blob and not a parsed payload. */
export const AUDIT_EXPORT_FORMAT = 'csv' as const
