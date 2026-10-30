import type { StatusTone } from '@/components/ui/StatusBadge'
import type { MismatchKind } from '@/lib/api/types/admin/payments'
import type { PaymentOrderState, RefundState } from '@/lib/api/types/payment'

// Plain-words labels for the admin payments ledger (screen 55). Money state is always words, never colour alone.

export const ORDER_STATE_LABEL: Record<PaymentOrderState, string> = {
  created: 'Created',
  attempted: 'Attempted',
  paid: 'Paid',
  failed: 'Failed',
  expired: 'Expired',
  refunded: 'Refunded',
}

export const ORDER_STATE_TONE: Record<PaymentOrderState, StatusTone> = {
  created: 'neutral',
  attempted: 'warning',
  paid: 'success',
  failed: 'danger',
  expired: 'neutral',
  refunded: 'copper',
}

export const REFUND_STATE_LABEL: Record<RefundState, string> = {
  none: 'No refund',
  pending: 'Refund pending',
  refunded: 'Refunded',
  failed: 'Refund failed',
}

export const REFUND_STATE_TONE: Record<RefundState, StatusTone> = {
  none: 'neutral',
  pending: 'warning',
  refunded: 'copper',
  failed: 'danger',
}

export const MISMATCH_LABEL: Record<MismatchKind, string> = {
  amount: 'Amount differs',
  currency: 'Currency differs',
  status: 'Status differs',
  order_id: 'Order id differs',
  missing_at_provider: 'Missing at provider',
  missing_at_pg: 'Missing at PG',
}

const RUPEES = /^(\d{1,7})(?:\.(\d{1,2}))?$/

/** Exact rupees text to integer paise ("250", "250.5"). Returns null for anything else; never rounds. */
export function rupeesToPaise(text: string): number | null {
  const match = RUPEES.exec(text.trim())
  if (match === null) return null
  const fraction = (match[2] ?? '').padEnd(2, '0')
  return Number(match[1]) * 100 + Number(fraction)
}
