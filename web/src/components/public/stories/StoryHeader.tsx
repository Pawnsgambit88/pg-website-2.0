import { StoryMeta } from '@/components/public/stories/StoryMeta'
import { Eyebrow } from '@/components/ui/Eyebrow'
import { Heading } from '@/components/ui/Heading'
import { Text } from '@/components/ui/Text'
import { MediaFrame } from '@/components/ui/media/MediaFrame'
import type { StoryDetailDto } from '@/lib/api/types/story'

interface StoryHeaderProps {
  story: Pick<StoryDetailDto, 'eyebrow' | 'title' | 'dek' | 'publishedOn' | 'readingMinutes' | 'cover'>
  titleId: string
}

/**
 * Story detail header (no reference screen; stories editorial tokens): eyebrow, the page h1, dek as a display lead,
 * date and reading time, then the cover as the page's single priority image. Server Component.
 */
export function StoryHeader({ story, titleId }: StoryHeaderProps) {
  return (
    <header className="flex min-w-0 flex-col gap-8">
      <div className="flex max-w-4xl min-w-0 flex-col items-start gap-4">
        <Eyebrow>{story.eyebrow}</Eyebrow>
        <Heading level={1} size="page-intro" id={titleId}>
          {story.title}
        </Heading>
        <Text variant="lead">{story.dek}</Text>
        <StoryMeta publishedOn={story.publishedOn} readingMinutes={story.readingMinutes} />
      </div>
      {story.cover === null ? null : <MediaFrame media={story.cover} ratio="16:9" slot="banner" priority />}
    </header>
  )
}
