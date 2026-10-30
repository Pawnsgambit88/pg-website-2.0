import { z } from 'zod'
import { contentBlocksSchema } from '@/lib/api/types/content-blocks'
import { mediaRefSchema } from '@/lib/api/types/media'
import { isoDateSchema, isoInstantSchema, plainText, slugSchema, versionSchema } from '@/lib/api/types/primitives'

// Stories (contract P06, P07; FEAT-001 OQ-01). Slug required, unique and IMMUTABLE ONCE PUBLISHED, same as events.

/** Story kind labels from the reference: club notes, event notes, rivalries. Extra kinds are a contract change. */
export const STORY_KINDS = ['club_notes', 'event_notes', 'rivalries'] as const
export const storyKindSchema = z.enum(STORY_KINDS)
export type StoryKind = z.infer<typeof storyKindSchema>

export const storyCardSchema = z.object({
  slug: slugSchema,
  kind: storyKindSchema,
  title: plainText(160),
  /** Dek / summary line. */
  dek: plainText(300),
  publishedOn: isoDateSchema,
  readingMinutes: z.int().min(1).max(120),
  featured: z.boolean(),
  cover: mediaRefSchema.nullable(),
  version: versionSchema,
})
export type StoryCardDto = z.infer<typeof storyCardSchema>

/** Detail adds the eyebrow and the closed block body. No HTML anywhere (OQ-01, 17.1). */
export const storyDetailSchema = storyCardSchema.extend({
  eyebrow: plainText(60),
  body: contentBlocksSchema,
  updatedAt: isoInstantSchema,
})
export type StoryDetailDto = z.infer<typeof storyDetailSchema>
