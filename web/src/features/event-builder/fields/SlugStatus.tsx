'use client'

import { useQuery } from '@tanstack/react-query'
import { useEffect, useState } from 'react'
import { useApi } from '@/lib/api/adapters/useApi.browser'
import type { BuilderDraftDto } from '@/lib/api/types/admin/event-builder'
import { AUTHORING_SLUG_MAX, AUTHORING_SLUG_MIN } from '@/lib/api/types/admin/slug'
import { authoringSlugSchema } from '@/lib/api/types/primitives'
import { qk } from '@/lib/query/keys'

const SLUG_DEBOUNCE_MS = 450
export const SLUG_STATUS_ID = 'basics-slug-status'

function useDebounced<T>(value: T, ms: number): T {
  const [debounced, setDebounced] = useState(value)
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), ms)
    return () => clearTimeout(timer)
  }, [value, ms])
  return debounced
}

/** Live E05 availability feedback for the typed slug (debounced, polite status text). */
export function SlugStatus({ slug, eventId }: { slug: string; eventId: BuilderDraftDto['id'] }) {
  const api = useApi()
  const debounced = useDebounced(slug, SLUG_DEBOUNCE_MS)
  const parsed = authoringSlugSchema.safeParse(debounced)
  const check = useQuery({
    queryKey: qk.admin.slugCheck('event', debounced),
    queryFn: ({ signal }) =>
      parsed.success
        ? api.admin.events.checkSlug({ type: 'event', slug: parsed.data, excludeId: eventId }, { signal })
        : Promise.reject(new Error('invalid slug')),
    enabled: parsed.success,
    staleTime: 0,
  })
  let message = ''
  if (slug === debounced && slug !== '') {
    if (!parsed.success) {
      message = `Use ${AUTHORING_SLUG_MIN} to ${AUTHORING_SLUG_MAX} lowercase letters, numbers and single hyphens.`
    } else if (check.data === undefined) {
      message = check.isError
        ? 'We could not check this link right now. It is checked again when you publish.'
        : 'Checking the link...'
    } else if (check.data.available) {
      message = 'This link is available.'
    } else {
      message = check.data.suggestion
        ? `This link is already taken. Try "${check.data.suggestion}".`
        : 'This link is already taken. Choose another.'
    }
  }
  return (
    <p id={SLUG_STATUS_ID} role="status" className="type-small mt-2 min-h-6 wrap-break-word text-muted">
      {message}
    </p>
  )
}
