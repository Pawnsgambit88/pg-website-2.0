import 'server-only'
import { cache } from 'react'
import { getPublicApi } from '@/lib/api/adapters/getPublicApi.server'
import type { AvailabilityDto } from '@/lib/api/types/event-state'
import { parseSlug } from '@/lib/api/types/primitives'
import { VOLATILE_REVALIDATE_SECONDS } from '@/lib/data/public/cache-policy'

// P04 live availability (ARCH-001 9.6). VOLATILE: no-store (revalidate 0) and NO tags, so it never enters the Next data
// cache. The prerendered event page must NOT call this: a no-store fetch during render opts the route into dynamic
// rendering and a cached number would be presented as live (AC-19). The public island (TASK-123) polls the browser
// client instead. This server fetcher exists for request-time server code only (for example a route handler or a
// dynamic shell); React.cache still dedups within one request.
//
// M13: slug validated first. Unlike the detail reads, an unknown slug is not null here: the contract returns 404 and
// the adapter throws (availability for a page that exists is the only legitimate call), so an invalid slug is null and
// a valid-but-unknown one throws.

export const getEventAvailability = cache(async (rawSlug: string): Promise<AvailabilityDto | null> => {
  const slug = parseSlug(rawSlug)
  if (slug === null) return null
  return getPublicApi().getEventAvailability(slug, { revalidate: VOLATILE_REVALIDATE_SECONDS })
})
