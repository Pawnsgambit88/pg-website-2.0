import { Eyebrow } from '@/components/ui/Eyebrow'
import { Heading } from '@/components/ui/Heading'
import { Carousel } from '@/components/ui/carousel/Carousel.tsx'
import type { MediaCollection } from '@/lib/api/types/media'

interface EventGalleryProps {
  title: string
  gallery: MediaCollection
}

const TITLE_ID = 'event-gallery-title'

/**
 * Archive gallery through the shared Carousel (native scroll-snap, every slide in the HTML, images lazy because this is
 * never the LCP). The caller renders it only when the collection has items. Server Component.
 */
export function EventGallery({ title, gallery }: EventGalleryProps) {
  return (
    <section aria-labelledby={TITLE_ID} className="min-w-0">
      <Eyebrow>From the night</Eyebrow>
      <Heading level={2} size="section" id={TITLE_ID} className="mt-3 mb-6 max-w-2xl">
        Photos
      </Heading>
      <Carousel media={gallery} label={`Photos from ${title}`} ratio="3:2" slot="split" />
    </section>
  )
}
