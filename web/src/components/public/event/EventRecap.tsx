import { Eyebrow } from '@/components/ui/Eyebrow'
import { Heading } from '@/components/ui/Heading'
import { Text } from '@/components/ui/Text'
import { paragraphs } from './eventText'

interface EventRecapProps {
  recap: string | null
  /** Used when there is no published recap: the event description stays readable. */
  fallback: string
}

const TITLE_ID = 'event-recap-title'

/** Recap of a completed event (plain text, paragraphs on blank lines). Nothing renders when both are empty. */
export function EventRecap({ recap, fallback }: EventRecapProps) {
  const body = paragraphs(recap)
  const text = body.length > 0 ? body : paragraphs(fallback)
  if (text.length === 0) return null
  return (
    <section aria-labelledby={TITLE_ID} className="min-w-0">
      <Eyebrow>{body.length > 0 ? 'Recap' : 'About this game'}</Eyebrow>
      <Heading level={2} size="section" id={TITLE_ID} className="mt-3 mb-6 max-w-2xl">
        How it went
      </Heading>
      {text.map((paragraph, index) => (
        <Text key={index} className="mt-3 max-w-prose text-ink-soft">
          {paragraph}
        </Text>
      ))}
    </section>
  )
}
