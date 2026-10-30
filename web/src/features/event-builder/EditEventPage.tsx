'use client'

import { useQuery } from '@tanstack/react-query'
import { Button } from '@/components/ui/Button'
import { ErrorState } from '@/components/ui/feedback/ErrorState'
import { Skeleton } from '@/components/ui/feedback/Skeleton'
import { SkeletonRegion } from '@/components/ui/feedback/SkeletonRegion'
import { BuilderFrame } from '@/features/event-builder/BuilderFrame'
import { useApi } from '@/lib/api/adapters/useApi.browser'
import { adminEventQuery } from '@/lib/query/query-options/admin'

/**
 * /admin/events/[id]/edit (E03). Three states: loading skeleton, error with retry (EVENT_NOT_FOUND included) and the
 * builder. The builder seeds its own store once from the first successful read, so later cache updates (its own saves)
 * never reset the forms.
 */
export function EditEventPage({ eventId }: { eventId: string }) {
  const api = useApi().admin
  const query = useQuery({ ...adminEventQuery(api, eventId), refetchOnWindowFocus: false })

  if (query.data !== undefined) return <BuilderFrame key={query.data.id} draft={query.data} />

  if (query.isError) {
    return (
      <div className="flex min-w-0 flex-col gap-4 py-6">
        <ErrorState
          error={query.error}
          action="load this event"
          headingLevel={1}
          onRetry={() => void query.refetch()}
          retrying={query.isFetching}
        >
          <Button href="/admin/events" variant="secondary">
            Back to events
          </Button>
        </ErrorState>
      </div>
    )
  }

  return (
    <SkeletonRegion label="Loading the event builder" className="flex min-w-0 flex-col gap-4 py-6">
      <Skeleton shape="line" lines={2} />
      <Skeleton shape="block" className="h-12" />
      <Skeleton shape="card" />
    </SkeletonRegion>
  )
}
