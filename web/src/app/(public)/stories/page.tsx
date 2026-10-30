import type { Metadata } from 'next'
import { Section } from '@/components/layout/Section'
import { FeaturedStory } from '@/components/public/stories/FeaturedStory'
import { StoriesHero } from '@/components/public/stories/StoriesHero'
import { StoryCard } from '@/components/public/stories/StoryCard'
import { Button } from '@/components/ui/Button'
import { EmptyState } from '@/components/ui/feedback/EmptyState'
import { Heading } from '@/components/ui/Heading'
import { MAX_PAGE_SIZE } from '@/lib/api/types/pagination'
import { getStories } from '@/lib/data/public/stories'
import { buildMetadata } from '@/lib/seo/metadata'

// Stories (screen 07, TASK-047). Static, prerendered; 900 s matches the public ISR window (ARCH-001 7.3) and the
// `stories` tag revalidates on demand. Cards only (no bodies), so nothing here renders CMS markup. A failed read throws
// to the route error boundary; an empty list is a real empty state.
export const revalidate = 900

const PATH = '/stories'
const EYEBROW = 'Stories'
const TITLE = 'The people, games and rivalries that make a club.'
const LEAD = 'Not content for content’s sake. The living memory of PG.'
const GRID_TITLE_ID = 'stories-grid-title'

export const metadata: Metadata = buildMetadata({ title: 'Stories', description: LEAD, path: PATH })

export default async function StoriesPage() {
  const page = await getStories(1, MAX_PAGE_SIZE)
  // Chronological, newest first. ISO calendar dates (YYYY-MM-DD) sort correctly as strings.
  const stories = page.items.toSorted((a, b) => b.publishedOn.localeCompare(a.publishedOn))
  const featured = stories.find((story) => story.featured)
  const rest = featured === undefined ? stories : stories.filter((story) => story.slug !== featured.slug)

  return (
    <>
      <StoriesHero eyebrow={EYEBROW} title={TITLE} lead={LEAD} />
      {stories.length === 0 ? (
        <Section space="compact" as="div">
          <EmptyState
            title="No stories yet"
            headingLevel={2}
            action={
              <Button href="/past-events" variant="secondary">
                See past events
              </Button>
            }
          >
            The first club notes, event recaps and rivalries are being written. Results and photos are already in the
            archive.
          </EmptyState>
        </Section>
      ) : (
        <>
          {featured === undefined ? null : (
            <Section space="compact" as="div" className="border-b border-line">
              <FeaturedStory story={featured} />
            </Section>
          )}
          {rest.length === 0 ? null : (
            <Section space="compact" aria-labelledby={GRID_TITLE_ID}>
              <Heading level={2} size="panel" id={GRID_TITLE_ID} className="mb-8">
                {featured === undefined ? 'All stories' : 'More stories'}
              </Heading>
              <ul className="grid grid-cols-1 gap-x-6 gap-y-12 *:min-w-0 sm:grid-cols-2 md:grid-cols-3">
                {rest.map((story) => (
                  <li key={story.slug} className="cv-auto">
                    <StoryCard story={story} />
                  </li>
                ))}
              </ul>
            </Section>
          )}
        </>
      )}
    </>
  )
}
