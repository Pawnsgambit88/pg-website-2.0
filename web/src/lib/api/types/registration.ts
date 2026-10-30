import { z } from 'zod'
import { currencySchema, isoInstantSchema, paiseSchema, slugSchema, uuidSchema } from '@/lib/api/types/primitives'
import { paymentSummarySchema } from '@/lib/api/types/payment'
import { profileFieldSchema, profileUpdateSchema } from '@/lib/api/types/profile'

// Registration (STATE-MACHINES "Registration", UI-STATES "Event registration", contract R01 to R08).
//
//   pending -> confirmed (free reservation or verified payment)      pending | confirmed -> cancelled (by policy)
//   confirmed -> refunded (captured payment refunded)                waitlist -> pending | confirmed (a place is offered)
//
// `confirming` is the UI state "payment captured but callback uncertain" (UI-STATES; contract R05 returns it). It is a
// server-computed state of a pending registration, never inferred by the browser. A discriminated union on `status`
// makes the illegal combinations unrepresentable: a hold only exists on `pending`, a waitlist position only on
// `waitlist`, and a refund only after `confirmed`.

export const REGISTRATION_STATUSES = [
  'pending',
  'confirming',
  'confirmed',
  'waitlist',
  'cancelled',
  'refunded',
] as const
export const registrationStatusSchema = z.enum(REGISTRATION_STATUSES)
export type RegistrationStatus = z.infer<typeof registrationStatusSchema>

export const REGISTRATION_TRANSITIONS: Readonly<Record<RegistrationStatus, readonly RegistrationStatus[]>> = {
  pending: ['confirming', 'confirmed', 'cancelled'],
  confirming: ['confirmed', 'cancelled'],
  confirmed: ['cancelled', 'refunded'],
  waitlist: ['pending', 'confirmed', 'cancelled'],
  cancelled: ['refunded'],
  refunded: [],
}

const base = {
  /** Internal registration id: used for order creation, status polling and cancel. Owner only. */
  id: uuidSchema,
  eventId: uuidSchema,
  eventSlug: slugSchema,
  createdAt: isoInstantSchema,
}

const hold = { holdExpiresAt: isoInstantSchema, serverNow: isoInstantSchema }

/** The registration as seen by its owner. Never contains another player's data. */
export const registrationSchema = z.discriminatedUnion('status', [
  z.object({ ...base, status: z.literal('pending'), ...hold, payment: paymentSummarySchema.nullable() }),
  z.object({ ...base, status: z.literal('confirming'), ...hold, payment: paymentSummarySchema }),
  z.object({ ...base, status: z.literal('confirmed'), payment: paymentSummarySchema.nullable() }),
  z.object({
    ...base,
    status: z.literal('waitlist'),
    position: z.int().min(1),
    /** Set while a freed place is on offer to this player (accept via R08). */
    offer: z.object({ expiresAt: isoInstantSchema, serverNow: isoInstantSchema }).nullable(),
  }),
  z.object({
    ...base,
    status: z.literal('cancelled'),
    cancelledAt: isoInstantSchema,
    payment: paymentSummarySchema.nullable(),
  }),
  z.object({ ...base, status: z.literal('refunded'), refundedAt: isoInstantSchema, payment: paymentSummarySchema }),
])
export type RegistrationDto = z.infer<typeof registrationSchema>

// ---------- State resolver (R01) ----------

export const INELIGIBLE_REASONS = ['profile_incomplete', 'event_restricted', 'age_restricted'] as const
export const ineligibleReasonSchema = z.enum(INELIGIBLE_REASONS)

const resolverBase = {
  requiredProfileFields: z.array(profileFieldSchema).max(8),
  serverNow: isoInstantSchema,
}

const priced = { pricePaise: paiseSchema, currency: currencySchema }

/**
 * `GET /events/{slug}/registration` (R01): the registration route renders the panel that matches `state`, and sends no
 * price or currency back (AC-35). `open_free` carries 0 paise and `open_paid` carries a positive amount.
 */
export const registrationStateSchema = z.discriminatedUnion('state', [
  z.object({ state: z.literal('open_free'), ...resolverBase, pricePaise: z.literal(0), currency: currencySchema }),
  z.object({
    state: z.literal('open_paid'),
    ...resolverBase,
    pricePaise: paiseSchema.min(100),
    currency: currencySchema,
    holdMinutes: z.int().min(1).max(60),
  }),
  z.object({ state: z.literal('full_waitlist'), ...resolverBase, ...priced, waitlistPosition: z.int().min(1) }),
  z.object({ state: z.literal('sold_out'), ...resolverBase, ...priced }),
  z.object({ state: z.literal('closed'), ...resolverBase, ...priced }),
  z.object({ state: z.literal('not_yet_open'), ...resolverBase, ...priced, opensAt: isoInstantSchema }),
  z.object({ state: z.literal('already_registered'), ...resolverBase, ...priced, registration: registrationSchema }),
  z.object({ state: z.literal('ineligible'), ...resolverBase, ...priced, reason: ineligibleReasonSchema }),
])
export type RegistrationStateDto = z.infer<typeof registrationStateSchema>
export type RegistrationState = RegistrationStateDto['state']

// ---------- Commands ----------

/** `POST /registrations` (R02). Intent only: no price, amount or currency (AC-35). */
export const reserveInputSchema = z.strictObject({ eventSlug: slugSchema, profile: profileUpdateSchema.optional() })
export type ReserveInput = z.infer<typeof reserveInputSchema>

/** R02 response: a free event confirms at once; a paid event returns a pending registration with a hold. */
export const reserveResultSchema = z.discriminatedUnion('status', [
  z.object({
    status: z.literal('confirmed'),
    registration: registrationSchema.refine((r) => r.status === 'confirmed'),
  }),
  z.object({
    status: z.literal('pending'),
    registration: registrationSchema.refine((r) => r.status === 'pending'),
    holdExpiresAt: isoInstantSchema,
    serverNow: isoInstantSchema,
  }),
])
export type ReserveResult = z.infer<typeof reserveResultSchema>

/** `POST /registrations/waitlist` (R03). Joining takes no payment. */
export const joinWaitlistInputSchema = z.strictObject({ eventSlug: slugSchema })
export type JoinWaitlistInput = z.infer<typeof joinWaitlistInputSchema>
export const joinWaitlistResultSchema = z.object({
  registration: registrationSchema.refine((r) => r.status === 'waitlist'),
  position: z.int().min(1),
})
export type JoinWaitlistResult = z.infer<typeof joinWaitlistResultSchema>

/** `POST /registrations/{id}/cancel` (R07). Policy is server-side; CANCELLATION_NOT_ALLOWED explains a refusal. */
export const cancelResultSchema = z.object({ registration: registrationSchema })
export type CancelResult = z.infer<typeof cancelResultSchema>

/** `POST /payments/verify` (R05) and `POST /registrations/{id}/accept-offer` (R08) both return the registration. */
export const registrationResultSchema = z.object({ registration: registrationSchema })
export type RegistrationResult = z.infer<typeof registrationResultSchema>
