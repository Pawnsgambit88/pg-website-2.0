import 'server-only'
import { cache } from 'react'
import { getPublicApi } from '@/lib/api/adapters/getPublicApi.server'
import type { SitemapEntryDto } from '@/lib/api/types/legal-sitemap'
import { PUBLIC_REVALIDATE_SECONDS } from '@/lib/data/public/cache-policy'
import { tagsFor } from '@/lib/data/public/tags'

// P10 sitemap entries for app/sitemap.ts (TASK-112). Tag `sitemap` (ARCH-001 8.3, 9.3).
// Reads the first page at the contract maximum (1000), then any further pages in parallel (RBP async-parallel).
// A hard page cap keeps a misbehaving backend from fanning out unbounded requests during a build. Throws on failure:
// a sitemap is never baked from partial data.

const SITEMAP_PAGE_SIZE = 1000
const MAX_SITEMAP_PAGES = 10

export const getSitemapEntries = cache(async (): Promise<SitemapEntryDto[]> => {
  const api = getPublicApi()
  const read = (page: number) =>
    api.getSitemapEntries(
      { page, pageSize: SITEMAP_PAGE_SIZE },
      { tags: tagsFor.sitemap(), revalidate: PUBLIC_REVALIDATE_SECONDS },
    )

  const first = await read(1)
  const lastPage = Math.min(first.pagination.totalPages, MAX_SITEMAP_PAGES)
  if (lastPage <= 1) return first.items

  const rest = await Promise.all(Array.from({ length: lastPage - 1 }, (_, index) => read(index + 2)))
  return [first.items, ...rest.map((page) => page.items)].flat()
})
