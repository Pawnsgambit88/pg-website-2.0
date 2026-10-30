'use client'

import { useApi } from '@/lib/api/adapters/useApi.browser'
import { newIdempotencyKey } from '@/lib/api/idempotency'
import { useApiMutation } from '@/lib/query/mutation'
import { qk } from '@/lib/query/keys'
import { useLiveAnnouncer } from '@/lib/hooks/useLiveAnnouncer'
import type { ResultOutcome } from '@/lib/api/types/event-room'

/**
 * The Event Room commands (M06 to M09). No optimistic UI: a result is only shown as saved after the server said so and
 * the room snapshot was refetched (`invalidates` runs before the mutation settles). Idempotency: submit carries the key
 * made by `useApiMutation`, reused if the player retries the same choice after a failure. Each success makes ONE polite
 * announcement; failures are shown as visible text by the caller from `mutation.error` via `copyFor`.
 */
export function useEventRoomActions(eventId: string) {
  const api = useApi()
  const announce = useLiveAnnouncer()
  const roomKeys = () => [qk.eventRoom(eventId), qk.nextUp()] as const

  const checkIn = useApiMutation<unknown, void>({
    mutationFn: (_vars, { idempotencyKey }) =>
      api.player.eventRoom.checkIn(eventId, idempotencyKey === null ? {} : { idempotencyKey }),
    invalidates: roomKeys,
    onSuccess: () => announce('You are checked in.'),
  })

  const submitResult = useApiMutation<unknown, { pairingId: string; outcome: ResultOutcome }>({
    mutationFn: (vars, { idempotencyKey }) =>
      api.player.eventRoom.submitResult(eventId, vars, idempotencyKey ?? newIdempotencyKey()),
    invalidates: roomKeys,
    onSuccess: () => announce('Result sent. Waiting for your opponent to confirm.'),
  })

  const confirmResult = useApiMutation<unknown, { pairingId: string }>({
    mutationFn: (vars, { idempotencyKey }) =>
      api.player.eventRoom.confirmResult(eventId, vars.pairingId, idempotencyKey === null ? {} : { idempotencyKey }),
    invalidates: roomKeys,
    onSuccess: () => announce('Result confirmed.'),
  })

  const disputeResult = useApiMutation<unknown, { pairingId: string; note?: string }>({
    mutationFn: (vars, { idempotencyKey }) =>
      api.player.eventRoom.disputeResult(
        eventId,
        vars.pairingId,
        vars.note === undefined ? {} : { note: vars.note },
        idempotencyKey === null ? {} : { idempotencyKey },
      ),
    invalidates: roomKeys,
    onSuccess: () => announce('Issue raised. The host will look at this game.'),
  })

  return { checkIn, submitResult, confirmResult, disputeResult }
}
