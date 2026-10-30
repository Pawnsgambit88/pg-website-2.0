'use client'

import { useQuery } from '@tanstack/react-query'
import { useDeferredValue, useMemo } from 'react'
import { Heading } from '@/components/ui/Heading'
import { ResponsiveImage } from '@/components/ui/media/ResponsiveImage'
import { useBuilderSelector } from '@/features/event-builder/context'
import { toSeoPreview } from '@/features/event-builder/review/seo-model'
import { useApi } from '@/lib/api/adapters/useApi.browser'
import { adminMediaCollectionQuery } from '@/lib/query/query-options/admin'
import type { SeoImage } from '@/lib/seo/metadata'

/** How the public event page will appear in search results and shared links (title, description, Open Graph image). */
export function SeoPreview() {
  const api = useApi().admin
  const server = useBuilderSelector((state) => state.server)
  const pending = useBuilderSelector((state) => state.pending)
  const collectionId = useBuilderSelector(
    (state) => state.pending.media?.collectionId ?? state.server.media.collectionId,
  )
  const deferredServer = useDeferredValue(server)
  const deferredPending = useDeferredValue(pending)

  // The public page uses the event cover or the first media image, else the brand card.
  const collection = useQuery({
    ...adminMediaCollectionQuery(api, (collectionId ?? '') as Parameters<typeof adminMediaCollectionQuery>[1]),
    enabled: typeof collectionId === 'string' && collectionId !== '',
  })
  const first = collection.data?.items[0]
  const cover = useMemo<SeoImage | null>(
    () =>
      first === undefined ? null : { src: first.src, width: first.width, height: first.height, alt: first.alt ?? '' },
    [first],
  )
  const model = useMemo(
    () => toSeoPreview(deferredServer, deferredPending, cover),
    [deferredServer, deferredPending, cover],
  )

  return (
    <section aria-labelledby="review-seo" className="grid min-w-0 gap-3">
      <Heading level={2} size="card" id="review-seo">
        Search and sharing preview
      </Heading>
      <p className="text-sm text-muted">How this event looks in search results and when its link is shared.</p>
      <div className="rounded-lg grid min-w-0 gap-4 border border-line p-4 sm:grid-cols-[minmax(0,1fr)_12rem]">
        <div className="grid min-w-0 gap-1">
          <p className="m-0 text-sm wrap-anywhere text-muted" data-testid="seo-url">
            {model.url}
          </p>
          <p className="m-0 text-lg font-strong wrap-break-word text-ink" data-testid="seo-title">
            {model.documentTitle}
          </p>
          <p className="m-0 text-sm wrap-break-word text-ink" data-testid="seo-description">
            {model.description ?? 'No description yet. Add a one-line promise or a description.'}
          </p>
          {model.hasSlug ? null : <p className="m-0 text-sm text-muted">The address is not set yet (step 1).</p>}
        </div>
        <div className="min-w-0">
          {cover === null || first === undefined ? (
            <p className="m-0 text-sm text-muted">
              Shared links use the Pawn&apos;s Gambit card until the event has an image.
            </p>
          ) : (
            <ResponsiveImage
              src={cover.src}
              width={cover.width}
              height={cover.height}
              {...(cover.alt === ''
                ? { decorative: true as const, alt: '' as const }
                : { decorative: false as const, alt: cover.alt })}
              focal={first.focal}
              ratio="16:9"
              sizes="192px"
            />
          )}
        </div>
      </div>
    </section>
  )
}
