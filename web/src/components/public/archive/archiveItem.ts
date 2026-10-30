import type { EventCardDto } from '@/lib/api/types/event'
import type { MediaRef } from '@/lib/api/types/media'
import { parseInstant } from '@/lib/format/instant'

// The slice of a past-event card that crosses into the archive search island (rules 40: minimal DTOs across the
// boundary, never the whole entity). Pure, no directive.

export interface ArchiveItem {
  slug: string
  title: string
  promise: string
  format: string
  area: string
  startsAt: string
  status: EventCardDto['status']
  type: EventCardDto['type']
  archivePublished: boolean
  cover: MediaRef | null
}

export function toArchiveItem(event: EventCardDto): ArchiveItem {
  return {
    slug: event.slug,
    title: event.title,
    promise: event.promise,
    format: event.format,
    area: event.area,
    startsAt: event.startsAt,
    status: event.status,
    type: event.type,
    archivePublished: event.archivePublished,
    cover: event.cover,
  }
}

/** Newest first by start instant (ISO strings with different offsets only compare correctly as instants). */
export function newestFirst(items: readonly ArchiveItem[]): ArchiveItem[] {
  const time = (value: string) => parseInstant(value) ?? 0
  return items.toSorted((a, b) => time(b.startsAt) - time(a.startsAt))
}
