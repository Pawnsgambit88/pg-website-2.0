import { overlayStep } from '@/features/event-builder/patch'
import type { PendingPatch } from '@/features/event-builder/types'
import type { BuilderDraftDto } from '@/lib/api/types/admin/event-builder'
import { metaDescription } from '@/lib/seo/description'
import { buildMetadata, type SeoImage } from '@/lib/seo/metadata'

// SEO preview model: the same `buildMetadata` call the public event page makes in its `generateMetadata`
// (app/(public)/events/[slug]/page.tsx), fed with the draft (server resource plus unsent edits). Pure.

export interface SeoPreviewModel {
  /** Document title (`<title>`), site name included. */
  documentTitle: string
  description: string | null
  url: string
  imageUrl: string
  imageAlt: string
  /** False when the slug is still missing or invalid: the URL shows a placeholder. */
  hasSlug: boolean
}

const SLUG_PLACEHOLDER = 'your-event-address'
const VALID_SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/

function textOf(value: unknown): string | null {
  return typeof value === 'string' ? value : null
}

export function toSeoPreview(server: BuilderDraftDto, pending: PendingPatch, cover: SeoImage | null): SeoPreviewModel {
  const basics = overlayStep('basics', server.basics, pending.basics)
  const experience = overlayStep('experience', server.experience, pending.experience)
  const slug = basics.slug.value
  const hasSlug = typeof slug === 'string' && VALID_SLUG.test(slug)
  const title = basics.title.trim() === '' ? 'Untitled event' : basics.title.trim()

  const metadata = buildMetadata({
    title,
    description: metaDescription([basics.promise, experience.description]),
    path: `/events/${hasSlug ? slug : SLUG_PLACEHOLDER}`,
    image: cover,
  })

  const images = metadata.openGraph?.images
  const first = Array.isArray(images) ? images[0] : images
  const image = typeof first === 'object' && first !== null && 'url' in first ? first : null

  return {
    documentTitle: textOf(metadata.openGraph?.title) ?? title,
    description: textOf(metadata.description),
    url: textOf(metadata.alternates?.canonical?.toString()) ?? '',
    imageUrl: image === null ? '' : image.url.toString(),
    imageAlt: image === null ? '' : (textOf(image.alt) ?? ''),
    hasSlug,
  }
}
