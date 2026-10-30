import type { MediaRef } from '@/lib/api/types/media'
import { ResponsiveImage } from '@/components/ui/media/ResponsiveImage'

interface EventHeroMediaProps {
  media: MediaRef | null | undefined
}

/**
 * Event hero photo (reference `.event-hero__media`, 4:3 with the brand shadow). The page's single `priority` image
 * (LCP). With no photo it keeps the same box as a sand tile so the layout does not move. Server Component.
 */
export function EventHeroMedia({ media }: EventHeroMediaProps) {
  if (media === null || media === undefined) {
    return (
      <div
        className="aspect-4/3 w-full rounded-public border border-line bg-linear-to-b from-sand to-paper-deep"
        data-media-state="empty"
      />
    )
  }
  return (
    <ResponsiveImage
      {...media}
      slot="eventHero"
      priority
      className="rounded-public border border-line shadow-brand"
    />
  )
}
