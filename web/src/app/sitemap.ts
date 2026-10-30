import type { MetadataRoute } from 'next'
import { getSitemapEntries } from '@/lib/data/public/sitemap-entries'
import { routesInGroup } from '@/lib/routes/routes'
import { isIndexablePath } from '@/lib/seo/metadata'
import { canonicalUrl } from '@/lib/seo/site'

// /sitemap.xml (TASK-112, ARCH-001 8.3, AC-14). Static with ISR: the same tagged fetcher (`sitemap`, 900 s) as the rest
// of the public data layer, so a publish webhook refreshes it. Absolute URLs from NEXT_PUBLIC_SITE_URL, lastmod from
// the DTO updatedAt.
//
// Sources: every fixed indexable (public) route in the registry (lib/routes/routes.ts) plus the backend entries
// (published events and stories, and `page` entries that carry a lastmod for fixed pages). Every URL is checked against
// the registry, so (auth), (app), (admin), (handoff), /api and unknown paths can never appear even if the backend sends
// them. Drafts and unpublished items are excluded by the backend projection (P10). Cancelled events stay listed (the
// page is live with a notice, FEAT-001 OQ-08) at a lower priority.
//
// A fetch failure throws: the build fails rather than baking an empty sitemap, and at runtime ISR keeps the last good one.
export const revalidate = 900

const PRIORITY: Readonly<Record<string, number>> = { '/': 1, '/play': 0.9 }
const DEFAULT_PAGE_PRIORITY = 0.6
const EVENT_PRIORITY = 0.8
const CANCELLED_EVENT_PRIORITY = 0.3
const STORY_PRIORITY = 0.5

type Entry = MetadataRoute.Sitemap[number]

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const entries = await getSitemapEntries()

  // Fixed pages: registry first (complete list), backend `page` entries add lastmod.
  const pageLastmod = new Map<string, string>()
  for (const entry of entries) {
    if (entry.type === 'page') pageLastmod.set(entry.path, entry.updatedAt)
  }
  const fixedPaths = routesInGroup('public')
    .filter((route) => !route.pattern.includes('['))
    .map((route) => route.pattern)

  const byUrl = new Map<string, Entry>()
  const add = (path: string, entry: Omit<Entry, 'url'>) => {
    if (!isIndexablePath(path)) return
    const url = canonicalUrl(path)
    if (!byUrl.has(url)) byUrl.set(url, { url, ...entry })
  }

  for (const path of fixedPaths) {
    const lastModified = pageLastmod.get(path)
    add(path, {
      ...(lastModified === undefined ? {} : { lastModified }),
      priority: PRIORITY[path] ?? DEFAULT_PAGE_PRIORITY,
    })
  }
  for (const entry of entries) {
    if (entry.type === 'event') {
      add(`/events/${entry.slug}`, {
        lastModified: entry.updatedAt,
        priority: entry.cancelled === true ? CANCELLED_EVENT_PRIORITY : EVENT_PRIORITY,
      })
    } else if (entry.type === 'story') {
      add(`/stories/${entry.slug}`, { lastModified: entry.updatedAt, priority: STORY_PRIORITY })
    }
  }

  return [...byUrl.values()]
}
