'use client'

import { useEffect } from 'react'
import { Button } from '@/components/ui/Button'
import { Eyebrow } from '@/components/ui/Eyebrow'
import { Heading } from '@/components/ui/Heading'
import { reportError } from '@/lib/observe/observer'

/** Route error boundaries pass `error` as `unknown`; only the opaque server digest is ever read from it. */
function digestOf(error: unknown): string | undefined {
  if (typeof error !== 'object' || error === null || !('digest' in error)) return undefined
  const { digest } = error
  return typeof digest === 'string' && /^[\w-]{1,32}$/.test(digest) ? digest : undefined
}

/**
 * Body of every `error.tsx` (ARCH-001 19.3, AC-09, AC-81): says what failed, offers retry and a way home, and never
 * renders the error message, stack or any request data (production strips server messages; client errors may carry
 * anything). The digest is an opaque hash that support can match to a server log line. `role="alert"` announces the
 * failure once. The failure is reported once through `lib/observe` (scrubbed; no-op in production until a provider is set).
 *
 * Look follows the designed 404 (reference `.not-found`, screen 12): centred eyebrow, display h1, one line of copy, then
 * the actions (stacked full width at 320, side by side from 480px).
 */
export function RouteError({ error, retry, area }: { error: unknown; retry: () => void; area: string }) {
  const digest = digestOf(error)
  useEffect(() => {
    reportError(error, { area: 'route-error', action: area, requestId: digest })
  }, [error, area, digest])
  return (
    <div className="shell flex flex-col items-center py-24 text-center sm:py-32" role="alert">
      <Eyebrow>Error</Eyebrow>
      <Heading level={1} size="page-intro" className="mt-3 mb-6">
        Something went wrong
      </Heading>
      <p className="max-w-prose text-xl wrap-break-word text-muted">
        We could not load {area}. Your data is safe. Try again, or go back to the home page.
      </p>
      {digest === undefined ? null : <p className="mt-3 font-mono text-label text-muted">Reference: {digest}</p>}
      <div className="mt-8 flex w-full flex-col justify-center gap-3 xs:w-auto xs:flex-row">
        <Button variant="primary" size="lg" onClick={() => retry()}>
          Try again
        </Button>
        <Button href="/" variant="secondary" size="lg">
          Home
        </Button>
      </div>
    </div>
  )
}
