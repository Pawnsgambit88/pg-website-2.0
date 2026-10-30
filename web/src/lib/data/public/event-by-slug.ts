import 'server-only'
import { cache } from 'react'
import { getPublicApi } from '@/lib/api/adapters/getPublicApi.server'
import { ApiError } from '@/lib/api/errors'
import type { EventDetailDto } from '@/lib/api/types/event'
import { parseSlug } from '@/lib/api/types/primitives'
import { tagsFor } from '@/lib/data/public/tags'
import { publicReadOpts } from '@/lib/preview/server'

// P03 event detail (`/events/[slug]`, ISR). Tags `events`, `event:{slug}`, `past-events` (ARCH-001 9.3; completed mode).
//
// M13: the raw route param is validated FIRST. An invalid slug returns null before getPublicApi(), before any tag is
// built and before any fetch, so the page calls notFound() and a hostile param never reaches a URL or a cache key.
// The page should still check isValidSlug itself (check-module-directives enforces it); this is the second line.
//
// React.cache is keyed on the raw string, so generateMetadata and the page (same param) share one upstream call.
// Draft mode (FE-04): a previewer's request carries X-Preview-Key and is private and uncached (publicReadOpts).
// A 404 from the backend (unknown, draft, unpublished) is null via the adapter; every other failure throws.

/** Draft preview only: the draft does not satisfy the strict public schema yet (empty or null required fields). */
export const INCOMPLETE_DRAFT = 'incomplete-draft' as const
export type IncompleteDraft = typeof INCOMPLETE_DRAFT

// Published reads stay strict: a schema mismatch for a visitor still throws. Only a previewer's request (previewKey set,
// draft mode) turns BAD_RESPONSE into the incomplete-draft state instead of a 500.
export const getEventBySlug = cache(async (rawSlug: string): Promise<EventDetailDto | IncompleteDraft | null> => {
  const slug = parseSlug(rawSlug)
  if (slug === null) return null
  const opts = await publicReadOpts(tagsFor.event(slug))
  try {
    return await getPublicApi().getEventBySlug(slug, opts)
  } catch (error) {
    if (opts.previewKey !== undefined && error instanceof ApiError && error.code === 'BAD_RESPONSE') {
      return INCOMPLETE_DRAFT
    }
    throw error
  }
})
