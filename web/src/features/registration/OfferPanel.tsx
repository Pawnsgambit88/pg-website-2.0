'use client'

import { useQueryClient } from '@tanstack/react-query'
import { Button } from '@/components/ui/Button'
import { Banner } from '@/components/ui/feedback/Banner'
import { Eyebrow } from '@/components/ui/Eyebrow'
import { Heading } from '@/components/ui/Heading'
import { InfoRow } from '@/components/ui/InfoRow'
import { InfoStack } from '@/components/ui/InfoStack'
import { ArrowRight } from '@/components/ui/icons/ArrowRight'
import { Surface } from '@/components/ui/Surface'
import { Text } from '@/components/ui/Text'
import { TextLink } from '@/components/ui/TextLink'
import { LeaveWaitlist } from '@/features/registration/LeaveWaitlist'
import { eventPageHref } from '@/features/registration/links'
import { useServerCountdown } from '@/features/registration/useServerCountdown'
import { useWaitlistCommand } from '@/features/registration/useWaitlistCommand'
import { WaitlistFailureBanner } from '@/features/registration/WaitlistFailureBanner'
import { countdownLabel, formatCountdown, offerIsFree } from '@/features/registration/waitlist'
import type { Slug } from '@/lib/api/types/primitives'
import type { RegistrationDto } from '@/lib/api/types/registration'
import { formatEventDateTime } from '@/lib/format/date'
import { formatInr } from '@/lib/format/money'
import { qk } from '@/lib/query/keys'

// Screen 20 (register, waitlist), the "offer" states. A freed place is held for this player until `offerExpiresAt`
// (R01). The countdown is measured from the server's `serverNow`, never from the device clock. Accepting goes through R08:
// a free event confirms at once (R01 then shows the success panel); a paid event comes back pending with a payment hold,
// and R01 then resolves to `hold_active`, the EV-04 slot, which takes the player to payment. This panel never takes money.

interface OfferPanelProps {
  slug: Slug
  registration: Extract<RegistrationDto, { status: 'waitlist' }>
  offerExpiresAt: string
  serverNow: string
  pricePaise: number
}

export function OfferPanel({ slug, registration, offerExpiresAt, serverNow, pricePaise }: OfferPanelProps) {
  const queryClient = useQueryClient()
  const left = useServerCountdown(offerExpiresAt, serverNow, () => {
    // Nothing to write: only the server can say what an expired offer became. The panel switches to its expired view
    // and "Check my status" re-reads R01.
  })
  const accept = useWaitlistCommand(slug, 'accept', (api, key) => api.acceptWaitlistOffer(registration.id, key))
  const free = offerIsFree(pricePaise)
  const expired = left <= 0 || accept.failure?.kind === 'expired'

  if (expired) {
    return (
      <Surface as="section" padding="lg" aria-labelledby="registration-screen-title" className="flex flex-col gap-4">
        <div data-registration-slot="FE-07" data-registration-screen="offer_expired" className="flex flex-col gap-4">
          <Eyebrow>Offer expired</Eyebrow>
          <Heading level={2} size="panel" id="registration-screen-title">
            This offer has run out.
          </Heading>
          <Text className="max-w-prose">
            The place has passed to the next player on the list. Nothing was charged. Check your status to see what you
            can do next.
          </Text>
          <Banner tone="warning" live="alert">
            The offer ended at {formatEventDateTime(offerExpiresAt)}.
          </Banner>
          <Button fullWidth onClick={() => void queryClient.invalidateQueries({ queryKey: qk.registration(slug) })}>
            Check my status
          </Button>
          <TextLink href={eventPageHref(slug)}>Back to event</TextLink>
        </div>
      </Surface>
    )
  }

  return (
    <Surface as="section" padding="lg" aria-labelledby="registration-screen-title" className="flex flex-col gap-4">
      <div data-registration-slot="FE-07" data-registration-screen="offer_pending" className="flex flex-col gap-4">
        <Eyebrow>Offer</Eyebrow>
        <Heading level={2} size="panel" id="registration-screen-title">
          A place has opened for you.
        </Heading>
        <Text className="max-w-prose">
          {free
            ? 'Accept to confirm your place. It is free, so nothing is charged.'
            : 'Accept to keep the place, then pay to confirm it. Nothing is charged until you pay.'}{' '}
          If you do nothing, it goes to the next player.
        </Text>
        <Surface padding="md" aria-label="Your offer">
          <InfoStack>
            <InfoRow label="Time left">
              <span role="timer" aria-label={countdownLabel(left)}>
                {formatCountdown(left)}
              </span>
            </InfoRow>
            <InfoRow label="Offer ends">{formatEventDateTime(offerExpiresAt)}</InfoRow>
            <InfoRow label="Payment">{free ? 'Not required' : `${formatInr(pricePaise)}, after you accept`}</InfoRow>
            <InfoRow label="Waitlist position">{registration.position}</InfoRow>
          </InfoStack>
        </Surface>
        {accept.failure === null ? null : <WaitlistFailureBanner failure={accept.failure} />}
        <Button
          fullWidth
          loading={accept.busy}
          loadingLabel={free ? 'Confirming your place' : 'Accepting your place'}
          icon={<ArrowRight />}
          iconPosition="end"
          onClick={accept.submit}
        >
          {free ? 'Accept my place' : 'Accept and continue to payment'}
        </Button>
        <LeaveWaitlist
          slug={slug}
          registrationId={registration.id}
          label="Decline this place"
          warning="You will give up this place and your spot in the queue. It goes to the next player."
        />
      </div>
    </Surface>
  )
}
