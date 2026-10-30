import 'server-only'
import { LEGAL_PAGES, type LegalPage } from '@/lib/api/types/legal-sitemap'
import { parseSlug, type Slug } from '@/lib/api/types/primitives'
import { SITE_SECTIONS, type SiteSection } from '@/lib/api/types/site-content'

// Body validation (ARCH-001-isr-revalidation section 3.2). Strict: unknown keys, unknown types or actions, invalid
// (type, action) pairs and bad slugs are all rejected. The slug is checked with the slug regex BEFORE it can reach a tag.
// `player` / `result` and the privacy actions are accepted (FE-03; ISR doc section 6 proposal): the backend
// (backend/content/revalidation.py) can send them, and a 400 would mark the outbox row failed.

export const REVALIDATE_TYPES = ['event', 'story', 'testimonial', 'site', 'media', 'legal', 'player', 'result'] as const
export type RevalidateType = (typeof REVALIDATE_TYPES)[number]

export const REVALIDATE_ACTIONS = [
  'published',
  'updated',
  'unpublished',
  'deleted',
  'cancelled',
  'completed',
  'privacy_updated',
  'emergency_purge',
] as const
export type RevalidateAction = (typeof REVALIDATE_ACTIONS)[number]

export type RevalidateEvent =
  | { readonly type: 'event' | 'story'; readonly action: RevalidateAction; readonly slug: Slug }
  | { readonly type: 'site'; readonly action: RevalidateAction; readonly section: SiteSection }
  | { readonly type: 'legal'; readonly action: RevalidateAction; readonly page: LegalPage }
  | { readonly type: 'testimonial' | 'media' | 'player' | 'result'; readonly action: RevalidateAction }

const ALLOWED_KEYS = new Set(['type', 'action', 'id', 'slug', 'occurredAt', 'version'])
/** Entity UUID or section key. The backend may send a slug here when it has no uuid, so 100 characters are allowed. */
const ID_SHAPE = /^[A-Za-z0-9][A-Za-z0-9_-]{0,99}$/
/** ISO 8601 date-time with an explicit offset (`Z` or `+hh:mm`). */
const OCCURRED_AT_SHAPE = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,6})?(?:Z|[+-]\d{2}:\d{2})$/

const isType = (value: unknown): value is RevalidateType =>
  typeof value === 'string' && (REVALIDATE_TYPES as readonly string[]).includes(value)

const isAction = (value: unknown): value is RevalidateAction =>
  typeof value === 'string' && (REVALIDATE_ACTIONS as readonly string[]).includes(value)

const COMMON_ACTIONS: readonly RevalidateAction[] = ['published', 'updated', 'unpublished', 'deleted']

/** Mirrors backend ALLOWED_ACTIONS: `cancelled`/`completed` are event-only, privacy actions are player-only. */
const ALLOWED_ACTIONS: Readonly<Record<RevalidateType, readonly RevalidateAction[]>> = {
  event: [...COMMON_ACTIONS, 'cancelled', 'completed'],
  story: COMMON_ACTIONS,
  testimonial: COMMON_ACTIONS,
  site: COMMON_ACTIONS,
  media: COMMON_ACTIONS,
  legal: COMMON_ACTIONS,
  player: ['deleted', 'privacy_updated', 'emergency_purge'],
  result: ['deleted'],
}
const isValidPair = (type: RevalidateType, action: RevalidateAction): boolean => ALLOWED_ACTIONS[type].includes(action)

/** Parses and validates the body text. Returns undefined for anything that is not a valid event (never throws). */
export function parsePayload(text: string): RevalidateEvent | undefined {
  let data: unknown
  try {
    data = JSON.parse(text)
  } catch {
    return undefined
  }
  if (typeof data !== 'object' || data === null || Array.isArray(data)) return undefined
  const body = data as Record<string, unknown>
  if (Object.keys(body).some((key) => !ALLOWED_KEYS.has(key))) return undefined

  const { type, action, id, slug, occurredAt, version } = body
  if (!isType(type) || !isAction(action) || !isValidPair(type, action)) return undefined
  if (typeof id !== 'string' || !ID_SHAPE.test(id)) return undefined
  if (typeof occurredAt !== 'string' || !OCCURRED_AT_SHAPE.test(occurredAt) || Number.isNaN(Date.parse(occurredAt))) {
    return undefined
  }
  if (typeof version !== 'number' || !Number.isSafeInteger(version) || version < 0) return undefined

  // A slug that is present must be valid whatever the type; event and story require it.
  let parsedSlug: Slug | null = null
  if (slug !== undefined) {
    if (typeof slug !== 'string') return undefined
    parsedSlug = parseSlug(slug)
    if (parsedSlug === null) return undefined
  }

  switch (type) {
    case 'event':
    case 'story':
      return parsedSlug === null ? undefined : { type, action, slug: parsedSlug }
    case 'site': {
      const section = SITE_SECTIONS.find((candidate) => candidate === id)
      return section === undefined ? undefined : { type, action, section }
    }
    case 'legal': {
      const page = LEGAL_PAGES.find((candidate) => candidate === id)
      return page === undefined ? undefined : { type, action, page }
    }
    case 'testimonial':
    case 'media':
    case 'player':
    case 'result':
      return { type, action }
  }
}
