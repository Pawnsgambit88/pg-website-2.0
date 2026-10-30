import { z } from 'zod'
import { authoringSlugSchema, isoInstantSchema, uuidSchema } from '@/lib/api/types/primitives'

// Authoring slug rules for events and stories (contract 2.7, E05, FR-03, D-03; builder step 1, screen 35).
//
//   - Regex ^[a-z0-9]+(-[a-z0-9]+)*$, 3 to 80 characters (length inferred), unique per type, case-insensitive.
//   - Drafts may change the slug and have no public URL. After FIRST PUBLISH the slug is locked for good: unpublishing does
//     not unlock it, a change returns SLUG_LOCKED. Cancelled and completed events keep their slug and URL.
//   - The server never auto-suffixes on publish (SLUG_TAKEN). The builder proposes a slug from the title and calls E05.
//   - There is no UI path to correct a published slug (FEAT-001 OQ-15).
// `authoringSlugSchema` (3 to 80) lives in primitives.ts; reads use the looser `slugSchema` (max 100, M13).

export const AUTHORING_SLUG_MIN = 3
export const AUTHORING_SLUG_MAX = 80

export const SLUG_ENTITY_TYPES = ['event', 'story'] as const
export const slugEntityTypeSchema = z.enum(SLUG_ENTITY_TYPES)
export type SlugEntityType = z.infer<typeof slugEntityTypeSchema>

/** `GET /admin/slugs/check` query (E05). `excludeId` is the entity being edited so its own slug is not "taken". */
export const slugCheckQuerySchema = z.strictObject({
  type: slugEntityTypeSchema,
  slug: authoringSlugSchema,
  excludeId: uuidSchema.optional(),
})
export type SlugCheckQuery = z.infer<typeof slugCheckQuerySchema>

/** E05 response. A taken slug may carry a free suggestion; an available one never does. */
export const slugCheckResultSchema = z.discriminatedUnion('available', [
  z.object({ available: z.literal(true) }),
  z.object({ available: z.literal(false), suggestion: authoringSlugSchema.optional() }),
])
export type SlugCheckResult = z.infer<typeof slugCheckResultSchema>

/**
 * The slug field of an event or story resource. `editable` is a draft that has never been published (value may be unset);
 * `locked` has been published at least once and always has a value. The UI shows a slug input only for `editable`.
 */
export const slugFieldSchema = z.discriminatedUnion('lock', [
  z.object({ lock: z.literal('editable'), value: authoringSlugSchema.nullable() }),
  z.object({ lock: z.literal('locked'), value: authoringSlugSchema, lockedAt: isoInstantSchema }),
])
export type SlugField = z.infer<typeof slugFieldSchema>

/**
 * Proposes a slug from a title: lowercase ASCII words joined by single hyphens, cut at 80 characters on a clean edge.
 * Returns null when nothing usable remains (fewer than 3 characters). A proposal, never authoritative: always check it.
 */
export function proposeSlug(title: string): string | null {
  const words = title
    .normalize('NFKD')
    .replace(/\p{M}+/gu, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
  const cut = words.slice(0, AUTHORING_SLUG_MAX).replace(/-+$/, '')
  return cut.length >= AUTHORING_SLUG_MIN ? cut : null
}
