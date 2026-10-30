import 'server-only'
import type { EventCardDto } from '@/lib/api/types/event'
import type { SiteSectionOf } from '@/lib/api/types/site-content'
import { getSiteSection } from '@/lib/data/public/site-section'
import { getUpcomingEvents } from '@/lib/data/public/upcoming-events'

// Home fetchers (HOME-PAGE-PLAN section 4). Both are thin views over the cached fetchers, so React.cache and the
// tags (`site:home`, `events`) come from site-section.ts and upcoming-events.ts. The page starts them together
// (Promise.all / allSettled for the events branch only, per the plan); nothing here awaits one before the other.

/** Upcoming cards shown on Home (plan section 4: limit 3, server order by start time). */
export const HOME_UPCOMING_LIMIT = 3

/** The published `home` site section (content plus `updatedAt` for the sitemap lastmod). Throws on failure. */
export function getHomeContent(): Promise<SiteSectionOf<'home'>> {
  return getSiteSection('home')
}

/** At most three upcoming event cards for Home. Throws on failure (the page decides how to degrade). */
export async function getUpcomingEventsForHome(): Promise<EventCardDto[]> {
  const page = await getUpcomingEvents(1, HOME_UPCOMING_LIMIT)
  return page.items
}
