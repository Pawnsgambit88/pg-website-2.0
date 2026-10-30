import { z } from 'zod'
import { focalSchema, mediaSrcSchema } from '@/lib/api/types/primitives'

// Media references on public DTOs (ARCH-001 13.3, CONTENT-MODEL-MAP). Object keys vs URLs: the contract returns a URL or
// a same-origin path; `mediaSrcSchema` applies the allow-list policy hook (F-16, F-24). Adapters that know the real
// host allow-list re-check with `createMediaSrcSchema(policy)`.

/** Tiny inline placeholder only. Anything else (remote data URIs, SVG) is rejected. */
const blurDataUrlSchema = z
  .string()
  .max(4096)
  .regex(/^data:image\/(?:png|jpeg|webp|avif);base64,[A-Za-z0-9+/]+={0,2}$/)

const mediaBase = {
  src: mediaSrcSchema,
  width: z.int().min(1).max(20000),
  height: z.int().min(1).max(20000),
  focal: focalSchema,
  blurDataUrl: blurDataUrlSchema.optional(),
}

/**
 * One image. `alt` is required unless the asset is explicitly decorative (then it is the empty string). A union on
 * `decorative` makes "no alt and not decorative" unrepresentable.
 */
export const mediaRefSchema = z.discriminatedUnion('decorative', [
  z.object({ ...mediaBase, decorative: z.literal(false), alt: z.string().trim().min(1).max(300) }),
  z.object({ ...mediaBase, decorative: z.literal(true), alt: z.literal('') }),
])
export type MediaRef = z.infer<typeof mediaRefSchema>

export const MEDIA_MODES = ['static', 'carousel'] as const
export const mediaModeSchema = z.enum(MEDIA_MODES)

/**
 * Ordered collection for a section or an event. 0 items renders the placeholder, 1 item is static whatever `mode` says,
 * 2+ enables carousel controls when `mode` is carousel: those are rendering rules, the data is passed through.
 */
export const mediaCollectionSchema = z.object({
  mode: mediaModeSchema,
  autoplay: z.boolean(),
  intervalMs: z.int().min(2000).max(60000),
  items: z.array(mediaRefSchema).max(24),
})
export type MediaCollection = z.infer<typeof mediaCollectionSchema>
