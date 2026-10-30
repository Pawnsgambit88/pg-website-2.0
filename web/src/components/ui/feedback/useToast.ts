'use client'

import { pushToast } from '@/components/ui/feedback/toastStore'

interface ToastApi {
  /** Confirms something finished ("Saved"). Leaves after 5 seconds. */
  success: (message: string) => void
  /** Reports a failure the player should notice. Stays until dismissed. Use `copyFor` text, never server text. */
  error: (message: string) => void
}

const api: ToastApi = {
  success: (message) => {
    pushToast('success', message)
  },
  error: (message) => {
    pushToast('error', message)
  },
}

/** Stable toast functions; the hook subscribes to nothing, so callers never re-render because of toasts. */
export function useToast(): ToastApi {
  return api
}
