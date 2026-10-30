import 'server-only'
import { cache } from 'react'
import { getPublicApi } from '@/lib/api/adapters/getPublicApi.server'
import { parseSlug } from '@/lib/api/types/primitives'
import type { StoryDetailDto } from '@/lib/api/types/story'
import { tagsFor } from '@/lib/data/public/tags'
import { publicReadOpts } from '@/lib/preview/server'

// P07 story detail (`/stories/[slug]`, ISR). Tags `stories`, `story:{slug}` (ARCH-001 9.3).
// M13: slug validated first; an invalid slug is null before any fetch or tag (see event-by-slug.ts for the reasoning).
// A backend 404 is null via the adapter; every other failure throws.

export const getStoryBySlug = cache(async (rawSlug: string): Promise<StoryDetailDto | null> => {
  const slug = parseSlug(rawSlug)
  if (slug === null) return null
  return getPublicApi().getStoryBySlug(slug, await publicReadOpts(tagsFor.story(slug)))
})
