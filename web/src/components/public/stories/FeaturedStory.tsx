import type { Route } from 'next'
import { StoryMeta } from '@/components/public/stories/StoryMeta'
import { storyHref, storyKindLabel } from '@/components/public/stories/storyLabels'
import { Button } from '@/components/ui/Button'
import { Eyebrow } from '@/components/ui/Eyebrow'
import { Heading } from '@/components/ui/Heading'
import { Text } from '@/components/ui/Text'
import { ArrowRight } from '@/components/ui/icons/ArrowRight'
import { MediaFrame } from '@/components/ui/media/MediaFrame'
import type { StoryCardDto } from '@/lib/api/types/story'

interface FeaturedStoryProps {
  story: StoryCardDto
}

const TITLE_ID = 'featured-story-title'

/**
 * The lead story of the Stories page: half-width photo beside the copy, stacking below 960px. Its photo is the page's
 * single `priority` image (LCP candidate). Server Component.
 */
export function FeaturedStory({ story }: FeaturedStoryProps) {
  return (
    <article aria-labelledby={TITLE_ID} className="grid grid-cols-1 items-end gap-8 md:grid-cols-2 md:gap-16">
      <MediaFrame media={story.cover} ratio="3:2" slot="split" priority />
      <div className="flex min-w-0 flex-col items-start gap-4">
        <Eyebrow>Featured · {storyKindLabel(story.kind)}</Eyebrow>
        <Heading level={2} size="section" id={TITLE_ID}>
          {story.title}
        </Heading>
        <Text variant="lead">{story.dek}</Text>
        <StoryMeta publishedOn={story.publishedOn} readingMinutes={story.readingMinutes} />
        <Button
          href={storyHref(story.slug) as Route}
          variant="secondary"
          icon={<ArrowRight size="sm" />}
          iconPosition="end"
          aria-label={`Read story: ${story.title}`}
          className="mt-2"
        >
          Read story
        </Button>
      </div>
    </article>
  )
}
