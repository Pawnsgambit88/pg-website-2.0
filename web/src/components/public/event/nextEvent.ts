import type { EventCardDto } from '@/lib/api/types/event'

// "Next relevant event" for sold out, closed, live, completed and cancelled pages (TASK-043 notes). Pure, no directive.

/**
 * First upcoming event other than `currentSlug` that is open for registration, otherwise the first other upcoming one.
 * The list comes sorted by start time from the upcoming fetcher. Null when there is none.
 */
export function pickNextEvent(upcoming: readonly EventCardDto[], currentSlug: string): EventCardDto | null {
  const others = upcoming.filter((event) => event.slug !== currentSlug)
  return others.find((event) => event.status === 'registration_open') ?? others[0] ?? null
}
