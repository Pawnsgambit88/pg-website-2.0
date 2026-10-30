import 'server-only'
import { cache } from 'react'
import { getPublicApi } from '@/lib/api/adapters/getPublicApi.server'
import type { EventCardDto } from '@/lib/api/types/event'
import { DEFAULT_PAGE_SIZE, type Page } from '@/lib/api/types/pagination'
import { PUBLIC_REVALIDATE_SECONDS } from '@/lib/data/public/cache-policy'
import { normalisePage, normalisePageSize } from '@/lib/data/public/paging'
import { tagsFor } from '@/lib/data/public/tags'

// P02 published upcoming events (Home, Play). Tag `events` (ARCH-001 9.3).
// Arguments are primitives on purpose: React.cache compares with Object.is, so a query object would never hit
// (RBP server-cache-react). Filters and search on Play are client islands over this list (TASK-042); the server list is
// unfiltered so one cached response serves every filter state.

const loadUpcomingEvents = cache((page: number, pageSize: number) =>
  getPublicApi().getUpcomingEvents(
    { page, pageSize },
    { tags: tagsFor.upcomingEvents(), revalidate: PUBLIC_REVALIDATE_SECONDS },
  ),
)

/** One page of upcoming events, sorted by start time. Throws on failure; an empty list is a successful empty page. */
export function getUpcomingEvents(page = 1, pageSize = DEFAULT_PAGE_SIZE): Promise<Page<EventCardDto>> {
  return loadUpcomingEvents(normalisePage(page), normalisePageSize(pageSize))
}
