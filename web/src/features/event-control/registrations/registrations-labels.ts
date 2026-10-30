import type { StatusTone } from '@/components/ui/StatusBadge'
import type { PaymentOrderState } from '@/lib/api/types/payment'
import type { RegistrationStatus } from '@/lib/api/types/registration'

// Plain-words registration labels for the Control Room (screen 47). State is always text; the tone only reinforces it.

export const REGISTRATION_STATUS_LABEL: Readonly<Record<RegistrationStatus, string>> = {
  pending: 'Pending payment',
  confirming: 'Confirming',
  confirmed: 'Confirmed',
  waitlist: 'Waitlist',
  cancelled: 'Cancelled',
  refunded: 'Refunded',
}

export const REGISTRATION_STATUS_TONE: Readonly<Record<RegistrationStatus, StatusTone>> = {
  pending: 'warning',
  confirming: 'warning',
  confirmed: 'success',
  waitlist: 'neutral',
  cancelled: 'danger',
  refunded: 'copper',
}

export const REGISTRATION_PAYMENT_LABEL: Readonly<Record<PaymentOrderState, string>> = {
  created: 'Payment started',
  attempted: 'Payment attempted',
  paid: 'Paid',
  failed: 'Payment failed',
  expired: 'Payment expired',
  refunded: 'Refunded',
}
