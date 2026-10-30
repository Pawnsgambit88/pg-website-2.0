'use client'

import { useState } from 'react'
import { ConfirmAction } from '@/components/admin/ConfirmAction'
import { Button } from '@/components/ui/Button'
import { useToast } from '@/components/ui/feedback/useToast'
import { Field } from '@/components/ui/form/Field'
import { Textarea } from '@/components/ui/form/Textarea'
import { useApi } from '@/lib/api/adapters/useApi.browser'
import { copyFor } from '@/lib/api/error-copy'
import { ApiError } from '@/lib/api/errors'
import { newIdempotencyKey } from '@/lib/api/idempotency'
import type { AdminRegistrationDto, RegistrationAction } from '@/lib/api/types/admin/control-registrations'
import type { IdempotencyKey } from '@/lib/api/types/primitives'

interface Props {
  eventId: string
  row: AdminRegistrationDto
  onDone: () => void
}

/**
 * Row actions of C03, driven only by the row's server capabilities. Cancel and move-to-waitlist affect the player, so they
 * ask for a reason and confirm; a cancel of a paid booking may need a step-up password (the adapter prompts when the
 * server asks). Promote, welcome and the pairing toggle are harmless and run on one tap.
 */
export function RegistrationActions({ eventId, row, onDone }: Props) {
  const api = useApi().admin
  const toast = useToast()
  const [reason, setReason] = useState('')
  const [busy, setBusy] = useState<RegistrationAction | null>(null)
  const caps = row.capabilities

  const send = (action: RegistrationAction, key: IdempotencyKey, why?: string): Promise<unknown> =>
    api.control.actOnRegistration(eventId, row.id, why === undefined ? { action } : { action, reason: why }, {
      idempotencyKey: key,
    })

  const quick = (action: RegistrationAction, done: string): void => {
    setBusy(action)
    send(action, newIdempotencyKey()).then(
      () => {
        setBusy(null)
        toast.success(done)
        onDone()
      },
      (error: unknown) => {
        setBusy(null)
        toast.error(copyFor(error, { action: 'update this registration' }).title)
      },
    )
  }

  const withReason = (action: RegistrationAction) => async (key: IdempotencyKey) => {
    const trimmed = reason.trim()
    if (trimmed === '') throw new ApiError('VALIDATION_FAILED', { status: 422 })
    await send(action, key, trimmed)
  }

  const reasonField = (
    <div className="mt-4">
      <Field label="Reason" required hint="Up to 500 characters. Kept in the audit log.">
        <Textarea
          value={reason}
          maxLength={500}
          onChange={(event) => {
            setReason(event.target.value)
          }}
        />
      </Field>
    </div>
  )

  return (
    <div className="flex flex-wrap gap-2">
      {caps.canPromote.allowed ? (
        <Button
          size="sm"
          variant="secondary"
          loading={busy === 'promote'}
          onClick={() => {
            quick('promote', 'Place offered')
          }}
        >
          Offer place
        </Button>
      ) : null}
      {caps.canMarkWelcomed.allowed ? (
        <Button
          size="sm"
          variant="secondary"
          loading={busy === 'mark_welcomed'}
          onClick={() => {
            quick('mark_welcomed', 'Marked as welcomed')
          }}
        >
          Mark welcomed
        </Button>
      ) : null}
      {caps.canSetPairingActive.allowed ? (
        <Button
          size="sm"
          variant="secondary"
          loading={busy === 'set_pairing_active'}
          onClick={() => {
            quick('set_pairing_active', 'Pairing setting changed')
          }}
        >
          {row.pairingActive ? 'Pause pairing' : 'Resume pairing'}
        </Button>
      ) : null}
      {caps.canMoveToWaitlist.allowed ? (
        <ConfirmAction
          renderTrigger={(open) => (
            <Button
              size="sm"
              variant="secondary"
              onClick={() => {
                setReason('')
                open()
              }}
            >
              Move to waitlist
            </Button>
          )}
          title="Move to the waitlist?"
          consequence={`${row.name} loses their confirmed place and joins the waitlist.`}
          confirmLabel="Move to waitlist"
          actionLabel="move this player to the waitlist"
          onConfirm={withReason('move_to_waitlist')}
          onDone={onDone}
        >
          {reasonField}
        </ConfirmAction>
      ) : null}
      {caps.canCancel.allowed ? (
        <ConfirmAction
          renderTrigger={(open) => (
            <Button
              size="sm"
              variant="secondary"
              onClick={() => {
                setReason('')
                open()
              }}
            >
              Cancel booking
            </Button>
          )}
          title="Cancel this booking?"
          consequence={
            row.paymentState === 'paid'
              ? `This cancels the booking for ${row.name} and starts a refund of their payment. You may be asked for your password. It cannot be undone.`
              : `This cancels the booking for ${row.name}. It cannot be undone.`
          }
          confirmLabel="Cancel booking"
          destructive
          actionLabel="cancel this booking"
          onConfirm={withReason('cancel')}
          onDone={onDone}
        >
          {reasonField}
        </ConfirmAction>
      ) : null}
    </div>
  )
}
