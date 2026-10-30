import type { StoryKind } from '@/lib/api/types/story'
import { formatEventDate } from '@/lib/format/date'
import { NO_VALUE } from '@/lib/format/placeholder'

// Plain-language labels for the story vocabulary (reference screen 07 eyebrows). Pure, no directive.

const KIND_LABEL: Readonly<Record<StoryKind, string>> = {
  club_notes: 'Club notes',
  event_notes: 'Event notes',
  rivalries: 'Rivalries',
}

export function storyKindLabel(kind: StoryKind | undefined): string {
  return (kind === undefined ? undefined : KIND_LABEL[kind]) ?? NO_VALUE
}

/** `5 Oct 2026` for an ISO calendar date (`2026-10-05`). Read at IST noon so the day never shifts. */
export function formatStoryDate(isoDate: string): string {
  return formatEventDate(`${isoDate}T12:00:00+05:30`, { weekday: 'none' })
}

export function readingTimeLabel(minutes: number): string {
  return `${minutes} min read`
}

export function storyHref(slug: string): `/stories/${string}` {
  return `/stories/${encodeURIComponent(slug)}`
}
