import { Eyebrow } from '@/components/ui/Eyebrow'
import { Heading } from '@/components/ui/Heading'
import { Text } from '@/components/ui/Text'
import type { EventDetailDto } from '@/lib/api/types/event'
import { hasText, paragraphs } from './eventText'

interface EventExperienceProps {
  id: string
  experience: EventDetailDto['experience']
  /** Event description, shown after the experience body when present. */
  description: string
}

const TITLE_ID = 'event-experience-title'

/**
 * "The experience" (reference `.detail-grid article` and `.plain-list`): eyebrow, h2, body and the first-timer
 * expectations as a hairline list (bold lead-in, then the sentence). Server Component; full copy in the raw HTML.
 */
export function EventExperience({ id, experience, description }: EventExperienceProps) {
  const body = paragraphs(experience.body)
  const more = paragraphs(description)
  return (
    <section id={id} aria-labelledby={TITLE_ID} className="min-w-0">
      {hasText(experience.eyebrow) ? <Eyebrow>{experience.eyebrow}</Eyebrow> : null}
      <Heading level={2} size="section" id={TITLE_ID} className="mt-3 mb-6 max-w-2xl">
        {hasText(experience.heading) ? experience.heading : 'What to expect'}
      </Heading>
      {[...body, ...more].map((paragraph, index) => (
        <Text key={index} className="mt-3 max-w-prose text-ink-soft">
          {paragraph}
        </Text>
      ))}
      {experience.highlights.length === 0 ? null : (
        <ul className="mt-8 max-w-2xl border-t border-line">
          {experience.highlights.map((item, index) => (
            <li key={`${index}-${item.title}`} className="border-b border-line py-4 wrap-break-word">
              <strong className="font-strong text-ink">{item.title}</strong>{' '}
              <span className="text-ink-soft">{item.body}</span>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
