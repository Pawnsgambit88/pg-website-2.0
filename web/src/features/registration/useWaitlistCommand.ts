'use client'

import { useQueryClient } from '@tanstack/react-query'
import { useRef } from 'react'
import { describeWaitlistFailure, type WaitlistAction, type WaitlistFailure } from '@/features/registration/waitlist'
import { useApi } from '@/lib/api/adapters/useApi.browser'
import type { PgRegistrationApi } from '@/lib/api/pg-api'
import type { IdempotencyKey, Slug } from '@/lib/api/types/primitives'
import { qk, type AppQueryKey } from '@/lib/query/keys'
import { useApiMutation } from '@/lib/query/mutation'

const MY_REGISTRATIONS_PREFIX: AppQueryKey = ['me', 'registrations']

export interface WaitlistCommand {
  submit: () => void
  busy: boolean
  failure: WaitlistFailure | null
  /** Forget the last failure (the next tap is a new intent with a new Idempotency-Key). */
  reset: () => void
}

/**
 * One waitlist write (join R03, leave R07, accept R08) with the rules every one of them shares: a synchronous
 * double-submit guard, the same Idempotency-Key for each retry of one intent, the smallest set of invalidated reads, and a
 * re-read of R01 after any failure that means the server knows something the page does not.
 */
export function useWaitlistCommand(
  slug: Slug,
  action: WaitlistAction,
  run: (api: PgRegistrationApi, key: IdempotencyKey) => Promise<unknown>,
): WaitlistCommand {
  const api = useApi()
  const queryClient = useQueryClient()
  // Two taps in the same frame run before React re-renders `isPending`.
  const submitting = useRef(false)

  const mutation = useApiMutation({
    mutationFn: (_vars: void, { idempotencyKey }) => {
      if (idempotencyKey === null) throw new Error('missing idempotency key')
      return run(api.player.registration, idempotencyKey)
    },
    // R01 flips this page to the next screen; the places count, My events and next-up change with it.
    invalidates: () => [qk.registration(slug), qk.registrationAvailability(slug), MY_REGISTRATIONS_PREFIX, qk.nextUp()],
    onError: (error) => {
      // `expired` keeps the page so the player reads why; the explicit "check again" action re-reads R01.
      const kind = describeWaitlistFailure(error, action).kind
      if (kind === 'settled' || kind === 'moved')
        void queryClient.invalidateQueries({ queryKey: qk.registration(slug) })
    },
  })

  function submit() {
    if (submitting.current) return
    submitting.current = true
    const release = () => {
      submitting.current = false
    }
    mutation.mutateAsync().then(release, release)
  }

  return {
    submit,
    busy: mutation.isPending,
    failure: mutation.error === null ? null : describeWaitlistFailure(mutation.error, action),
    reset: mutation.reset,
  }
}
