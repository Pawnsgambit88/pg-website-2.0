import { formatStoryDate, readingTimeLabel } from '@/components/public/stories/storyLabels'
import { cn } from '@/lib/cn'

interface StoryMetaProps {
  publishedOn: string
  readingMinutes: number
  className?: string
}

/** Mono date and reading-time line shared by the story cards and the story detail header. Server Component. */
export function StoryMeta({ publishedOn, readingMinutes, className }: StoryMetaProps) {
  return (
    <p
      className={cn(
        'flex min-w-0 flex-wrap gap-x-2 gap-y-1 font-mono text-eyebrow text-muted uppercase',
        className,
      )}
    >
      <time dateTime={publishedOn}>{formatStoryDate(publishedOn)}</time>
      <span aria-hidden="true">·</span>
      <span>{readingTimeLabel(readingMinutes)}</span>
    </p>
  )
}
