import { ConfirmingPanel } from '@/features/registration/ConfirmingPanel'
import { HoldActivePanel } from '@/features/registration/HoldActivePanel'
import { OpenPaidPanel } from '@/features/registration/OpenPaidPanel'
import type { SlotScreen } from '@/features/registration/resolve-screen'
import type { EventDetailDto } from '@/lib/api/types/event'

// Paid-flow dispatcher (EV-04 / FE-08; screen 18). Routes each of the three paid slot screens to its panel.
// No logic lives here; each panel owns its own state and effects.

type PaidSlotScreen = Extract<SlotScreen, { kind: 'open_paid' | 'hold_active' | 'payment_confirming' }>

export function PaidFlowPanel({ screen, event }: { screen: PaidSlotScreen; event: EventDetailDto }) {
  if (screen.kind === 'open_paid') {
    return <OpenPaidPanel event={event} pricePaise={screen.pricePaise} holdMinutes={screen.holdMinutes} />
  }
  if (screen.kind === 'hold_active') {
    return <HoldActivePanel event={event} registration={screen.registration} />
  }
  // payment_confirming
  return <ConfirmingPanel event={event} registration={screen.registration} />
}
