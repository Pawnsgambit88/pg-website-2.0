'use client'

import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useRef } from 'react'
import { Button } from '@/components/ui/Button'
import { Banner } from '@/components/ui/feedback/Banner'
import { Eyebrow } from '@/components/ui/Eyebrow'
import { Heading } from '@/components/ui/Heading'
import { InfoRow } from '@/components/ui/InfoRow'
import { InfoStack } from '@/components/ui/InfoStack'
import { ArrowRight } from '@/components/ui/icons/ArrowRight'
import { Surface } from '@/components/ui/Surface'
import { Text } from '@/components/ui/Text'
import { describeFreeFailure, reserveFreeInput } from '@/features/registration/free-registration'
import { useApi } from '@/lib/api/adapters/useApi.browser'
import type { EventDetailDto } from '@/lib/api/types/event'
import { qk, type AppQueryKey } from '@/lib/query/keys'
import { useApiMutation } from '@/lib/query/mutation'
import { meQuery } from '@/lib/query/query-options/player'
import { formatInr } from '@/lib/format/money'

// Screen 19 (register, free). Review the player, the fee and the total, then confirm through R02. The request carries the
// event slug only; the server decides whether the place is still free (no price, no capacity, no eligibility client side).

const MY_REGISTRATIONS_PREFIX: AppQueryKey = ['me', 'registrations']

export function FreeConfirmPanel({ event }: { event: EventDetailDto }) {
  const api = useApi()
  const queryClient = useQueryClient()
  const me = useQuery(meQuery(api))
  const slug = event.slug
  // Synchronous guard: two taps in the same frame run before React re-renders `isPending` (the Button also blocks).
  const submitting = useRef(false)

  const mutation = useApiMutation({
    // Same Idempotency-Key for every retry of this intent (useApiMutation); a replay returns the original result.
    mutationFn: (_vars: void, { idempotencyKey }) => {
      if (idempotencyKey === null) throw new Error('missing idempotency key')
      return api.player.registration.reserve(reserveFreeInput(slug), idempotencyKey)
    },
    // What a confirmed place makes stale: R01 (this page flips to the success panel), live places, My events, next-up.
    invalidates: () => [qk.registration(slug), qk.registrationAvailability(slug), MY_REGISTRATIONS_PREFIX, qk.nextUp()],
    onError: (error) => {
      // The server may know something the page does not (full, closed, already registered): re-read R01 so the resolver
      // shows the right screen. A transient failure (network, 5xx) changes nothing, so keep the page for a retry.
      if (describeFreeFailure(error).kind !== 'retry')
        void queryClient.invalidateQueries({ queryKey: qk.registration(slug) })
    },
  })

  const failure = mutation.error === null ? null : describeFreeFailure(mutation.error)
  const busy = mutation.isPending

  function confirm() {
    if (submitting.current) return
    submitting.current = true
    const finished = mutation.mutateAsync()
    // Release on settle; success unmounts this panel once R01 refetches, errors keep it for a retry.
    finished.then(
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
      <div data-registration-slot="FE-06" data-registration-screen="open_free" className="flex flex-col gap-4">
        <Eyebrow>Free event</Eyebrow>
        <Heading level={2} size="panel" id="registration-screen-title">
          That one is on us.
        </Heading>
        <Text className="max-w-prose">
          No payment is required. Confirm your place and we&rsquo;ll send the arrival details.
        </Text>
        <Surface padding="md" aria-label="Your registration">
          <InfoStack>
            <InfoRow label="Player">{me.data?.name ?? 'Your account'}</InfoRow>
            <InfoRow label="Fee">Free</InfoRow>
            <InfoRow label="Membership">{event.atAGlance.membershipRequired ? 'Required' : 'Not required'}</InfoRow>
          </InfoStack>
        </Surface>
        <div className="flex items-baseline justify-between gap-4 border-t border-line pt-4">
          <span className="text-muted">Total</span>
          <strong className="font-display text-3xl">{formatInr(0)}</strong>
        </div>
        {failure === null ? null : (
          <Banner
            tone={failure.kind === 'settled' ? 'info' : failure.kind === 'moved' ? 'warning' : 'danger'}
            live="alert"
            title={failure.title}
          >
            {failure.body}
            {failure.kind === 'retry' ? ' Your place is not confirmed yet. Try again.' : null}
          </Banner>
        )}
        <Button
          fullWidth
          loading={busy}
          loadingLabel="Confirming your place"
          icon={<ArrowRight />}
          iconPosition="end"
          onClick={confirm}
        >
          Confirm my place
        </Button>
      </div>
    </Surface>
  )
}
