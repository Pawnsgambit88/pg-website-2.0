import { Section } from '@/components/layout/Section'
import { Heading } from '@/components/ui/Heading'
import { Text } from '@/components/ui/Text'
import type { SiteSectionOf } from '@/lib/api/types/site-content'

interface CommunityPrinciplesProps {
  principles: SiteSectionOf<'community'>['content']['principles']
}

const TITLE_ID = 'community-principles-title'

/**
 * "What we protect" (reference `.belief-grid--3 --large`): the CMS principles (1 to 6) as an editorial list divided by
 * hairlines, never a wall of rounded cards. One column below 960px with a rule under each item; three columns from
 * `md` with vertical rules between them, and a top rule on a second row (4 to 6 items). The section label is the h2
 * (styled as the mono eyebrow) so the principle titles stay h3 under it. Server Component.
 */
export function CommunityPrinciples({ principles }: CommunityPrinciplesProps) {
  return (
    <Section aria-labelledby={TITLE_ID}>
      <h2 id={TITLE_ID} className="type-eyebrow text-copper-dark">
        What we protect
      </h2>
      <ul className="mt-6 grid grid-cols-1 border-t border-line md:grid-cols-3">
        {principles.map((principle) => (
          <li
            key={principle.title}
            className="flex min-w-0 flex-col gap-3 border-b border-line py-8 md:border-r md:border-b-0 md:px-6 md:pb-10 md:last:border-r-0 md:nth-[3n]:border-r-0 md:nth-[3n+1]:pl-0 md:nth-[n+4]:border-t"
          >
            <Heading level={3}>{principle.title}</Heading>
            <Text className="max-w-xs">{principle.body}</Text>
          </li>
        ))}
      </ul>
    </Section>
  )
}
