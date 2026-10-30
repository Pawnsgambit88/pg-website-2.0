import { z } from 'zod'
import { contentBlocksSchema } from '@/lib/api/types/content-blocks'
import { isoDateSchema, isoInstantSchema, plainText, slugSchema, versionSchema } from '@/lib/api/types/primitives'

// Legal pages (contract P09) and sitemap entries (contract P10).

export const LEGAL_PAGES = ['privacy', 'terms', 'refund-policy'] as const
export const legalPageSchema = z.enum(LEGAL_PAGES)
export type LegalPage = z.infer<typeof legalPageSchema>

export const legalPageDtoSchema = z.object({
  page: legalPageSchema,
  title: plainText(120),
  blocks: contentBlocksSchema,
  effectiveDate: isoDateSchema,
  version: versionSchema,
})
export type LegalPageDto = z.infer<typeof legalPageDtoSchema>

/**
 * Sitemap entry: events and stories carry a slug, fixed pages carry a path. A union keeps both shapes honest.
 * `cancelled` lets the sitemap keep a cancelled event URL while marking it (FEAT-001 OQ-08).
 */
export const sitemapEntrySchema = z.discriminatedUnion('type', [
  z.object({
    type: z.literal('event'),
    slug: slugSchema,
    updatedAt: isoInstantSchema,
    cancelled: z.boolean().optional(),
  }),
  z.object({ type: z.literal('story'), slug: slugSchema, updatedAt: isoInstantSchema }),
  z.object({
    type: z.literal('page'),
    path: z
      .string()
      .regex(/^\/[a-z0-9/-]*$/)
      .max(100),
    updatedAt: isoInstantSchema,
  }),
])
export type SitemapEntryDto = z.infer<typeof sitemapEntrySchema>
