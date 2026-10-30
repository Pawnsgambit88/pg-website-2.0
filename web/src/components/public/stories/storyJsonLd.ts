import type { StoryDetailDto } from '@/lib/api/types/story'
import { toIstIsoString } from '@/lib/seo/ist-datetime'
import { organizationRef } from '@/lib/seo/organization-json-ld'
import type { JsonLdObject } from '@/lib/seo/serialize-json-ld'
import { absoluteUrl, canonicalUrl } from '@/lib/seo/site'

// schema.org Article for /stories/[slug] (TASK-118, AC-28a). Lives here because lib/seo is outside this task's
// ownership; move to lib/seo/article-json-ld.ts when convenient. Missing fields are omitted, never emitted empty.
// Render only through <JsonLd data={...} />, which escapes the payload.

/** The calendar `publishedOn` read as IST midnight, with the +05:30 offset. */
function publishedInstant(isoDate: string): string | null {
  return toIstIsoString(`${isoDate}T00:00:00+05:30`)
}

export function storyArticleJsonLd(story: StoryDetailDto, path: string): JsonLdObject {
  const image = story.cover === null ? null : absoluteUrl(story.cover.src)
  const published = publishedInstant(story.publishedOn)
  const modified = toIstIsoString(story.updatedAt)
  const url = canonicalUrl(path)
  return {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: story.title,
    description: story.dek,
    url,
    mainEntityOfPage: { '@type': 'WebPage', '@id': url },
    inLanguage: 'en-IN',
    ...(image === null ? {} : { image: [image] }),
    ...(published === null ? {} : { datePublished: published }),
    ...(modified === null ? {} : { dateModified: modified }),
    author: organizationRef(),
    publisher: organizationRef(),
  }
}
