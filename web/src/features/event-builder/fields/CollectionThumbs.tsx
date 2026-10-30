import { ResponsiveImage } from '@/components/ui/media/ResponsiveImage'
import type { MediaCollectionAdminDto } from '@/lib/api/types/admin/media'

/** Thumbnail strip of a collection's images (decorative: the names are in the select and the library). */
export function CollectionThumbs({ collection }: { collection: MediaCollectionAdminDto }) {
  if (collection.items.length === 0) {
    return <p className="type-small text-muted">This collection has no images yet. The event shows a placeholder.</p>
  }
  return (
    <ul className="flex min-w-0 flex-wrap gap-2" aria-label={`Images in ${collection.name}`}>
      {collection.items.map((item) => (
        <li key={item.id} className="w-20">
          <ResponsiveImage
            src={item.src}
            width={item.width}
            height={item.height}
            focal={item.focal}
            decorative
            alt=""
            ratio="1:1"
            sizes="80px"
          />
        </li>
      ))}
    </ul>
  )
}
