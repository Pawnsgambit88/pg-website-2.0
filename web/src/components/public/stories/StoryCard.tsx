import type { Route } from 'next'
import { StoryMeta } from '@/components/public/stories/StoryMeta'
import { storyHref, storyKindLabel } from '@/components/public/stories/storyLabels'
import { ActionLink } from '@/components/ui/ActionLink'
import { Eyebrow } from '@/components/ui/Eyebrow'
import { Heading } from '@/components/ui/Heading'
import { Text } from '@/components/ui/Text'
import { VisuallyHidden } from '@/components/ui/VisuallyHidden'
import { ArrowRight } from '@/components/ui/icons/ArrowRight'
import { MediaFrame } from '@/components/ui/media/MediaFrame'
import type { StoryCardDto } from '@/lib/api/types/story'

interface StoryCardProps {
  story: StoryCardDto
}

/**
 * Grid story (reference screen 07 `.three-col article`): photo, kind eyebrow, title, dek and "Read story". The link is
 * the only tab stop and its ::after makes the whole card clickable. Images are lazy (never `priority`). Server Component.
 */
export function StoryCard({ story }: StoryCardProps) {
  const titleId = `story-card-${story.slug}`
  return (
    <article aria-labelledby={titleId} className="group relative flex h-full min-w-0 flex-col">
      <MediaFrame media={story.cover} ratio="4:3" slot="card" />
      <Eyebrow className="mt-4">{storyKindLabel(story.kind)}</Eyebrow>
      <Heading level={3} size="panel" id={titleId} className="mt-2">
        {story.title}
      </Heading>
      <Text className="mt-3">{story.dek}</Text>
      <StoryMeta publishedOn={story.publishedOn} readingMinutes={story.readingMinutes} className="mt-3" />
      <div className="mt-auto pt-4">
        <ActionLink
          href={storyHref(story.slug) as Route}
          className="tap inline-flex max-w-full items-center gap-1 text-sm wrap-break-word text-copper-dark underline decoration-1 underline-offset-4 group-hover:decoration-2 after:absolute after:inset-0"
        >
          Read story
          <VisuallyHidden>: {story.title}</VisuallyHidden>
          <ArrowRight size="sm" />
        </ActionLink>
      </div>
    </article>
  )
}
