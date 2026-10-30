import 'server-only'
import { cache } from 'react'
import { getPublicApi } from '@/lib/api/adapters/getPublicApi.server'
import type { EventCardDto } from '@/lib/api/types/event'
import { DEFAULT_PAGE_SIZE, type Page } from '@/lib/api/types/pagination'
import { PUBLIC_REVALIDATE_SECONDS } from '@/lib/data/public/cache-policy'
import { normalisePage, normalisePageSize } from '@/lib/data/public/paging'
import { tagsFor } from '@/lib/data/public/tags'

// P05 past events archive (completed and cancelled), newest first. Tag `past-events` (ARCH-001 9.3).
// Search on the archive page is a client island over this list (TASK-045). Primitive arguments for React.cache.

const loadPastEvents = cache((page: number, pageSize: number) =>
  getPublicApi().getPastEvents({ page, pageSize }, { tags: tagsFor.pastEvents(), revalidate: PUBLIC_REVALIDATE_SECONDS }),
)

/** One page of past events. Throws on failure. */
export function getPastEvents(page = 1, pageSize = DEFAULT_PAGE_SIZE): Promise<Page<EventCardDto>> {
  return loadPastEvents(normalisePage(page), normalisePageSize(pageSize))
}
