import { z } from 'zod'
import { currencySchema, isoInstantSchema, paiseSchema, uuidSchema } from '@/lib/api/types/primitives'

// Payment order and verification (PAYMENTS.md; contract R04, R05; STATE-MACHINES "Payment order").
// Amount, currency and key come ONLY from the create-order response, never from the browser (AC-35). No secret exists
// in this file: the Razorpay key id is public, the key secret and webhook secret are backend-only.

/** Payment order: created -> attempted -> paid; created | attempted -> failed | expired; paid -> refunded. */
export const PAYMENT_ORDER_STATES = ['created', 'attempted', 'paid', 'failed', 'expired', 'refunded'] as const
export const paymentOrderStateSchema = z.enum(PAYMENT_ORDER_STATES)
export type PaymentOrderState = z.infer<typeof paymentOrderStateSchema>

export const PAYMENT_ORDER_TRANSITIONS: Readonly<Record<PaymentOrderState, readonly PaymentOrderState[]>> = {
  created: ['attempted', 'failed', 'expired'],
  attempted: ['paid', 'failed', 'expired'],
  paid: ['refunded'],
  failed: [],
  expired: [],
  refunded: [],
}

/** Refund ledger state shown on My Events and the success screen (UI-STATES "refund pending/refunded"). */
export const REFUND_STATES = ['none', 'pending', 'refunded', 'failed'] as const
export const refundStateSchema = z.enum(REFUND_STATES)
export type RefundState = z.infer<typeof refundStateSchema>

/** Razorpay identifiers. Names are kept as Razorpay spells them (contract R05). Held in memory only, never logged. */
export const razorpayOrderIdSchema = z.string().regex(/^order_[A-Za-z0-9]{6,40}$/)
export const razorpayPaymentIdSchema = z.string().regex(/^pay_[A-Za-z0-9]{6,40}$/)
export const razorpaySignatureSchema = z.string().regex(/^[a-f0-9]{64}$/)
/** Public checkout key id (safe in the browser). */
export const razorpayKeyIdSchema = z.string().regex(/^rzp_(?:test|live)_[A-Za-z0-9]{6,40}$/)

/** `POST /payments/orders` request (R04). The registration id is the whole intent. */
export const createOrderInputSchema = z.object({ registrationId: uuidSchema })
export type CreateOrderInput = z.infer<typeof createOrderInputSchema>

/** `POST /payments/orders` response: the only source of amount, currency and key for Checkout. */
export const paymentOrderSchema = z.object({
  orderId: razorpayOrderIdSchema,
  amountPaise: paiseSchema.min(100),
  currency: currencySchema,
  keyId: razorpayKeyIdSchema,
  holdExpiresAt: isoInstantSchema,
  serverNow: isoInstantSchema,
})
export type PaymentOrderDto = z.infer<typeof paymentOrderSchema>

/** `POST /payments/verify` request (R05). Razorpay's own field names. */
export const verifyPaymentInputSchema = z.object({
  razorpay_order_id: razorpayOrderIdSchema,
  razorpay_payment_id: razorpayPaymentIdSchema,
  razorpay_signature: razorpaySignatureSchema,
})
export type VerifyPaymentInput = z.infer<typeof verifyPaymentInputSchema>

/** Payment and refund facts attached to a player's own registration. No provider ids: they stay on the server. */
export const paymentSummarySchema = z.object({
  orderState: paymentOrderStateSchema,
  refundState: refundStateSchema,
  amountPaise: paiseSchema,
  currency: currencySchema,
})
export type PaymentSummary = z.infer<typeof paymentSummarySchema>
