'use client'

import { useEffect } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { Banner } from '@/components/ui/feedback/Banner'
import { Button } from '@/components/ui/Button'
import { Eyebrow } from '@/components/ui/Eyebrow'
import { Heading } from '@/components/ui/Heading'
import { Surface } from '@/components/ui/Surface'
import { Text } from '@/components/ui/Text'
import { useApi } from '@/lib/api/adapters/useApi.browser'
import type { EventDetailDto } from '@/lib/api/types/event'
import type { RegistrationDto } from '@/lib/api/types/registration'
import { qk } from '@/lib/query/keys'
import { registrationQuery } from '@/lib/query/query-options/player'
import { usePolling } from '@/lib/query/polling'

// Screen 18 (payment_confirming state). EV-04 / FE-08.
// R05 verified the payment but the backend is still waiting for the webhook to confirm.
// Poll R06 (registrationById) every 3 s until the status changes, then invalidate R01 so the resolver flips.

const CONFIRMING_POLL_MS = 3_000

interface ConfirmingPanelProps {
  event: EventDetailDto
  registration: Extract<RegistrationDto, { status: 'confirming' }>
}

export function ConfirmingPanel({ event, registration }: ConfirmingPanelProps) {
  const api = useApi()
  const queryClient = useQueryClient()
  const slug = event.slug

  // Poll R06 every 3 s. R01 is invalidated when the status changes so the resolver can flip to `registered`.
  const polling = usePolling(registrationQuery(api, registration.id), {
    intervalMs: CONFIRMING_POLL_MS,
  })

  const latestStatus = polling.data?.status
  useEffect(() => {
    if (latestStatus === 'confirmed' || latestStatus === 'cancelled' || latestStatus === 'refunded') {
      void queryClient.invalidateQueries({ queryKey: qk.registration(slug) })
    }
  }, [latestStatus, queryClient, slug])

  return (
    <Surface as="section" padding="lg" aria-labelledby="registration-screen-title" className="flex flex-col gap-4">
      <div data-registration-slot="FE-08" data-registration-screen="payment_confirming" className="flex flex-col gap-4">
        <Eyebrow>Confirming payment</Eyebrow>
        <Heading level={2} size="panel" id="registration-screen-title">
          Almost there.
        </Heading>
        <Text className="max-w-prose">
          Your payment has been received. We&rsquo;re confirming your place now. This page updates automatically.
        </Text>
        {polling.isPollingPaused && (
          <Banner tone="warning">
            Checking is paused while the tab is hidden or offline. Return to this tab to continue.
          </Banner>
        )}
        <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
          <Button
            variant="secondary"
            onClick={() => void queryClient.invalidateQueries({ queryKey: qk.registration(slug) })}
          >
            Check my registration
          </Button>
          <Button
            variant="secondary"
            onClick={() => void polling.refresh()}
            loading={polling.isFetching}
            loadingLabel="Checking…"
          >
            Refresh
          </Button>
        </div>
      </div>
    </Surface>
  )
}
