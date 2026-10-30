'use client'

import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useRef } from 'react'
import { Banner } from '@/components/ui/feedback/Banner'
import { Eyebrow } from '@/components/ui/Eyebrow'
import { Heading } from '@/components/ui/Heading'
import { InfoRow } from '@/components/ui/InfoRow'
import { InfoStack } from '@/components/ui/InfoStack'
import { ArrowRight } from '@/components/ui/icons/ArrowRight'
import { Surface } from '@/components/ui/Surface'
import { Text } from '@/components/ui/Text'
import { Button } from '@/components/ui/Button'
import { reserveFreeInput, describeFreeFailure } from '@/features/registration/free-registration'
import { useApi } from '@/lib/api/adapters/useApi.browser'
import type { EventDetailDto } from '@/lib/api/types/event'
import { qk, type AppQueryKey } from '@/lib/query/keys'
import { useApiMutation } from '@/lib/query/mutation'
import { meQuery } from '@/lib/query/query-options/player'
import { formatInr } from '@/lib/format/money'

// Screen 18 (open_paid state). EV-04 / FE-08.
// The player has not yet reserved. Show the "YOUR PLACE / One last step." summary with the event price and the
// "Continue to secure payment" action. R02 for a paid event creates a pending registration and a hold; on success,
// R01 refetches and the resolver flips to hold_active.

const MY_REGISTRATIONS_PREFIX: AppQueryKey = ['me', 'registrations']

function rapidRating(ratings: ReadonlyArray<{ pool: string; rating: number }> | undefined): string {
  return String(ratings?.find((r) => r.pool === 'rapid')?.rating ?? '—')
}

interface OpenPaidPanelProps {
  event: EventDetailDto
  pricePaise: number
  holdMinutes: number
}

export function OpenPaidPanel({ event, pricePaise, holdMinutes }: OpenPaidPanelProps) {
  const api = useApi()
  const queryClient = useQueryClient()
  const me = useQuery(meQuery(api))
  const slug = event.slug
  const submitting = useRef(false)

  const mutation = useApiMutation({
    mutationFn: (_vars: void, { idempotencyKey }) => {
      if (idempotencyKey === null) throw new Error('missing idempotency key')
      // R02 for a paid event: intent only (no price). The server creates a pending registration + hold.
      return api.player.registration.reserve(reserveFreeInput(slug), idempotencyKey)
    },
    invalidates: () => [qk.registration(slug), qk.registrationAvailability(slug), MY_REGISTRATIONS_PREFIX, qk.nextUp()],
    onError: (error) => {
      const kind = describeFreeFailure(error).kind
      // If the event state changed (full, closed), re-read R01 so the resolver picks the right screen.
      if (kind !== 'retry') void queryClient.invalidateQueries({ queryKey: qk.registration(slug) })
    },
  })

  const failure = mutation.error === null ? null : describeFreeFailure(mutation.error)
  const busy = mutation.isPending

  function reserve() {
    if (submitting.current) return
    submitting.current = true
    mutation.mutateAsync().then(
      () => {
        submitting.current = false
      },
      () => {
        submitting.current = false
      },
    )
  }

  return (
    <Surface as="section" padding="lg" aria-labelledby="registration-screen-title" className="flex flex-col gap-4">
      <div data-registration-slot="FE-08" data-registration-screen="open_paid" className="flex flex-col gap-4">
        <Eyebrow>Your place</Eyebrow>
        <Heading level={2} size="panel" id="registration-screen-title">
          One last step.
        </Heading>
        <Text className="max-w-prose">
          We already know who you are. Confirm the event and PG will handle the operational details.
        </Text>
        <Surface padding="md" aria-label="Your registration summary">
          <InfoStack>
            <InfoRow label="Player">{me.data?.name ?? 'Your account'}</InfoRow>
            <InfoRow label="PG Rapid">{rapidRating(me.data?.ratings)}</InfoRow>
            <InfoRow label="Registration">Standard</InfoRow>
          </InfoStack>
        </Surface>
        <div className="flex items-baseline justify-between gap-4 border-t border-line pt-4">
          <span className="text-muted">Total</span>
          <strong className="font-display text-3xl">{formatInr(pricePaise)}</strong>
        </div>
        <Text variant="small" className="text-muted">
          Price and availability are rechecked server-side before payment. A place is held for {holdMinutes}{' '}
          {holdMinutes === 1 ? 'minute' : 'minutes'} while you pay.
        </Text>
        {failure !== null && failure.kind !== 'settled' && (
          <Banner tone={failure.kind === 'moved' ? 'warning' : 'danger'} live="alert" title={failure.title}>
            {failure.body}
            {failure.kind === 'retry' ? ' Try again.' : null}
          </Banner>
        )}
        <Button
          fullWidth
          loading={busy}
          loadingLabel="Reserving your place"
          icon={<ArrowRight />}
          iconPosition="end"
          onClick={reserve}
        >
          Continue to secure payment
        </Button>
      </div>
    </Surface>
  )
}
