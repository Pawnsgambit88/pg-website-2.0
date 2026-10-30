'use client'

import { useEffect } from 'react'
import { Banner } from '@/components/ui/feedback/Banner'
import { useToast } from '@/components/ui/feedback/useToast'
import { ConfirmDialog } from '@/components/ui/overlay/ConfirmDialog'
import { useApi } from '@/lib/api/adapters/useApi.browser'
import { copyFor } from '@/lib/api/error-copy'
import type { MyRegistrationDto } from '@/lib/api/types/my-events'
import { formatEventDateTime } from '@/lib/format/date'
import { qk, type AppQueryKey } from '@/lib/query/keys'
import { useApiMutation } from '@/lib/query/mutation'

interface CancelRegistrationDialogProps {
  /** The row being cancelled; null keeps the dialog closed. */
  target: MyRegistrationDto | null
  onClose: () => void
}

// Everything a cancel makes stale: every My Events list (prefix), the dashboard hero and the registration panel.
const MY_REGISTRATIONS_PREFIX: AppQueryKey = ['me', 'registrations']

/**
 * Cancel confirmation (R07). Not optimistic: the dialog stays busy until the server answers and the lists have
 * refetched, so a row never claims "Cancelled" before it is true. On failure it stays open with the reason (from the
 * error-copy map, never server text); confirming again reuses the same Idempotency-Key (`useApiMutation`).
 */
export function CancelRegistrationDialog({ target, onClose }: CancelRegistrationDialogProps) {
  const api = useApi()
  const toast = useToast()
  const mutation = useApiMutation({
    mutationFn: (row: MyRegistrationDto, { idempotencyKey }) =>
      api.player.registration.cancelRegistration(
        row.registration.id,
        idempotencyKey === null ? undefined : { idempotencyKey },
      ),
    invalidates: (row) => [MY_REGISTRATIONS_PREFIX, qk.nextUp(), qk.registration(row.event.slug)],
    onSuccess: (_data, row) => {
      toast.success(`Your registration for ${row.event.title} is cancelled.`)
      onClose()
    },
  })

  const { reset } = mutation
  const open = target !== null
  useEffect(() => {
    if (!open) reset() // the next row is a new intent with a new idempotency key
  }, [open, reset])

  const error = mutation.error === null ? null : copyFor(mutation.error, { action: 'cancel this registration' })
  const paid = target !== null && 'payment' in target.registration && target.registration.payment?.orderState === 'paid'

  return (
    <ConfirmDialog
      open={open}
      onOpenChange={(next) => {
        if (!next) onClose()
      }}
      onConfirm={() => {
        if (target !== null) mutation.mutate(target)
      }}
      title="Cancel this registration?"
      consequence={
        target === null
          ? 'Cancel this registration.'
          : `${target.event.title}, ${formatEventDateTime(target.event.startsAt)}. Your place is released to other players and this cannot be undone.${
              paid ? ' Any refund follows the cancellation policy and shows here once it is started.' : ''
            }`
      }
      confirmLabel="Cancel registration"
      cancelLabel="Keep my place"
      destructive
      loading={mutation.isPending}
      loadingLabel="Cancelling"
    >
      {error === null ? null : (
        <Banner tone="danger" live="alert" title={error.title}>
          {error.body}
        </Banner>
      )}
    </ConfirmDialog>
  )
}
