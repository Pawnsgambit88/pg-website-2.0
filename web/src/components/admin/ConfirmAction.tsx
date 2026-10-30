'use client'

import { useState, type ReactElement, type ReactNode } from 'react'
import { Banner } from '@/components/ui/feedback/Banner'
import { ConfirmDialog } from '@/components/ui/overlay/ConfirmDialog'
import { copyFor } from '@/lib/api/error-copy'
import { isAbortError } from '@/lib/api/errors'
import { newIdempotencyKey } from '@/lib/api/idempotency'
import type { IdempotencyKey } from '@/lib/api/types/primitives'

export interface ConfirmActionProps {
  /** The control that starts the intent. It receives an `onClick` that opens the dialog. */
  renderTrigger: (open: () => void) => ReactElement
  title: string
  /** Plain-words consequence ("This cancels 3 bookings and queues their refunds."). Also the accessible description. */
  consequence: string
  confirmLabel: string
  destructive?: boolean
  /** Extra content (a list of affected items). */
  children?: ReactNode
  /** Short label for error copy ("cancel this event"). */
  actionLabel: string
  /**
   * Runs the work. `key` is created when the dialog opens and is the SAME for every retry of this intent (a failed or
   * timed-out call can be retried safely; a new open creates a new key). Resolve to close the dialog; reject to keep it
   * open with the error. Step-up is handled below this call (adapter or `withStepUpToken`).
   */
  onConfirm: (key: IdempotencyKey) => Promise<void>
  /** Called after success, once the dialog closed. */
  onDone?: () => void
}

/**
 * Confirm-then-act pattern for admin commands (cancel event, refund, role change, publish round) (FE-14). Wraps
 * ConfirmDialog (focus starts on the safe action, no dismissal while running) and adds the intent's Idempotency-Key and an
 * inline error that uses the error-copy map (never server text). The dialog stays open on failure so the admin can retry
 * with the same key or cancel.
 */
export function ConfirmAction({
  renderTrigger,
  title,
  consequence,
  confirmLabel,
  destructive = false,
  children,
  actionLabel,
  onConfirm,
  onDone,
}: ConfirmActionProps) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<unknown>(null)
  // The key belongs to the intent: created when the dialog opens, replaced only by opening it again.
  const [intentKey, setIntentKey] = useState<IdempotencyKey | null>(null)

  const openDialog = (): void => {
    setIntentKey(newIdempotencyKey())
    setError(null)
    setOpen(true)
  }

  const confirm = (): void => {
    const key = intentKey ?? newIdempotencyKey()
    if (intentKey === null) setIntentKey(key)
    setLoading(true)
    setError(null)
    onConfirm(key).then(
      () => {
        setLoading(false)
        setOpen(false)
        onDone?.()
      },
      (failure: unknown) => {
        setLoading(false)
        if (!isAbortError(failure)) setError(failure)
      },
    )
  }

  const copy = error === null ? null : copyFor(error, { action: actionLabel })

  return (
    <>
      {renderTrigger(openDialog)}
      <ConfirmDialog
        open={open}
        onOpenChange={setOpen}
        onConfirm={confirm}
        title={title}
        consequence={consequence}
        confirmLabel={confirmLabel}
        destructive={destructive}
        loading={loading}
      >
        {children}
        {copy === null ? null : (
          <Banner tone="danger" title={copy.title} live="alert" className="mt-4">
            {copy.body}
          </Banner>
        )}
      </ConfirmDialog>
    </>
  )
}
