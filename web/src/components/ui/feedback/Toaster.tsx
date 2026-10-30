'use client'

import { useSyncExternalStore } from 'react'
import { ToastCard } from '@/components/ui/feedback/ToastCard'
import { getToastServerSnapshot, getToastSnapshot, subscribeToToasts } from '@/components/ui/feedback/toastStore'

/**
 * The one toast host (mount once in each client layout, next to `LiveRegion`). Visible notifications only: speech comes
 * from the shared polite live region via `pushToast`, so this list is not itself `aria-live` and nothing is read twice.
 * Success toasts leave after 5 seconds; errors stay until dismissed. Each toast has a 44px dismiss button. At most 3 show
 * at once and duplicates are dropped. Fixed to the bottom, full width at 320 and a 24rem column from `sm`, lifted by
 * the safe-area inset. The wrapper ignores pointer events so it never blocks the page behind it.
 */
export function Toaster() {
  const toasts = useSyncExternalStore(subscribeToToasts, getToastSnapshot, getToastServerSnapshot)
  if (toasts.length === 0) return null
  return (
    <section
      aria-label="Notifications"
      className="pointer-events-none fixed inset-x-0 bottom-0 z-toast flex justify-center px-gutter pb-safe-4 sm:justify-end"
    >
      <ol className="flex w-full flex-col gap-2 sm:max-w-sm">
        {toasts.map((toast) => (
          <ToastCard key={toast.id} toast={toast} />
        ))}
      </ol>
    </section>
  )
}
