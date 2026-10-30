import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { Section } from '@/components/layout/Section'
import { StoryBody } from '@/components/public/stories/StoryBody'
import { StoryHeader } from '@/components/public/stories/StoryHeader'
import { storyArticleJsonLd } from '@/components/public/stories/storyJsonLd'
import { storyHref } from '@/components/public/stories/storyLabels'
import { TextLink } from '@/components/ui/TextLink'
import { ArrowRight } from '@/components/ui/icons/ArrowRight'
import { MAX_PAGE_SIZE } from '@/lib/api/types/pagination'
import { getStories } from '@/lib/data/public/stories'
import { getStoryBySlug } from '@/lib/data/public/story-by-slug'
import { isValidSlug } from '@/lib/routes/params'
import { breadcrumbJsonLd } from '@/lib/seo/breadcrumb-json-ld'
import { metaDescription } from '@/lib/seo/description'
import { JsonLd } from '@/lib/seo/JsonLd'
import { buildMetadata } from '@/lib/seo/metadata'

// Story detail (TASK-118, ARCH-001 7.1): ISR. All published stories (capped at 100) prerender at build; others render on
// demand and enter the cache. M13: the slug is validated and notFound() called before any fetch or tag. Unknown, draft
// and unpublished slugs (adapter null) are a real 404. Tags `stories`, `story:{slug}` come from the fetcher.
export const revalidate = 900
export const dynamicParams = true

const MAX_STATIC_STORIES = 100
const TITLE_ID = 'story-title'

interface StoryPageProps {
  params: Promise<{ slug: string }>
}

export async function generateStaticParams(): Promise<{ slug: string }[]> {
  const keep = (slug: string) => isValidSlug(slug)
  try {
    const page = await getStories(1, MAX_PAGE_SIZE)
    return page.items
      .map((story) => story.slug)
      .filter(keep)
      .slice(0, MAX_STATIC_STORIES)
      .map((slug) => ({ slug }))
  } catch {
    // ARCH-001 7.6: a backend outage must not block a deploy; every story then renders on first hit.
    return []
  }
}

export async function generateMetadata({ params }: StoryPageProps): Promise<Metadata> {
  const { slug } = await params
  if (!isValidSlug(slug)) notFound()
  const story = await getStoryBySlug(slug)
  if (story === null) notFound()
  const image = story.cover
  return buildMetadata({
    title: story.title,
    description: metaDescription([story.dek]),
    path: storyHref(story.slug),
    image: image === null ? null : { src: image.src, width: image.width, height: image.height, alt: image.alt },
    type: 'article',
    article: { publishedTime: story.publishedOn, modifiedTime: story.updatedAt },
  })
}

export default async function StoryPage({ params }: StoryPageProps) {
  const { slug } = await params
  if (!isValidSlug(slug)) notFound()
  // Shares the React.cache entry with generateMetadata: one upstream request.
  const story = await getStoryBySlug(slug)
  if (story === null) notFound()
  const path = storyHref(story.slug)

  return (
    <>
      <Section as="div" space="flush">
        <article aria-labelledby={TITLE_ID} className="flex min-w-0 flex-col gap-10 sm:gap-12">
          <StoryHeader story={story} titleId={TITLE_ID} />
          <StoryBody blocks={story.body} />
          <p className="border-t border-line pt-6">
            <TextLink href="/stories" icon={<ArrowRight size="sm" className="self-center" />}>
              All stories
            </TextLink>
          </p>
        </article>
      </Section>
      <JsonLd
        data={[
          storyArticleJsonLd(story, path),
          breadcrumbJsonLd([
            { name: 'Stories', path: '/stories' },
            { name: story.title, path },
          ]),
        ]}
      />
    </>
  )
}
