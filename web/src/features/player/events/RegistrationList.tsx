'use client'

import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { useState } from 'react'
import { Button } from '@/components/ui/Button'
import { EmptyState } from '@/components/ui/feedback/EmptyState'
import { Skeleton } from '@/components/ui/feedback/Skeleton'
import { Board } from '@/components/ui/icons/Board'
import { TablePagination } from '@/components/ui/table/TablePagination'
import { useApi } from '@/lib/api/adapters/useApi.browser'
import type { MyRegistrationDto } from '@/lib/api/types/my-events'
import { myEventsQuery } from '@/lib/query/query-options/player'
import { QueryView } from '@/components/ui/feedback/QueryView'
import { RegistrationRow } from '@/features/player/events/RegistrationRow'

const PAGE_SIZE = 10

interface RegistrationListProps {
  scope: 'upcoming' | 'history'
  onCancel?: (row: MyRegistrationDto) => void
}

/** One scope of M04 with its own query, states and pagination. Mounted only while its tab is selected. */
export function RegistrationList({ scope, onCancel }: RegistrationListProps) {
  const api = useApi()
  const [page, setPage] = useState(1)
  const query = useQuery({
    ...myEventsQuery(api, { scope, page, pageSize: PAGE_SIZE }),
    placeholderData: keepPreviousData, // keep the old page on screen while the next one loads
  })
  const history = scope === 'history'
  return (
    <QueryView
      query={query}
      loadingLabel={history ? 'Loading your event history' : 'Loading your upcoming events'}
      skeleton={
        <div className="flex flex-col gap-4">
          <Skeleton shape="card" />
          <Skeleton shape="card" />
        </div>
      }
      errorAction={history ? 'load your event history' : 'load your events'}
    >
      {(data) =>
        data.items.length === 0 ? (
          history ? (
            <EmptyState title="No past events yet">
              Events you have played appear here, each with a link back to its archive.
            </EmptyState>
          ) : (
            <EmptyState
              icon={<Board size="lg" />}
              title="No upcoming events"
              action={
                <Button href="/play" size="lg">
                  Find a game
                </Button>
              }
            >
              Register for an event and it shows up here, with its state and what to do next.
            </EmptyState>
          )
        ) : (
          <div className="flex min-w-0 flex-col gap-4">
            <ul className="flex min-w-0 flex-col gap-4">
              {data.items.map((row) => (
                <li key={row.registration.id} className={history ? 'cv-auto cv-h-card' : undefined}>
                  <RegistrationRow row={row} variant={history ? 'history' : 'upcoming'} onCancel={onCancel} />
                </li>
              ))}
            </ul>
            <TablePagination
              pagination={data.pagination}
              onPageChange={setPage}
              label={history ? 'History pages' : 'Upcoming pages'}
            />
          </div>
        )
      }
    </QueryView>
  )
}
