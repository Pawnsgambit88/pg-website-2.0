'use client'

import { Button } from '@/components/ui/Button'
import { Eyebrow } from '@/components/ui/Eyebrow'
import { Heading } from '@/components/ui/Heading'
import { InfoRow } from '@/components/ui/InfoRow'
import { InfoStack } from '@/components/ui/InfoStack'
import { ArrowRight } from '@/components/ui/icons/ArrowRight'
import { Surface } from '@/components/ui/Surface'
import { Text } from '@/components/ui/Text'
import { WaitlistFailureBanner } from '@/features/registration/WaitlistFailureBanner'
import { useWaitlistCommand } from '@/features/registration/useWaitlistCommand'
import { joinWaitlistInput } from '@/features/registration/waitlist'
import type { Slug } from '@/lib/api/types/primitives'

// Screen 20 (register, waitlist), the "join" state. Joining takes no payment (R03). The position shown is the one the
// server would give the player now; the real position comes back in R01 after the join.

export function WaitlistJoinPanel({ slug, position }: { slug: Slug; position: number }) {
  const join = useWaitlistCommand(slug, 'join', (registration, key) =>
    registration.joinWaitlist(joinWaitlistInput(slug), key),
  )

  return (
    <Surface as="section" padding="lg" aria-labelledby="registration-screen-title" className="flex flex-col gap-4">
      <div data-registration-slot="FE-07" data-registration-screen="waitlist_available" className="flex flex-col gap-4">
        <Eyebrow>Waitlist</Eyebrow>
        <Heading level={2} size="panel" id="registration-screen-title">
          The room is full. You can still get in.
        </Heading>
        <Text className="max-w-prose">
          Join the waitlist without paying. If a place opens, PG will offer it to you before collecting payment.
        </Text>
        <Surface padding="md" aria-label="Waitlist details">
          <InfoStack>
            <InfoRow label="Current position">{position}</InfoRow>
            <InfoRow label="Payment">Not taken</InfoRow>
            <InfoRow label="Next step">We&rsquo;ll notify you</InfoRow>
          </InfoStack>
        </Surface>
        {join.failure === null ? null : <WaitlistFailureBanner failure={join.failure} />}
        <Button
          variant="secondary"
          fullWidth
          loading={join.busy}
          loadingLabel="Joining the waitlist"
          icon={<ArrowRight />}
          iconPosition="end"
          onClick={join.submit}
        >
          Join waitlist
        </Button>
      </div>
    </Surface>
  )
}
