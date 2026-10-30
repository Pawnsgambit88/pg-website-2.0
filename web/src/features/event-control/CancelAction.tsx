'use client'

import { useState } from 'react'
import { ConfirmAction } from '@/components/admin/ConfirmAction'
import { Button } from '@/components/ui/Button'
import { useToast } from '@/components/ui/feedback/useToast'
import { Field } from '@/components/ui/form/Field'
import { Switch } from '@/components/ui/form/Switch'
import { Textarea } from '@/components/ui/form/Textarea'
import { useApi } from '@/lib/api/adapters/useApi.browser'
import { ApiError } from '@/lib/api/errors'

export function CancelAction({ eventId, onDone }: { eventId: string; onDone: () => Promise<void> }) {
  const api = useApi().admin
  const toast = useToast()
  const [reason, setReason] = useState('')
  const [notify, setNotify] = useState(true)
  const [refund, setRefund] = useState(true)
  return (
    <ConfirmAction
      renderTrigger={(open) => (
        <Button
          variant="secondary"
          onClick={() => {
            setReason('')
            setNotify(true)
            setRefund(true)
            open()
          }}
        >
          Cancel event
        </Button>
      )}
      title="Cancel this event?"
      consequence="Every booking is cancelled and the event is marked cancelled. This cannot be undone. Refunds are processed in the background and can take a while."
      confirmLabel="Cancel event"
      destructive
      actionLabel="cancel this event"
      onConfirm={async (key) => {
        const trimmed = reason.trim()
        if (trimmed === '') throw new ApiError('VALIDATION_FAILED', { status: 422 })
        const result = await api.events.cancelEvent(
          eventId,
          { reason: trimmed, notifyParticipants: notify, refund },
          key,
        )
        toast.success(
          result.refundsQueued > 0
            ? `Event cancelled. ${result.refundsQueued} refunds are queued; follow them in Payments.`
            : 'Event cancelled',
        )
      }}
      onDone={() => {
        void onDone()
      }}
    >
      <div className="mt-4 grid gap-4">
        <Field label="Reason" required hint="Up to 500 characters. Kept in the audit log.">
          <Textarea
            value={reason}
            maxLength={500}
            onChange={(event) => {
              setReason(event.target.value)
            }}
          />
        </Field>
        <Switch label="Tell the players by email" checked={notify} onCheckedChange={setNotify} />
        <Switch
          label="Refund paid bookings"
          description="You may be asked for your password before refunds start."
          checked={refund}
          onCheckedChange={setRefund}
        />
      </div>
    </ConfirmAction>
  )
}
