'use client'

import { keepPreviousData, useQuery, type QueryClient } from '@tanstack/react-query'
import { useEffect, useState } from 'react'
import { ConfirmAction } from '@/components/admin/ConfirmAction'
import { Button } from '@/components/ui/Button'
import { QueryView } from '@/components/ui/feedback/QueryView'
import { Skeleton } from '@/components/ui/feedback/Skeleton'
import { useToast } from '@/components/ui/feedback/useToast'
import { Field } from '@/components/ui/form/Field'
import { Input } from '@/components/ui/form/Input'
import { DeskList } from '@/features/event-control/check-in/DeskList'
import type { ControlTabProps } from '@/features/event-control/tabs'
import { useApi } from '@/lib/api/adapters/useApi.browser'
import { copyFor } from '@/lib/api/error-copy'
import type {
  AdminCheckInQuery,
  CheckInAllResult,
  CheckInDeskDto,
  DeskRow,
  ManualCheckInInput,
} from '@/lib/api/types/admin/control-checkin'
import { qk } from '@/lib/query/keys'
import { useApiMutation } from '@/lib/query/mutation'
import { adminCheckInQuery } from '@/lib/query/query-options/admin'

type DeskFilter = NonNullable<AdminCheckInQuery['filter']>

const FILTERS: readonly { value: DeskFilter; label: string }[] = [
  { value: 'all', label: 'Everyone' },
  { value: 'not_arrived', label: 'Waiting' },
  { value: 'arrived', label: 'Arrived' },
  { value: 'first_timers_unwelcomed', label: 'First-timers' },
]

const PAGE_SIZE = 100

function useDebounced<T>(value: T, ms: number): T {
  const [debounced, setDebounced] = useState(value)
  useEffect(() => {
    const id = setTimeout(() => {
      setDebounced(value)
    }, ms)
    return () => {
      clearTimeout(id)
    }
  }, [value, ms])
  return debounced
}

/** Writes the expected result into every cached desk list of this event (all filters and searches). */
function applyOptimistic(eventId: string, input: ManualCheckInInput, queryClient: QueryClient) {
  const checkingIn = input.state === 'checked_in'
  const now = new Date().toISOString()
  queryClient.setQueriesData<CheckInDeskDto>({ queryKey: qk.admin.checkInAll(eventId) }, (old) => {
    if (old === undefined) return old
    const target = old.rows.items.find((row) => row.registrationId === input.registrationId)
    if (target === undefined || (target.checkedInAt !== null) === checkingIn) return old
    return {
      ...old,
      counts: { ...old.counts, arrived: Math.max(0, old.counts.arrived + (checkingIn ? 1 : -1)) },
      rows: {
        ...old.rows,
        items: old.rows.items.map((row) =>
          row.registrationId === input.registrationId
            ? { ...row, checkedInAt: checkingIn ? now : null, checkInSource: checkingIn ? ('desk' as const) : null }
            : row,
        ),
      },
    }
  })
}

/** Control Room Check-in desk (FE-32, screen 48): phone-first list, instant search, optimistic check-in and undo. */
export function CheckInTab({ eventId }: ControlTabProps) {
  const admin = useApi().admin
  const toast = useToast()
  const [text, setText] = useState('')
  const [filter, setFilter] = useState<DeskFilter>('all')
  const q = useDebounced(text.trim(), 250)
  const query = useQuery({
    ...adminCheckInQuery(admin, eventId, {
      q: q === '' ? undefined : q,
      filter: filter === 'all' ? undefined : filter,
      pageSize: PAGE_SIZE,
    }),
    placeholderData: keepPreviousData,
  })

  const mutation = useApiMutation<unknown, ManualCheckInInput>({
    idempotent: false,
    mutationFn: (input) => admin.control.setCheckIn(eventId, input),
    invalidates: () => [qk.admin.checkInAll(eventId), qk.admin.overview(eventId)],
    optimistic: {
      keys: [qk.admin.checkInAll(eventId)],
      apply: (input, queryClient) => {
        applyOptimistic(eventId, input, queryClient)
      },
    },
    onError: (error) => {
      toast.error(copyFor(error, { action: 'update that check-in' }).body)
    },
  })

  const allMutation = useApiMutation<CheckInAllResult, void>({
    idempotent: false,
    mutationFn: () => admin.control.checkInAll(eventId),
    invalidates: () => [qk.admin.checkInAll(eventId), qk.admin.overview(eventId)],
    onSuccess: (result) => {
      toast.success(result.checkedIn === 1 ? '1 player checked in.' : `${result.checkedIn} players checked in.`)
    },
  })
  const waiting = query.data === undefined ? 0 : query.data.counts.expected - query.data.counts.arrived

  const toggle = (row: DeskRow) => {
    mutation.mutate({
      registrationId: row.registrationId,
      state: row.checkedInAt === null ? 'checked_in' : 'not_checked_in',
    })
  }

  const needle = text.trim().toLowerCase()
  const placeholder = (
    <div className="flex flex-col gap-3">
      <Skeleton shape="card" className="h-20" />
      <Skeleton shape="card" className="h-16" />
      <Skeleton shape="card" className="h-16" />
      <Skeleton shape="card" className="h-16" />
    </div>
  )

  return (
    <section aria-label="Check-in desk" className="flex min-w-0 flex-col gap-4">
      <Field label="Find a player">
        <Input
          type="search"
          value={text}
          onChange={(event) => {
            setText(event.target.value)
          }}
          placeholder="Start typing a name"
          autoComplete="off"
          enterKeyHint="search"
        />
      </Field>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div role="group" aria-label="Show" className="flex flex-wrap gap-2">
          {FILTERS.map((item) => (
            <Button
              key={item.value}
              size="md"
              variant={filter === item.value ? 'primary' : 'secondary'}
              onClick={() => {
                setFilter(item.value)
              }}
            >
              {item.label}
            </Button>
          ))}
        </div>
        <ConfirmAction
          title="Check in everyone?"
          consequence={`This marks all ${waiting} waiting ${waiting === 1 ? 'player' : 'players'} as arrived. You can still undo a single player afterwards.`}
          confirmLabel="Check in everyone"
          actionLabel="check in everyone"
          onConfirm={async () => {
            await allMutation.mutateAsync()
          }}
          renderTrigger={(open) => (
            <Button size="md" variant="secondary" disabled={waiting === 0} onClick={open}>
              {waiting === 0 ? 'All checked in' : `Check in all (${waiting})`}
            </Button>
          )}
        />
      </div>
      <QueryView
        query={query}
        loadingLabel="Loading the check-in desk"
        skeleton={placeholder}
        errorAction="load the check-in desk"
        headingLevel={2}
      >
        {(data) => <DeskList data={data} needle={needle} onToggle={toggle} stale={query.isPlaceholderData} />}
      </QueryView>
    </section>
  )
}
