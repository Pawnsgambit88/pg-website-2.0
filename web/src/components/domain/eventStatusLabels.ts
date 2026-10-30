import type { StatusTone } from '@/components/ui/StatusBadge'
import type { EventStatus } from '@/lib/api/types/event-state'

/** Admin-facing label and badge tone of an event status (event list, event builder). */
export const EVENT_STATUS_LABEL: Readonly<Record<EventStatus, string>> = {
  draft: 'Draft',
  published: 'Announced',
  registration_open: 'Registration open',
  sold_out: 'Sold out',
  ongoing: 'Live now',
  completed: 'Completed',
  cancelled: 'Cancelled',
}

export const EVENT_STATUS_TONE: Readonly<Record<EventStatus, StatusTone>> = {
  draft: 'neutral',
  published: 'neutral',
  registration_open: 'success',
  sold_out: 'warning',
  ongoing: 'copper',
  completed: 'neutral',
  cancelled: 'danger',
}
