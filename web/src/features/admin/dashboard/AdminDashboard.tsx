'use client'

import { useQuery } from '@tanstack/react-query'
import type { Route } from 'next'
import { MetricTile } from '@/components/domain/MetricTile'
import { Button } from '@/components/ui/Button'
import { CreateDraftButton } from '@/features/admin/events/CreateDraftButton'
import { PageIntro } from '@/components/ui/PageIntro'
import type { StatusTone } from '@/components/ui/StatusBadge'
import { Surface } from '@/components/ui/Surface'
import { TextLink } from '@/components/ui/TextLink'
import { EmptyState } from '@/components/ui/feedback/EmptyState'
import { DashboardSkeleton } from '@/features/admin/dashboard/DashboardSkeleton'
import { NextEvent } from '@/features/admin/dashboard/NextEvent'
import { PageSection } from '@/components/ui/PageSection'
import { QueryView } from '@/components/ui/feedback/QueryView'
import { useApi } from '@/lib/api/adapters/useApi.browser'
import type { DashboardSummaryDto } from '@/lib/api/types/admin/dashboard'
import { formatEventDateTime } from '@/lib/format/date'

import { formatInr } from '@/lib/format/money'
import { adminDashboardQuery } from '@/lib/query/query-options/admin'

const HEALTH_LABEL: Readonly<Record<DashboardSummaryDto['websiteHealth']['state'], string>> = {
  ok: 'Healthy',
  degraded: 'Delayed',
  down: 'Failing',
}

const HEALTH_TONE: Readonly<Record<DashboardSummaryDto['websiteHealth']['state'], StatusTone>> = {
  ok: 'success',
  degraded: 'warning',
  down: 'danger',
}

/**
 * Admin dashboard (screen 32, FE-15, endpoint D01). One read feeds three sections, each with its own heading; the page
 * has three states (skeleton, ErrorState with retry, data). `event: null` is the explicit "no upcoming event" empty state.
 * Operational status and actionable alerts only: no vanity analytics.
 */
export function AdminDashboard() {
  const admin = useApi().admin
  const query = useQuery(adminDashboardQuery(admin))
  return (
    <div className="flex min-w-0 flex-col gap-10 py-6 sm:py-8">
      <PageIntro
        variant="admin"
        eyebrow="Operations"
        title="Dashboard"
        description="What needs your attention today, in the order it matters."
        actions={
          <CreateDraftButton size="lg">New event</CreateDraftButton>
        }
      />
      <QueryView
        query={query}
        loadingLabel="Loading the dashboard"
        skeleton={<DashboardSkeleton />}
        errorAction="load the dashboard"
        headingLevel={2}
      >
        {(data) => (
          <>
            <PageSection id="dash-event" eyebrow="Next up" title="Next or today's event">
              {data.event === null ? (
                <EmptyState
                  title="No upcoming event"
                  action={<CreateDraftButton>Create an event</CreateDraftButton>}
                >
                  Nothing is scheduled. Create an event to open registration.
                </EmptyState>
              ) : (
                <NextEvent event={data.event} />
              )}
            </PageSection>

            <PageSection
              id="dash-status"
              eyebrow="Status"
              title="Payments and website"
              action={<TextLink href="/admin/payments">Open payments</TextLink>}
            >
              <div className="grid min-w-0 gap-4 sm:grid-cols-2">
                <MetricTile
                  label="Pending payments"
                  value={formatInr(data.pendingPayments.amountPaise)}
                  hint={`${data.pendingPayments.count} registration${data.pendingPayments.count === 1 ? '' : 's'} waiting`}
                />
                <MetricTile
                  label="Website"
                  value={HEALTH_LABEL[data.websiteHealth.state]}
                  status={{
                    label: data.websiteHealth.state.toUpperCase(),
                    tone: HEALTH_TONE[data.websiteHealth.state],
                  }}
                  hint={
                    data.websiteHealth.lastPublishedAt === null
                      ? `Nothing published yet. ${data.websiteHealth.pendingRevalidations} updates queued.`
                      : `Last published ${formatEventDateTime(data.websiteHealth.lastPublishedAt)}. ${data.websiteHealth.pendingRevalidations} updates queued.`
                  }
                />
              </div>
            </PageSection>

            <PageSection id="dash-attention" eyebrow="Attention" title="Needs a look">
              {data.attention.length === 0 ? (
                <EmptyState title="All clear">Nothing needs attention right now.</EmptyState>
              ) : (
                <ul className="flex min-w-0 flex-col gap-3">
                  {data.attention.map((item) => (
                    <li key={item.kind}>
                      <Surface
                        as="div"
                        tone="admin"
                        className="flex min-w-0 flex-col gap-2 sm:flex-row sm:items-center sm:justify-between"
                      >
                        <p className="min-w-0 wrap-break-word">{item.message}</p>
                        <TextLink href={item.href as Route}>Review</TextLink>
                      </Surface>
                    </li>
                  ))}
                </ul>
              )}
            </PageSection>
          </>
        )}
      </QueryView>
    </div>
  )
}
