import 'server-only'
import { TAG } from '@/lib/data/public/tags'
import type { RevalidateEvent } from './payload.ts'

// (type, action) -> tags to expire (ARCH-001 9.4; ARCH-001-isr-revalidation section 6). The action does not change the
// tag set for any accepted type. No `revalidatePath` is used. Tag strings come from lib/data/public/tags.ts only.

/** Distinct tags to expire for a validated event. */
export function tagsToExpire(event: RevalidateEvent): string[] {
  switch (event.type) {
    case 'event':
      return unique([TAG.event(event.slug), TAG.events, TAG.pastEvents, TAG.site('home'), TAG.sitemap])
    case 'story':
      return unique([TAG.story(event.slug), TAG.stories, TAG.site('home'), TAG.sitemap])
    case 'testimonial':
      return unique([TAG.testimonials, TAG.site('home')])
    case 'site':
      return [TAG.site(event.section)]
    case 'legal':
      return unique([TAG.legal(event.page), TAG.sitemap])
    case 'media':
      return unique([
        TAG.events,
        TAG.stories,
        TAG.testimonials,
        TAG.site('home'),
        TAG.site('community'),
        TAG.site('nav'),
        TAG.site('footer'),
      ])
    case 'player':
    case 'result':
      // No player:{id} tag exists and tags cannot be wildcarded (ISR doc section 6 proposal): expire every list that can
      // show a result or a person. The backend also sends one event/updated call per affected event for `event:{slug}`.
      return unique([TAG.events, TAG.pastEvents, TAG.stories, TAG.testimonials, TAG.site('home'), TAG.sitemap])
  }
}

const unique = (tags: string[]): string[] => [...new Set(tags)]
