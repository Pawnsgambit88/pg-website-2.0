import { z } from 'zod'
import { capabilityFlagSchema } from '@/lib/api/types/admin/common'
import { paymentOrderStateSchema } from '@/lib/api/types/payment'
import { emailSchema, isoInstantSchema, plainText, uuidSchema, versionSchema } from '@/lib/api/types/primitives'
import { registrationStatusSchema } from '@/lib/api/types/registration'

// Control room registrations (contract C02, C03, screen 47). This is the ONLY place registration PII (email, phone) is
// returned, and only to admins. Registration and payment state change ONLY through the action endpoint and the refund
// endpoint, never by a free-form status patch (DEC-B04).

export const adminRegistrationsQuerySchema = z.strictObject({
  /** Name, phone or registration id. */
  q: z.string().trim().min(1).max(100).optional(),
  payment: paymentOrderStateSchema.optional(),
  status: registrationStatusSchema.optional(),
  firstTimer: z.boolean().optional(),
  page: z.int().min(1).optional(),
  pageSize: z.int().min(1).max(100).optional(),
})
export type AdminRegistrationsQuery = z.infer<typeof adminRegistrationsQuerySchema>

/** Row actions of C03. `reason` is required where a player is affected (cancel, move to waitlist). */
export const REGISTRATION_ACTIONS = [
  'cancel',
  'move_to_waitlist',
  'promote',
  'mark_welcomed',
  'set_pairing_active',
] as const
export const registrationActionSchema = z.enum(REGISTRATION_ACTIONS)
export type RegistrationAction = z.infer<typeof registrationActionSchema>

export const adminRegistrationCapabilitiesSchema = z.object({
  canCancel: capabilityFlagSchema,
  canMoveToWaitlist: capabilityFlagSchema,
  canPromote: capabilityFlagSchema,
  canMarkWelcomed: capabilityFlagSchema,
  canSetPairingActive: capabilityFlagSchema,
})

export const adminRegistrationSchema = z.object({
  id: uuidSchema,
  playerId: uuidSchema,
  name: plainText(80),
  email: emailSchema,
  phone: z
    .string()
    .regex(/^\+?[0-9 ()-]{7,20}$/)
    .nullable(),
  rating: z.int().min(0).max(4000).nullable(),
  firstTimer: z.boolean(),
  status: registrationStatusSchema,
  /** Null for a free event (no payment). */
  paymentState: paymentOrderStateSchema.nullable(),
  checkedInAt: isoInstantSchema.nullable(),
  welcomed: z.boolean(),
  pairingActive: z.boolean(),
  registeredAt: isoInstantSchema,
  capabilities: adminRegistrationCapabilitiesSchema,
  version: versionSchema,
})
export type AdminRegistrationDto = z.infer<typeof adminRegistrationSchema>

/** `POST .../registrations/{regId}/actions` (C03). Strict: nothing but the action and a reason. */
export const registrationActionInputSchema = z
  .strictObject({ action: registrationActionSchema, reason: z.string().trim().min(1).max(500).optional() })
  .refine((value) => !['cancel', 'move_to_waitlist'].includes(value.action) || value.reason !== undefined, {
    message: 'A reason is required to cancel or move a player to the waitlist',
    path: ['reason'],
  })
export type RegistrationActionInput = z.infer<typeof registrationActionInputSchema>
