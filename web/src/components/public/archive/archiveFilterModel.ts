import type { EventType } from '@/lib/api/types/event-state'
import type { ArchiveItem } from './archiveItem'

// Archive type-filter chip model (EV-07, screen 05). Mirrors the Play filter model but for the past-events page.
// State lives in the URL hash (`#type=social`) so static prerendering is preserved (ARCH-001 7.3).
// Q9 resolution: Tournaments → rated_tournament | league; Special formats → workshop | special.

/** Filter chips in reference order. `all` is the neutral choice. */
export const ARCHIVE_FILTERS = ['all', 'social', 'tournament', 'special'] as const
export type ArchiveFilter = (typeof ARCHIVE_FILTERS)[number]

export const ARCHIVE_FILTER_LABEL: Readonly<Record<ArchiveFilter, string>> = {
  all: 'All',
  social: 'Social',
  tournament: 'Tournaments',
  special: 'Special formats',
}

/** Event types that belong to each non-all chip (Q9 from PLAN-003). */
const TYPE_FILTER: Readonly<Record<Exclude<ArchiveFilter, 'all'>, readonly EventType[]>> = {
  social: ['social'],
  tournament: ['rated_tournament', 'league'],
  special: ['workshop', 'special'],
}

const FILTER_SET: ReadonlySet<string> = new Set(ARCHIVE_FILTERS)

function isArchiveFilter(value: string | null): value is ArchiveFilter {
  return value !== null && FILTER_SET.has(value)
}

/**
 * Parse the active archive type filter from the URL hash.
 * `#type=social` → `'social'`; missing or unknown → `'all'`.
 */
export function parseArchiveFilter(hash: string): ArchiveFilter {
  const raw = hash.startsWith('#') ? hash.slice(1) : hash
  if (raw === '') return 'all'
  let params: URLSearchParams
  try {
    params = new URLSearchParams(raw)
  } catch {
    return 'all'
  }
  const value = params.get('type')
  return isArchiveFilter(value) ? value : 'all'
}

/** Archive filter to hash string. `'all'` returns `''` (no hash) to keep the URL clean. */
export function serialiseArchiveFilter(filter: ArchiveFilter): string {
  if (filter === 'all') return ''
  return `#type=${filter}`
}

/** True when `item.type` matches the active chip filter. */
export function matchesArchiveFilter(item: ArchiveItem, filter: ArchiveFilter): boolean {
  if (filter === 'all') return true
  return (TYPE_FILTER[filter] as readonly EventType[]).includes(item.type)
}

/** Polite result-count text for the live region. */
export function archiveCountText(shown: number, total: number): string {
  const noun = total === 1 ? 'event' : 'events'
  if (shown === total) return `${total} past ${noun}`
  return `${shown} of ${total} past ${noun} match`
}
