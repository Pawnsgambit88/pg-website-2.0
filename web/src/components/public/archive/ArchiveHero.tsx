import { Shell } from '@/components/layout/Shell'
import { Eyebrow } from '@/components/ui/Eyebrow'
import { Heading } from '@/components/ui/Heading'
import { Text } from '@/components/ui/Text'

interface ArchiveHeroProps {
  eyebrow: string
  title: string
  lead: string
}

/**
 * Past events page hero (screen 05, reference `.page-hero`): eyebrow, the page h1 and a display-font lead, closed by a
 * hairline. Server Component.
 */
export function ArchiveHero({ eyebrow, title, lead }: ArchiveHeroProps) {
  return (
    <header className="border-b border-line pt-16 pb-12 sm:pt-24 sm:pb-16">
      <Shell>
        <Eyebrow>{eyebrow}</Eyebrow>
        <Heading level={1} size="hero" className="mt-3 mb-4 max-w-3xl">
          {title}
        </Heading>
        <Text variant="lead">{lead}</Text>
      </Shell>
    </header>
  )
}
