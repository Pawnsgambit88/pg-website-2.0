'use client'

import { useEffect, useState, type KeyboardEvent } from 'react'
import { Check } from '@/components/ui/icons/Check'
import { Close } from '@/components/ui/icons/Close'
import { cn } from '@/lib/cn'
import { SUCCESS_DISMISS_MS, dismissToast, type ToastItem } from '@/components/ui/feedback/toastStore'

/**
 * One visible toast. Success auto-dismisses after 5 seconds, paused while the dismiss button has focus or the pointer
 * is over the card; errors never auto-dismiss. Escape on the focused dismiss button closes it too.
 */
export function ToastCard({ toast }: { toast: ToastItem }) {
  const [paused, setPaused] = useState(false)
  const isError = toast.tone === 'error'

  useEffect(() => {
    if (isError || paused) return undefined
    const timer = setTimeout(() => dismissToast(toast.id), SUCCESS_DISMISS_MS)
    return () => clearTimeout(timer)
  }, [isError, paused, toast.id])

  function onKeyDown(event: KeyboardEvent<HTMLButtonElement>) {
    if (event.key === 'Escape') dismissToast(toast.id)
  }

  return (
    <li
      className={cn(
        'pointer-events-auto flex items-start gap-3 border bg-parchment-soft p-3 text-ink shadow-brand',
        isError ? 'border-danger' : 'border-success',
      )}
    >
      <span className={cn('mt-1', isError ? 'text-danger-ink' : 'text-success-ink')} aria-hidden="true">
        {isError ? <span className="font-mono text-sm">!</span> : <Check size="md" />}
      </span>
      <p className="min-w-0 flex-1 py-1 text-sm wrap-break-word">
        <span className="sr-only">{isError ? 'Error: ' : 'Success: '}</span>
        {toast.message}
      </p>
      <button
        type="button"
        aria-label="Dismiss notification"
        onClick={() => dismissToast(toast.id)}
        onKeyDown={onKeyDown}
        onFocus={() => setPaused(true)}
        onBlur={() => setPaused(false)}
        onPointerEnter={() => setPaused(true)}
        onPointerLeave={() => setPaused(false)}
        className="tap inline-flex size-9 shrink-0 items-center justify-center text-ink-soft hover:bg-line"
      >
        <Close size="md" />
      </button>
    </li>
  )
}
