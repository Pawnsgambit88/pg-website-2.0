import type { StatusTone } from '@/components/ui/StatusBadge'
import type { MyRegistrationDto } from '@/lib/api/types/my-events'
import { formatEventDateTime } from '@/lib/format/date'
import { formatInr } from '@/lib/format/money'
import { formatOrdinal } from '@/lib/format/rating'

// Text for every registration state on My Events (screen 23, UI-STATES "Event registration"). State is always words;
// the tone only reinforces it. Pure functions: no React, safe to unit test later.

export interface RegistrationStatusView {
  /** Badge words. */
  label: string
  tone: StatusTone
  /** One line of detail under the title: hold, queue position, refund. Null when there is nothing to add. */
  detail: string | null
}

type Registration = MyRegistrationDto['registration']

function refundDetail(registration: Registration): string | null {
  if (!('payment' in registration) || registration.payment === null) return null
  const { refundState, amountPaise } = registration.payment
  const amount = formatInr(amountPaise)
  switch (refundState) {
    case 'pending':
      return `Refund of ${amount} is on its way. It can take a few days to reach your account.`
    case 'refunded':
      return `${amount} was refunded to your original payment method.`
    case 'failed':
      return `We could not send your refund of ${amount}. Contact the desk and we will sort it out.`
    case 'none':
      return null
  }
}

export function registrationStatusView(registration: Registration): RegistrationStatusView {
  switch (registration.status) {
    case 'confirmed':
      return { label: 'Confirmed', tone: 'success', detail: 'Your place is booked.' }
    case 'pending':
      return {
        label: 'Payment pending',
        tone: 'warning',
        detail: `Your place is held until ${formatEventDateTime(registration.holdExpiresAt)}. Pay before then to keep it.`,
      }
    case 'confirming':
      return {
        label: 'Confirming payment',
        tone: 'warning',
        detail: 'We received your payment and are confirming it. This page updates when it is done.',
      }
    case 'waitlist':
      return {
        label: `Waitlist · ${formatOrdinal(registration.position)}`,
        tone: registration.offer === null ? 'neutral' : 'copper',
        detail:
          registration.offer === null
            ? `You are ${formatOrdinal(registration.position)} in line. We will tell you if a place opens.`
            : `A place is on offer to you until ${formatEventDateTime(registration.offer.expiresAt)}.`,
      }
    case 'cancelled': {
      const refundPending = registration.payment?.refundState === 'pending'
      return {
        label: refundPending ? 'Cancelled · Refund pending' : 'Cancelled',
        tone: 'neutral',
        detail: refundDetail(registration) ?? `You cancelled on ${formatEventDateTime(registration.cancelledAt)}.`,
      }
    }
    case 'refunded':
      return { label: 'Refunded', tone: 'neutral', detail: refundDetail(registration) }
  }
}
