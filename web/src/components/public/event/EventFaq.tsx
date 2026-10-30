import { Eyebrow } from '@/components/ui/Eyebrow'
import { Heading } from '@/components/ui/Heading'
import { ChevronDown } from '@/components/ui/icons/ChevronDown'
import type { EventDetailDto } from '@/lib/api/types/event'
import { paragraphs } from './eventText'

interface EventFaqProps {
  faq: EventDetailDto['faq']
}

const TITLE_ID = 'event-faq-title'

/**
 * Event FAQ: native `<details>`/`<summary>` disclosure (keyboard and screen-reader support with no client JS; answers
 * are in the raw HTML). Each summary is at least 48px tall. Renders nothing when the host added no questions.
 * Server Component.
 */
export function EventFaq({ faq }: EventFaqProps) {
  if (faq.length === 0) return null
  return (
    <section aria-labelledby={TITLE_ID} className="min-w-0">
      <Eyebrow>Questions</Eyebrow>
      <Heading level={2} size="section" id={TITLE_ID} className="mt-3 mb-6 max-w-2xl">
        Good to know
      </Heading>
      <div className="max-w-3xl border-t border-line">
        {faq.map((item, index) => (
          <details key={`${index}-${item.question}`} className="group border-b border-line">
            <summary className="flex min-h-control cursor-pointer list-none items-center justify-between gap-4 py-3 font-strong wrap-break-word">
              <span className="min-w-0">{item.question}</span>
              <ChevronDown className="shrink-0 text-copper-dark group-open:rotate-180 motion-safe:transition-transform" />
            </summary>
            <div className="pb-4">
              {paragraphs(item.answer).map((paragraph, i) => (
                <p key={i} className="mt-2 max-w-prose wrap-break-word text-ink-soft first:mt-0">
                  {paragraph}
                </p>
              ))}
            </div>
          </details>
        ))}
      </div>
    </section>
  )
}
