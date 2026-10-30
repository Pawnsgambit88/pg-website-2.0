import { Shell } from '@/components/layout/Shell'
import { Eyebrow } from '@/components/ui/Eyebrow'
import { Heading } from '@/components/ui/Heading'
import { Text } from '@/components/ui/Text'

interface StoriesHeroProps {
  eyebrow: string
  title: string
  lead: string
}

/** Stories page hero (screen 07, reference `.page-hero`): eyebrow, h1, display lead and a closing hairline. */
export function StoriesHero({ eyebrow, title, lead }: StoriesHeroProps) {
  return (
    <header className="border-b border-line pt-16 pb-12 sm:pt-24 sm:pb-16">
      <Shell>
        <Eyebrow>{eyebrow}</Eyebrow>
        <Heading level={1} size="hero" className="mt-3 mb-4 max-w-4xl">
          {title}
        </Heading>
        <Text variant="lead">{lead}</Text>
      </Shell>
    </header>
  )
}
