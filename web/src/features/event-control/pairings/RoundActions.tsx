'use client'

import { useId } from 'react'
import { ConfirmAction } from '@/components/admin/ConfirmAction'
import { Button } from '@/components/ui/Button'
import { ReasonedControl } from '@/features/event-control/pairings/ReasonedControl'
import { useToast } from '@/components/ui/feedback/useToast'
import { useApi } from '@/lib/api/adapters/useApi.browser'
import { isApiError } from '@/lib/api/errors'
import type { AdminRoundDto, RoundCapabilities } from '@/lib/api/types/admin/control-rounds'

interface Props {
  eventId: string
  round: AdminRoundDto
  /** Refetch the rounds and the overview. Awaited before a dialog closes, so the screen never shows stale state. */
  onDone: () => void
  onEdit: () => void
}

function reasonOf(flag: RoundCapabilities[keyof RoundCapabilities]): string | null {
  return flag.allowed ? null : flag.reason
}

/**
 * Lifecycle controls of one round: Publish (draft), Start (published), Finalise (live) and Edit. The server's
 * `capabilities` decide what is enabled; a disabled control shows the server's reason as text (RESULTS_NOT_FINAL
 * included). Publish and finalise need a confirm and an Idempotency-Key (one per intent, reused on retry); finalising a
 * round that was already finalised (ROUND_ALREADY_FINALIZED) is treated as done, because ratings were processed once.
 */
export function RoundActions({ eventId, round, onDone, onEdit }: Props) {
  const api = useApi().admin
  const toast = useToast()
  const ids = { publish: useId(), start: useId(), finalise: useId(), edit: useId() }
  const caps = round.capabilities

  return (
    <div className="flex flex-wrap items-start gap-4">
      {round.state === 'draft' ? (
        <ReasonedControl id={ids.publish} reason={reasonOf(caps.canPublish)}>
          <ConfirmAction
            renderTrigger={(open) => (
              <Button disabled={!caps.canPublish.allowed} aria-describedby={ids.publish} onClick={open}>
                Publish round {round.roundNo}
              </Button>
            )}
            title={`Publish round ${String(round.roundNo)}?`}
            consequence="Players see their board and opponent straight away and are notified. You can still correct pairings afterwards, with a reason."
            confirmLabel="Publish round"
            actionLabel="publish this round"
            onConfirm={async (key) => {
              await api.control.publishRound(eventId, round.id, round.version, key)
            }}
            onDone={() => {
              toast.success(`Round ${String(round.roundNo)} published`)
              onDone()
            }}
          />
        </ReasonedControl>
      ) : null}

      {round.state === 'published' ? (
        <ReasonedControl id={ids.start} reason={reasonOf(caps.canStart)}>
          <ConfirmAction
            renderTrigger={(open) => (
              <Button disabled={!caps.canStart.allowed} aria-describedby={ids.start} onClick={open}>
                Start round {round.roundNo}
              </Button>
            )}
            title={`Start round ${String(round.roundNo)}?`}
            consequence="The round goes live: players can submit results and the clock is running."
            confirmLabel="Start round"
            actionLabel="start this round"
            onConfirm={async (key) => {
              await api.control.startRound(eventId, round.id, round.version, { idempotencyKey: key })
            }}
            onDone={() => {
              toast.success(`Round ${String(round.roundNo)} is live`)
              onDone()
            }}
          />
        </ReasonedControl>
      ) : null}

      {round.state === 'live' ? (
        <ReasonedControl id={ids.finalise} reason={reasonOf(caps.canFinalise)}>
          <ConfirmAction
            renderTrigger={(open) => (
              <Button disabled={!caps.canFinalise.allowed} aria-describedby={ids.finalise} onClick={open}>
                Finalise round {round.roundNo}
              </Button>
            )}
            title={`Finalise round ${String(round.roundNo)}?`}
            consequence="Results lock and ratings are processed once. This cannot be undone."
            confirmLabel="Finalise round"
            destructive
            actionLabel="finalise this round"
            onConfirm={async (key) => {
              try {
                await api.control.finaliseRound(eventId, round.id, round.version, key)
              } catch (error) {
                // Another tab or an earlier attempt already finalised it: that is the outcome the admin wanted.
                if (isApiError(error) && error.code === 'ROUND_ALREADY_FINALIZED') {
                  toast.success('This round was already finalised. Ratings were processed once.')
                  return
                }
                throw error
              }
            }}
            onDone={() => {
              toast.success(`Round ${String(round.roundNo)} finalised`)
              onDone()
            }}
          />
        </ReasonedControl>
      ) : null}

      {caps.canEdit.allowed ? (
        <Button variant="secondary" onClick={onEdit}>
          {round.state === 'draft' ? 'Edit pairings' : 'Correct pairings'}
        </Button>
      ) : (
        <ReasonedControl id={ids.edit} reason={reasonOf(caps.canEdit)}>
          <Button variant="secondary" disabled aria-describedby={ids.edit}>
            Edit pairings
          </Button>
        </ReasonedControl>
      )}
    </div>
  )
}
