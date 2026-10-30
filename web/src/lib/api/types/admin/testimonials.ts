import { z } from 'zod'
import { draftText, lastChangeSchema, publicationStatusSchema, writeVersionSchema } from '@/lib/api/types/admin/common'
import { mediaAssetSummarySchema } from '@/lib/api/types/admin/media'
import { isoInstantSchema, uuidSchema, versionSchema } from '@/lib/api/types/primitives'

// Admin testimonials (contract S15, S16, screen 36; CMS-SPEC "Testimonials").
// The quote is exact and never rewritten. PUBLISH needs quote + portrait + consent (consentAt): a PUBLISHED testimonial
// without all three is unrepresentable here; a draft may miss any and appears as an attention item on the dashboard.

const quote = z.string().trim().min(1).max(600)
const name = z.string().trim().min(1).max(80)
const descriptor = z.string().trim().min(1).max(120)

const base = {
  id: uuidSchema,
  /** Draft text may be empty while the editor works; published text may not (see below). */
  name: draftText(80),
  descriptor: draftText(120),
  sortOrder: z.int().min(0).max(1000),
  version: versionSchema,
  updatedAt: isoInstantSchema,
  lastChange: lastChangeSchema.nullable(),
}

const draftPart = z.object({
  ...base,
  status: z.literal('draft'),
  quote: draftText(600),
  portrait: mediaAssetSummarySchema.nullable(),
  consentAt: isoInstantSchema.nullable(),
})

const publishedPart = z.object({
  ...base,
  name,
  descriptor,
  status: z.literal('published'),
  quote,
  portrait: mediaAssetSummarySchema,
  consentAt: isoInstantSchema,
  publishedAt: isoInstantSchema,
})

export const adminTestimonialSchema = z.discriminatedUnion('status', [draftPart, publishedPart])
export type AdminTestimonialDto = z.infer<typeof adminTestimonialSchema>

export const adminTestimonialsQuerySchema = z.strictObject({
  status: publicationStatusSchema.optional(),
  page: z.int().min(1).optional(),
  pageSize: z.int().min(1).max(100).optional(),
})
export type AdminTestimonialsQuery = z.infer<typeof adminTestimonialsQuerySchema>

/**
 * `POST /admin/testimonials`. `consent` records that the person agreed; the server stamps `consentAt`. The browser never
 * sends a timestamp. A draft may start with the quote alone.
 */
export const createTestimonialSchema = z.strictObject({
  quote: z.string().trim().min(1).max(600),
  name: z.string().trim().min(1).max(80).optional(),
  descriptor: z.string().trim().min(1).max(120).optional(),
  portraitAssetId: uuidSchema.optional(),
  consent: z.boolean().optional(),
  sortOrder: z.int().min(0).max(1000).optional(),
})
export type CreateTestimonialInput = z.infer<typeof createTestimonialSchema>

/** `PATCH /admin/testimonials/{id}`. Withdrawing consent (`consent: false`) on a published record is refused by the server. */
export const updateTestimonialSchema = z.strictObject({
  version: writeVersionSchema,
  quote: draftText(600).optional(),
  name: draftText(80).optional(),
  descriptor: draftText(120).optional(),
  portraitAssetId: uuidSchema.nullable().optional(),
  consent: z.boolean().optional(),
  sortOrder: z.int().min(0).max(1000).optional(),
})
export type UpdateTestimonialInput = z.infer<typeof updateTestimonialSchema>
