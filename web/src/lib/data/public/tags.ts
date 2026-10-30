import 'server-only'
import type { LegalPage } from '@/lib/api/types/legal-sitemap'
import type { Slug } from '@/lib/api/types/primitives'
import type { SiteSection } from '@/lib/api/types/site-content'

// The cache tag scheme (ARCH-001 9.3; ARCH-001-isr-revalidation section 2). ONE file used by the public fetchers (to
// attach tags) and by the revalidation mapper (TASK-114, to expire them), so the scheme cannot drift.
// Tags are lowercase and well under Next's 256-character limit: slugs are already validated (max 100, M13) because the
// slug builders take the branded `Slug`, which only parseSlug() produces.
//
// Every builder returns a NEW array: ReadOpts.tags is mutable and must never alias shared module state
// (RBP server-no-shared-module-state).

export const TAG = {
  events: 'events',
  pastEvents: 'past-events',
  stories: 'stories',
  testimonials: 'testimonials',
  sitemap: 'sitemap',
  event: (slug: Slug) => `event:${slug}`,
  story: (slug: Slug) => `story:${slug}`,
  site: (section: SiteSection) => `site:${section}`,
  legal: (page: LegalPage) => `legal:${page}`,
} as const

/** Tag sets attached by each fetcher (ARCH-001 9.3 "Attached by" column). */
export const tagsFor = {
  /** getUpcomingEvents, getUpcomingEventsForHome. */
  upcomingEvents: (): string[] => [TAG.events],
  /** getPastEvents. */
  pastEvents: (): string[] => [TAG.pastEvents],
  /**
   * getEventBySlug. `past-events` is attached as well because a completed event renders its archive block from the
   * same response (isr-revalidation section 2, "completed mode"); every event webhook expires all three anyway (9.4).
   */
  event: (slug: Slug): string[] => [TAG.events, TAG.event(slug), TAG.pastEvents],
  /** getStories. */
  stories: (): string[] => [TAG.stories],
  /** getStoryBySlug. */
  story: (slug: Slug): string[] => [TAG.stories, TAG.story(slug)],
  /** getTestimonials. */
  testimonials: (): string[] => [TAG.testimonials],
  /** getSiteSection / getHomeContent. */
  site: (section: SiteSection): string[] => [TAG.site(section)],
  /** getLegalPage. */
  legal: (page: LegalPage): string[] => [TAG.legal(page)],
  /** getSitemapEntries. */
  sitemap: (): string[] => [TAG.sitemap],
  /**
   * getPublicSettings. ARCH-001 9.3 has no settings tag; the DTO is "may instead ride inside footer / meta"
   * (site-content.ts), so it rides on `site:meta` and a meta publish refreshes it. Open point for TASK-113/114.
   */
  publicSettings: (): string[] => [TAG.site('meta')],
} as const
