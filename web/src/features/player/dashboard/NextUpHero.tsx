'use client'

import { useQuery } from '@tanstack/react-query'
import { Button } from '@/components/ui/Button'
import { EmptyState } from '@/components/ui/feedback/EmptyState'
import { Board } from '@/components/ui/icons/Board'
import { useApi } from '@/lib/api/adapters/useApi.browser'
import { nextUpQuery } from '@/lib/query/query-options/player'
import { NextUpCard } from '@/features/player/dashboard/NextUpCard'
import { NextUpSkeleton } from '@/features/player/dashboard/NextUpSkeleton'
import { QueryView } from '@/components/ui/feedback/QueryView'

/** Hero of the dashboard (M01): the one thing to do next, with place, time, instruction and pairing when published. */
export function NextUpHero() {
  const api = useApi()
  const query = useQuery(nextUpQuery(api))
  return (
    <QueryView
      query={query}
      loadingLabel="Loading your next game"
      skeleton={<NextUpSkeleton />}
      errorAction="load your next game"
      headingLevel={2}
    >
      {(nextUp) =>
        nextUp === null ? (
          <EmptyState
            headingLevel={2}
            icon={<Board size="lg" />}
            title="No game booked yet"
            action={
              <Button href="/play" size="lg">
                Find a game
              </Button>
            }
          >
            When you register for an event, your venue, time and what to do next appear here first.
          </EmptyState>
        ) : (
          <NextUpCard nextUp={nextUp} />
        )
      }
    </QueryView>
  )
}
