import 'server-only'
import { cache } from 'react'
import { getPublicApi } from '@/lib/api/adapters/getPublicApi.server'
import { DEFAULT_PAGE_SIZE, type Page } from '@/lib/api/types/pagination'
import type { StoryCardDto } from '@/lib/api/types/story'
import { PUBLIC_REVALIDATE_SECONDS } from '@/lib/data/public/cache-policy'
import { normalisePage, normalisePageSize } from '@/lib/data/public/paging'
import { tagsFor } from '@/lib/data/public/tags'

// P06 published story cards (Stories page, Home featured story). Tag `stories` (ARCH-001 9.3). Primitive arguments for
// React.cache. Cards only (no body blocks): the detail body comes from getStoryBySlug.

const loadStories = cache((page: number, pageSize: number) =>
  getPublicApi().getStories({ page, pageSize }, { tags: tagsFor.stories(), revalidate: PUBLIC_REVALIDATE_SECONDS }),
)

/** One page of story cards. Throws on failure. */
export function getStories(page = 1, pageSize = DEFAULT_PAGE_SIZE): Promise<Page<StoryCardDto>> {
  return loadStories(normalisePage(page), normalisePageSize(pageSize))
}
