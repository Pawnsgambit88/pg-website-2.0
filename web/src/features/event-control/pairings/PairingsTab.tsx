'use client'

import { useQuery } from '@tanstack/react-query'
import { QueryView } from '@/components/ui/feedback/QueryView'
import { Skeleton } from '@/components/ui/feedback/Skeleton'
import { RoundsView } from '@/features/event-control/pairings/RoundsView'
import type { ControlTabProps } from '@/features/event-control/tabs'
import { useApi } from '@/lib/api/adapters/useApi.browser'
import type { AdminRoundsDto } from '@/lib/api/types/admin/control-rounds'
import { adminRoundsQuery } from '@/lib/query/query-options/admin'

const RATING_POLL_MS = 5000

function ratingPending(data: AdminRoundsDto | undefined): boolean {
  return (
    data?.rounds.some((round) => round.state === 'completed' && round.ratingProcessing.status === 'pending') === true
  )
}

const placeholder = (
  <div className="flex flex-col gap-3">
    <Skeleton shape="card" className="h-20" />
    <Skeleton shape="card" className="h-16" />
    <Skeleton shape="card" className="h-16" />
  </div>
)

/** Control Room Pairings and rounds (FE-33, screen 49): round selector, draft, publish, start, results, finalise. */
export function PairingsTab({ eventId, overview }: ControlTabProps) {
  const admin = useApi().admin
  const query = useQuery({
    ...adminRoundsQuery(admin, eventId),
    refetchInterval: (q) => (ratingPending(q.state.data) ? RATING_POLL_MS : false),
  })
  return (
    <section aria-label="Pairings and rounds" className="flex min-w-0 flex-col gap-4">
      <QueryView
        query={query}
        loadingLabel="Loading the rounds"
        skeleton={placeholder}
        errorAction="load the rounds"
        headingLevel={2}
      >
        {(data) => (
          <RoundsView
            eventId={eventId}
            data={data}
            eventStatus={overview.status}
            mode={overview.pairing.mode}
            roundsPlanned={overview.pairing.roundsPlanned}
          />
        )}
      </QueryView>
    </section>
  )
}
