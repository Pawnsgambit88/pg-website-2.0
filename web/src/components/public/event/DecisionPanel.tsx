import { Button } from '@/components/ui/Button'
import { ArrowRight } from '@/components/ui/icons/ArrowRight'
import type { EventCardDto } from '@/lib/api/types/event'
import { cn } from '@/lib/cn'
import { AvailabilitySlot } from './AvailabilitySlot'
import { NextEventLink } from './NextEventLink'
import { PanelRow } from './PanelRow'
import { ACTION_LABEL, type EventDecision } from './eventDecision'
import { registerPath } from './eventText'

interface DecisionPanelProps {
  slug: string
  title: string
  priceText: string
  dateText: string
  timeText: string
  placeText: string
  firstTimerCount: number
  placesLeftHint: number | null
  decision: EventDecision
  /** Next relevant game, offered when this one cannot be joined. */
  next: EventCardDto | null
  className?: string
}

const PANEL_TITLE_ID = 'event-decision-title'
const REASON_ID = 'event-decision-reason'

/**
 * Decision panel (reference `.event-sidecard`, screen 03): price, when, where, first-timers, the reserved availability
 * block and the one action. Sticky beside the editorial column from 960px; on phones it sits directly under the hero
 * summary (the page puts it first in the DOM). The action is the copper "Save my board" link to the registration route
 * when registration is open, "Join the waitlist" when full with a waitlist, and no action at all where the visitor
 * cannot register: a calm explanation and the next game instead (never a disabled register button). Server Component.
 */
export function DecisionPanel({
  slug,
  title,
  priceText,
  dateText,
  timeText,
  placeText,
  firstTimerCount,
  placesLeftHint,
  decision,
  next,
  className,
}: DecisionPanelProps) {
  const firstTimers =
    firstTimerCount === 0
      ? 'You could be the first'
      : `${firstTimerCount} already joining`
  return (
    <aside
      aria-labelledby={PANEL_TITLE_ID}
      className={cn(
        'min-w-0 border border-line bg-parchment-soft p-6 shadow-brand sm:p-8 md:sticky md:top-24',
        className,
      )}
    >
      <h2 id={PANEL_TITLE_ID} className="sr-only">
        Join {title}
      </h2>
      <div className="flex items-end justify-between gap-4 border-b border-line pb-4">
        <span className="type-eyebrow text-muted">Price</span>
        <strong className="font-display text-4xl leading-none font-medium wrap-break-word">{priceText}</strong>
      </div>
      <dl className="grid">
        <PanelRow label="When">
          {dateText}
          <span className="block text-sm font-normal text-muted">{timeText}</span>
        </PanelRow>
        <PanelRow label="Where">{placeText}</PanelRow>
        <PanelRow label="First-timers">{firstTimers}</PanelRow>
      </dl>
      <div className="border-b border-line py-3">
        <AvailabilitySlot slug={slug} placesLeftHint={placesLeftHint} live={decision.kind !== 'live'} />
      </div>

      {decision.title === null ? null : (
        <div id={REASON_ID} className="mt-4">
          <p className="font-strong wrap-break-word">{decision.title}</p>
          {decision.body === null ? null : <p className="mt-1 text-sm wrap-break-word text-muted">{decision.body}</p>}
        </div>
      )}

      {decision.action === null ? null : (
        <Button
          href={registerPath(slug)}
          variant={decision.action === 'register' ? 'copper' : 'secondary'}
          size="lg"
          fullWidth
          icon={<ArrowRight size="sm" />}
          iconPosition="end"
          className="mt-4"
          aria-describedby={decision.title === null ? undefined : REASON_ID}
        >
          {ACTION_LABEL[decision.action]}
        </Button>
      )}

      {decision.offerNext ? <NextEventLink next={next} className="mt-4" /> : null}
    </aside>
  )
}
