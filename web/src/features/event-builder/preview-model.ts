import { overlayStep } from '@/features/event-builder/patch'
import type { PendingPatch } from '@/features/event-builder/types'
import type { BuilderDraftDto } from '@/lib/api/types/admin/event-builder'
import type { EventSummaryDto } from '@/lib/api/types/event'

// Draft (server resource + unsent edits) to the public card DTO, so the preview renders the REAL public EventCard
// (TASK-077 AC-4: imported, not copied). Incomplete drafts get neutral placeholders; nothing here is sent anywhere.

const NOT_SET = ''

export function toPreviewSummary(server: BuilderDraftDto, pending: PendingPatch): EventSummaryDto {
  const basics = overlayStep('basics', server.basics, pending.basics)
  const payment = overlayStep('payment', server.payment, pending.payment)
  const game = overlayStep('gameSystem', server.gameSystem, pending.gameSystem)
  const title = basics.title.trim()
  return {
    slug: (basics.slug.value ?? 'preview') as EventSummaryDto['slug'],
    title: title === '' ? 'Untitled event' : title,
    promise: basics.promise,
    type: basics.type,
    audience: basics.audience,
    status: 'published',
    // The card formatters render an unset instant as the no-value dash.
    startsAt: (basics.startsAt ?? NOT_SET) as EventSummaryDto['startsAt'],
    endsAt: (basics.endsAt ?? NOT_SET) as EventSummaryDto['endsAt'],
    area: basics.area,
    city: basics.city,
    format: NOT_SET,
    price: { pricePaise: payment.pricePaise, currency: 'INR' },
    rated: game.rated,
    firstTimerCount: 0,
    placesLeftHint: null,
    cover: null,
    archivePublished: false,
    version: server.version,
  }
}
