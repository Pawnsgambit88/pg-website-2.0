import type { ApiError } from '@/lib/api/errors'
import type { CreateOrderInput } from '@/lib/api/types/payment'
import { copyFor } from '@/lib/api/error-copy'

// Paid-registration logic (EV-04 / FE-08; screen 18). Pure: the component only wires it to React.
// The server owns the price, amount, currency and hold duration. The browser never sends any of those.
// Error codes come from R04 (create order) and R05 (verify payment) in the backend contract.

/**
 * R04 body: only the registration id. The server reads the amount and currency from the registration; the browser
 * never supplies a price (AC-35).
 */
export function createOrderInput(registrationId: string): CreateOrderInput {
  return { registrationId }
}

/**
 * What the screen does after a failed order creation (R04) or payment verification (R05).
 *
 *  hold_expired  the hold ended before payment was confirmed: start again
 *  mismatch      the payment data didn't match (INVALID_SIGNATURE or PAYMENT_MISMATCH): contact the desk
 *  unavailable   the payment provider is unavailable (PAYMENT_UNAVAILABLE): retry later
 *  retry         nothing is known to have changed: keep the page and offer another tap (same Idempotency-Key)
 */
export type PaidFailureKind = 'hold_expired' | 'mismatch' | 'unavailable' | 'retry'

export interface PaidFailure {
  kind: PaidFailureKind
  title: string
  body: string
}

/** Error codes that mean the hold ended and the player must start the reserve flow again. */
const EXPIRED_CODES: ReadonlySet<string> = new Set(['HOLD_EXPIRED'])
/** Error codes that mean a payment verification problem. */
const MISMATCH_CODES: ReadonlySet<string> = new Set(['INVALID_SIGNATURE', 'PAYMENT_MISMATCH'])

export function describePaidFailure(error: ApiError): PaidFailure {
  if (EXPIRED_CODES.has(error.code)) {
    const copy = copyFor(error, { action: 'complete your payment' })
    return { kind: 'hold_expired', title: copy.title, body: copy.body }
  }
  if (MISMATCH_CODES.has(error.code)) {
    const copy = copyFor(error, { action: 'verify your payment' })
    return { kind: 'mismatch', title: copy.title, body: copy.body }
  }
  if (error.code === 'PAYMENT_UNAVAILABLE') {
    const copy = copyFor(error, { action: 'process your payment' })
    return { kind: 'unavailable', title: copy.title, body: copy.body }
  }
  if (error.code === 'ALREADY_REGISTERED') {
    return { kind: 'retry', title: "You're already registered", body: 'Your place is confirmed.' }
  }
  const copy = copyFor(error, { action: 'complete your payment' })
  return { kind: 'retry', title: copy.title, body: copy.body }
}
