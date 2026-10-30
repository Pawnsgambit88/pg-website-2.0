import { z } from 'zod'
import { mediaRefSchema } from '@/lib/api/types/media'
import { plainText, uuidSchema } from '@/lib/api/types/primitives'

// Public-safe testimonial (contract P08). Published only: the server enforces quote + photo + consent before publish,
// so a public DTO always has all three. The consent timestamp and sort order are admin fields and are NOT exposed.
// The quote is exact and never rewritten; it renders as inert text.

export const testimonialSchema = z.object({
  /** Stable key for list rendering only; not a player id. */
  id: uuidSchema,
  quote: plainText(600),
  name: plainText(80),
  /** Descriptor or role, for example "Weekend regular". */
  descriptor: plainText(120),
  /** Required: a testimonial cannot publish without a photo. */
  portrait: mediaRefSchema,
})
export type TestimonialDto = z.infer<typeof testimonialSchema>

/** Bounded list, already sorted by the server. */
export const testimonialsSchema = z.array(testimonialSchema).max(24)
