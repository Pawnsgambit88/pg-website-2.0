'use client'

import { useQueryClient } from '@tanstack/react-query'
import { useEffect } from 'react'
import { Eyebrow } from '@/components/ui/Eyebrow'
import { Heading } from '@/components/ui/Heading'
import { InfoRow } from '@/components/ui/InfoRow'
import { InfoStack } from '@/components/ui/InfoStack'
import { Surface } from '@/components/ui/Surface'
import { Text } from '@/components/ui/Text'
import { TextLink } from '@/components/ui/TextLink'
import { LeaveWaitlist } from '@/features/registration/LeaveWaitlist'
import { eventPageHref } from '@/features/registration/links'
import type { Slug } from '@/lib/api/types/primitives'
import type { RegistrationDto } from '@/lib/api/types/registration'
import { qk } from '@/lib/query/keys'

// Screen 20 (register, waitlist), the "on the waitlist" state: position from R01, no payment, leave through R07.
// While the page is open and visible it re-reads R01 every 30 seconds, so an offer shows up without a manual reload.

const POLL_MS = 30_000

export function OnWaitlistPanel({
  slug,
  registration,
}: {
  slug: Slug
  registration: Extract<RegistrationDto, { status: 'waitlist' }>
}) {
  const queryClient = useQueryClient()
  useEffect(() => {
    const id = window.setInterval(() => {
      if (document.visibilityState === 'visible')
        void queryClient.invalidateQueries({ queryKey: qk.registration(slug) })
    }, POLL_MS)
    return () => window.clearInterval(id)
  }, [queryClient, slug])

  return (
    <Surface as="section" padding="lg" aria-labelledby="registration-screen-title" className="flex flex-col gap-4">
      <div data-registration-slot="FE-07" data-registration-screen="on_waitlist" className="flex flex-col gap-4">
        <Eyebrow>Waitlist</Eyebrow>
        <Heading level={2} size="panel" id="registration-screen-title">
          You&rsquo;re on the waitlist.
        </Heading>
        <Text className="max-w-prose">
          No payment taken. If a place opens, PG will offer it to you here and by message before collecting payment.
        </Text>
        <Surface padding="md" aria-label="Your waitlist place">
          <InfoStack>
            <InfoRow label="Current position">{registration.position}</InfoRow>
            <InfoRow label="Payment">Not taken</InfoRow>
            <InfoRow label="Next step">We&rsquo;ll notify you</InfoRow>
          </InfoStack>
        </Surface>
        <LeaveWaitlist
          slug={slug}
          registrationId={registration.id}
          label="Leave waitlist"
          warning="You will lose your place in the queue. You can join again later if the event is still full."
        />
        <TextLink href={eventPageHref(slug)}>Back to event</TextLink>
      </div>
    </Surface>
  )
}
