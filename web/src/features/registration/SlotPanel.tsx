import { FreeConfirmPanel } from '@/features/registration/FreeConfirmPanel'
import { OfferPanel } from '@/features/registration/OfferPanel'
import { OnWaitlistPanel } from '@/features/registration/OnWaitlistPanel'
import { PaidFlowPanel } from '@/features/registration/PaidFlowPanel'
import { SuccessPanel } from '@/features/registration/SuccessPanel'
import { WaitlistJoinPanel } from '@/features/registration/WaitlistJoinPanel'
import type { SlotScreen } from '@/features/registration/resolve-screen'
import type { EventDetailDto } from '@/lib/api/types/event'

// The extension points of the registration frame. Each slot is a labelled region that FE-06 (free confirmation and
// success), FE-07 (waitlist and offer) and FE-08 (paid flow) replace with their step body. The `data-registration-slot`
// attribute names the owner and the resolver screen, so a later task finds its slot by search and a test can target it.

export function SlotPanel({ screen, event }: { screen: SlotScreen; event: EventDetailDto }) {
  // FE-06 / EV-02: the free confirmation (screen 19) and the confirmed state (screen 21).
  if (screen.kind === 'open_free') return <FreeConfirmPanel event={event} />
  if (screen.kind === 'registered') return <SuccessPanel event={event} eventId={screen.registration.eventId} />
  // FE-07 / EV-03: the waitlist join (screen 20), the waitlist position, and the offer with its countdown.
  if (screen.kind === 'waitlist_available') return <WaitlistJoinPanel slug={event.slug} position={screen.position} />
  if (screen.kind === 'on_waitlist') return <OnWaitlistPanel slug={event.slug} registration={screen.registration} />
  if (screen.kind === 'offer_pending') {
    return (
      <OfferPanel
        slug={event.slug}
        registration={screen.registration}
        offerExpiresAt={screen.offerExpiresAt}
        serverNow={screen.serverNow}
        pricePaise={screen.pricePaise}
      />
    )
  }
  // FE-08 / EV-04: the paid flow (open_paid → hold_active → payment_confirming).
  return <PaidFlowPanel screen={screen} event={event} />
}
