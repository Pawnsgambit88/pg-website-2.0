'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/Button'
import { useApi } from '@/lib/api/adapters/useApi.browser'
import { copyFor } from '@/lib/api/error-copy'
import { isAbortError } from '@/lib/api/errors'
import { rememberReturnTo } from '@/features/auth/return-to'

interface GoogleSignInButtonProps {
  /** Validated `?returnTo=`, recorded as the intent so `/auth/callback` can continue there (TASK-052). */
  returnTo: string | undefined
}

const ERROR_ID = 'google-sign-in-error'

/**
 * "Continue with Google" (ARCH-001 12.6). Rendered only when NEXT_PUBLIC_GOOGLE_AUTH is on, and loaded with next/dynamic
 * from LoginForm so a build with the flag off ships none of it. Backend-mediated: the server returns the redirect URL
 * (host allow-listed in the adapter, F-16) and the browser leaves the page; no Google script, no client secret.
 * 48px high (`lg`), full width, first in the panel per the reference. Stays busy while the browser navigates away.
 */
export function GoogleSignInButton({ returnTo }: GoogleSignInButtonProps) {
  const api = useApi()
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const start = async () => {
    setPending(true)
    setError(null)
    try {
      if (returnTo !== undefined) rememberReturnTo(returnTo)
      const { url } = await api.player.auth.startGoogleSignIn()
      window.location.assign(url)
    } catch (failure) {
      if (isAbortError(failure)) return
      const copy = copyFor(failure, { action: 'start Google sign-in' })
      setError(`${copy.title}. ${copy.body}`)
      setPending(false)
    }
  }

  return (
    <div className="grid min-w-0 gap-2">
      <Button
        variant="secondary"
        size="lg"
        fullWidth
        loading={pending}
        loadingLabel="Opening Google sign-in"
        aria-describedby={error === null ? undefined : ERROR_ID}
        onClick={() => void start()}
      >
        Continue with Google
      </Button>
      <div id={ERROR_ID} role="alert" className="min-w-0 empty:hidden">
        {error === null ? null : <p className="text-sm font-semibold wrap-break-word text-danger-ink">{error}</p>}
      </div>
    </div>
  )
}
