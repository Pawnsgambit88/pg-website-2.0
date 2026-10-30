import { Banner } from '@/components/ui/feedback/Banner'
import { copyFor } from '@/lib/api/error-copy'
import type { ApiError } from '@/lib/api/errors'

/** A failed command, as visible text from the error-copy map (never server text). Announces once (role=alert). */
export function ErrorLine({ error, action }: { error: ApiError | null; action: string }) {
  if (error === null) return null
  const copy = copyFor(error, { action })
  return (
    <Banner tone="danger" live="alert" title={copy.title}>
      {copy.body}
    </Banner>
  )
}
