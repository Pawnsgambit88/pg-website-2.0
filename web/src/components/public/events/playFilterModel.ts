import { eventAudienceLabel, eventTypeLabel } from '@/components/domain/eventLabels'
import type { EventCardDto } from '@/lib/api/types/event'

// Play filter model (TASK-042, reference screen 02 `.filter-row`). Pure and environment-free: the server page builds
// the per-event filter keys once, the client island only compares them. State lives in the URL hash (`#filter=social&q=
// blitz`), never in searchParams, so /play stays static (ARCH-001 7.3).

/** Filter chips in reference order. `all` is the neutral choice. */
export const PLAY_FILTERS = ['all', 'social', 'beginner', 'rated', 'free'] as const
export type PlayFilter = (typeof PLAY_FILTERS)[number]
export type PlayTag = Exclude<PlayFilter, 'all'>

export const PLAY_FILTER_LABEL: Readonly<Record<PlayFilter, string>> = {
  all: 'All games',
  social: 'Social',
  beginner: 'Beginner friendly',
  rated: 'Rated',
  free: 'Free',
}

/** What the client island needs per event (RBP server-serialization): the slug, its tags and lower-cased search text. */
export interface PlayFilterItem {
  slug: string
  tags: readonly PlayTag[]
  text: string
}

export interface PlayFilterState {
  filter: PlayFilter
  query: string
}

export const EMPTY_PLAY_FILTER_STATE: PlayFilterState = { filter: 'all', query: '' }

/** Longest search kept in the URL; longer input still filters, only the hash copy is cut. */
const MAX_QUERY_LENGTH = 80

const FILTER_SET: ReadonlySet<string> = new Set(PLAY_FILTERS)
const WHITESPACE = /\s+/

function isPlayFilter(value: string | null): value is PlayFilter {
  return value !== null && FILTER_SET.has(value)
}

/** Lower-case, trim and collapse whitespace so search compares like with like. */
export function normaliseSearch(value: string): string {
  return value.trim().toLowerCase().split(WHITESPACE).join(' ')
}

/** Filter keys for one event. Runs on the server; the island never sees the full DTO. */
export function toPlayFilterItem(event: EventCardDto): PlayFilterItem {
  const tags: PlayTag[] = []
  if (event.type === 'social') tags.push('social')
  if (event.audience === 'beginner') tags.push('beginner')
  if (event.rated || event.type === 'rated_tournament') tags.push('rated')
  if (event.price.pricePaise === 0) tags.push('free')
  const text = normaliseSearch(
    [
      event.title,
      event.promise,
      event.format,
      event.area,
      event.city,
      eventTypeLabel(event.type),
      eventAudienceLabel(event.audience),
    ].join(' '),
  )
  return { slug: event.slug, tags, text }
}

/** True when the item passes the chip and every search term (terms are AND-ed, substring match). */
export function matchesPlayFilter(item: PlayFilterItem, filter: PlayFilter, terms: readonly string[]): boolean {
  if (filter !== 'all' && !item.tags.includes(filter)) return false
  for (const term of terms) {
    if (!item.text.includes(term)) return false
  }
  return true
}

/** Search terms from raw input; empty input gives no terms. */
export function searchTerms(query: string): string[] {
  const normalised = normaliseSearch(query)
  return normalised === '' ? [] : normalised.split(' ')
}

/** `#filter=social&q=blitz` (or `''`) to state. Unknown or malformed values fall back to the empty state. */
export function parsePlayHash(hash: string): PlayFilterState {
  const raw = hash.startsWith('#') ? hash.slice(1) : hash
  if (raw === '') return EMPTY_PLAY_FILTER_STATE
  let params: URLSearchParams
  try {
    params = new URLSearchParams(raw)
  } catch {
    return EMPTY_PLAY_FILTER_STATE
  }
  const filterValue = params.get('filter')
  const filter = isPlayFilter(filterValue) ? filterValue : 'all'
  const query = (params.get('q') ?? '').slice(0, MAX_QUERY_LENGTH)
  return { filter, query }
}

/** State to a hash including `#`, or `''` for the empty state (so a clean URL stays clean). */
export function serialisePlayHash(state: PlayFilterState): string {
  const params = new URLSearchParams()
  if (state.filter !== 'all') params.set('filter', state.filter)
  const query = state.query.trim().slice(0, MAX_QUERY_LENGTH)
  if (query !== '') params.set('q', query)
  const value = params.toString()
  return value === '' ? '' : `#${value}`
}

/** "3 of 12 games" / "12 upcoming games", for the polite result count. */
export function resultCountText(shown: number, total: number): string {
  const noun = total === 1 ? 'game' : 'games'
  if (shown === total) return `${total} upcoming ${noun}`
  return `${shown} of ${total} ${noun}`
}
