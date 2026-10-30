import { z } from 'zod'
import { backendUrlSchema, isInternalPath, isoInstantSchema, uuidSchema } from '@/lib/api/types/primitives'

// Preview link (contract PV01, ARCH-001 8.4 and 11.6). The backend returns `{SITE}/api/draft?token=<opaque>`; the token
// is single use and lasts 5 minutes. The adapter checks that the URL is on the site origin and `/api/draft`
// before the browser opens it (F-16). The token never goes into logs.

export const PREVIEW_KINDS = ['event', 'story', 'site'] as const
export const previewKindSchema = z.enum(PREVIEW_KINDS)
export type PreviewKind = z.infer<typeof previewKindSchema>

/** Site sections previewable by key; events and stories by UUID. */
const siteKey = z.enum(['home', 'community', 'nav', 'footer', 'meta'])

/** `POST /admin/preview-link` request. `id` is a UUID for events and stories, a section key for `site`. */
export const createPreviewLinkSchema = z.discriminatedUnion('kind', [
  z.strictObject({ kind: z.literal('event'), id: uuidSchema }),
  z.strictObject({ kind: z.literal('story'), id: uuidSchema }),
  z.strictObject({ kind: z.literal('site'), id: siteKey }),
])
export type CreatePreviewLinkInput = z.infer<typeof createPreviewLinkSchema>

/** Preview link response. `expiresAt` is shown so an admin knows to open it now. */
export const previewLinkSchema = z.object({
  url: backendUrlSchema.refine((value) => {
    const pathOnly = value.replace(/^https?:\/\/[^/]+/, '')
    return isInternalPath(pathOnly) && pathOnly.startsWith('/api/draft?')
  }, 'Preview URL must point at /api/draft'),
  expiresAt: isoInstantSchema,
})
export type PreviewLinkDto = z.infer<typeof previewLinkSchema>
