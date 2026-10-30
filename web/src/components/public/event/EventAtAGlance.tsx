import { Surface } from '@/components/ui/Surface'
import type { EventDetailDto } from '@/lib/api/types/event'
import { NO_VALUE } from '@/lib/format/placeholder'
import { hasText } from './eventText'

interface EventAtAGlanceProps {
  atAGlance: EventDetailDto['atAGlance']
  rating: EventDetailDto['rating']
  firstTimerCount: number
}

const TITLE_ID = 'event-glance-title'
const POOL_LABEL = { blitz: 'Blitz', rapid: 'Rapid', classical: 'Classical' } as const

/**
 * "At a glance" card (reference `.info-card`): forest panel, editorial h3, label and value pairs separated by light
 * hairlines. Server Component.
 */
export function EventAtAGlance({ atAGlance, rating, firstTimerCount }: EventAtAGlanceProps) {
  const rows: [string, string][] = [
    ['Format', hasText(atAGlance.format) ? atAGlance.format : NO_VALUE],
    ['Time control', hasText(atAGlance.timeControl) ? atAGlance.timeControl : NO_VALUE],
    ['First-timers', firstTimerCount === 0 ? 'You could be the first' : `${firstTimerCount} already joining`],
    ['Membership', atAGlance.membershipRequired ? 'Required' : 'Not required'],
    ['Arrival', atAGlance.hostedArrival ? 'Hosted: someone meets you' : 'Walk in when you are ready'],
    ['Rating', rating.rated ? `Rated, PG ${POOL_LABEL[rating.pool]}` : 'Unrated'],
  ]
  return (
    <Surface as="section" tone="forest" padding="lg" aria-labelledby={TITLE_ID}>
      <h3 id={TITLE_ID} className="font-display text-3xl leading-none font-medium tracking-tight">
        At a glance
      </h3>
      <dl className="mt-4">
        {rows.map(([label, value]) => (
          <div key={label} className="border-t border-line-light py-4">
            <dt className="type-eyebrow text-copper-soft">{label}</dt>
            <dd className="mt-1 wrap-break-word">{value}</dd>
          </div>
        ))}
      </dl>
    </Surface>
  )
}
