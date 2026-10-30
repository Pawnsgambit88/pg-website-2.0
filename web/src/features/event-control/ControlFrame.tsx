'use client'

import { useQuery } from '@tanstack/react-query'
import type { Route } from 'next'
import { PageIntro } from '@/components/ui/PageIntro'
import { Button } from '@/components/ui/Button'
import { StatusBadge, type StatusTone } from '@/components/ui/StatusBadge'
import { TextLink } from '@/components/ui/TextLink'
import { RouteTabs } from '@/components/ui/nav/RouteTabs'
import { LifecycleActions } from '@/features/event-control/LifecycleActions'
import { PublishBlockers } from '@/features/event-control/PublishBlockers'
import { ControlSkeleton } from '@/features/event-control/ControlSkeleton'
import { QueryView } from '@/components/ui/feedback/QueryView'
import { SummaryStrip } from '@/features/event-control/SummaryStrip'
import { CONTROL_TABS, CONTROL_TAB_LABEL } from '@/features/event-control/tabs'
import { useApi } from '@/lib/api/adapters/useApi.browser'
import type { EventStatus } from '@/lib/api/types/event-state'
import { formatEventDateTime } from '@/lib/format/date'
import { adminOverviewQuery } from '@/lib/query/query-options/admin'
import { ADMIN_EVENT_TABS, type AdminEventTab } from '@/lib/routes/routes'

/** Statuses where the event builder still accepts changes (mirrors backend EDITABLE_STATUSES). */
const EDITABLE_STATUSES = new Set<EventStatus>(['draft', 'published', 'registration_open', 'sold_out'])

const STATUS_LABEL: Readonly<Record<EventStatus, string>> = {
  draft: 'Draft',
  published: 'Announced',
  registration_open: 'Registration open',
  sold_out: 'Sold out',
  ongoing: 'Live now',
  completed: 'Completed',
  cancelled: 'Cancelled',
}

const STATUS_TONE: Readonly<Record<EventStatus, StatusTone>> = {
  draft: 'neutral',
  published: 'neutral',
  registration_open: 'success',
  sold_out: 'warning',
  ongoing: 'copper',
  completed: 'neutral',
  cancelled: 'danger',
}

/**
 * Event Control Room frame (FE-30, screens 46 to 53 shell). One shared overview query (C01) feeds the header, status
 * and summary strip on every tab; tab switches reuse the cache, so the event is not refetched. The active tab body comes
 * from the `CONTROL_TABS` registry. Unknown or forbidden events show the error-copy ErrorState, never raw server text.
 */
export function ControlFrame({ eventId, tab }: { eventId: string; tab: AdminEventTab }) {
  const admin = useApi().admin
  const query = useQuery(adminOverviewQuery(admin, eventId))
  const base = `/admin/events/${encodeURIComponent(eventId)}`
  const items = ADMIN_EVENT_TABS.map((key) => ({
    href: `${base}/${key}` as Route,
    label: CONTROL_TAB_LABEL[key],
    exact: true,
  }))
  const TabBody = CONTROL_TABS[tab]

  return (
    <div className="flex min-w-0 flex-col gap-6 py-6 sm:py-8">
      <TextLink href="/admin/events">All events</TextLink>
      <QueryView
        query={query}
        loadingLabel="Loading the event"
        skeleton={<ControlSkeleton />}
        errorAction="load this event"
        headingLevel={2}
      >
        {(overview) => (
          <>
            <PageIntro
              variant="admin"
              eyebrow="Control Room"
              title={overview.title}
              description={
                <span className="inline-flex flex-wrap items-center gap-x-3 gap-y-2">
                  <StatusBadge tone={STATUS_TONE[overview.status]}>{STATUS_LABEL[overview.status]}</StatusBadge>
                  <span>{formatEventDateTime(overview.startsAt)}</span>
                </span>
              }
              actions={
                <div className="flex flex-wrap gap-3">
                  {EDITABLE_STATUSES.has(overview.status) ? (
                    <Button href={`${base}/edit` as Route} variant="secondary">
                      Edit event
                    </Button>
                  ) : null}
                  <LifecycleActions overview={overview} />
                </div>
              }
            />
            {overview.status === 'draft' ? <PublishBlockers overview={overview} /> : null}
            <SummaryStrip summary={overview.summary} />
            <RouteTabs items={items} label="Event sections" surface="admin" />
            <section aria-label={CONTROL_TAB_LABEL[tab]} className="min-w-0">
              <TabBody eventId={eventId} overview={overview} />
            </section>
          </>
        )}
      </QueryView>
    </div>
  )
}
