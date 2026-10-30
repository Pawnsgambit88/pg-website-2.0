'use client'

import { useCallback, useDeferredValue, useEffect, useId, useMemo, useRef, useState, type ReactNode } from 'react'
import { Button } from '@/components/ui/Button'
import { EmptyState } from '@/components/ui/feedback/EmptyState'
import { Input } from '@/components/ui/form/Input'
import { PlayFilterChip } from '@/components/public/events/PlayFilterChip'
import {
  matchesPlayFilter,
  parsePlayHash,
  PLAY_FILTER_LABEL,
  PLAY_FILTERS,
  resultCountText,
  searchTerms,
  serialisePlayHash,
  type PlayFilter,
  type PlayFilterItem,
} from '@/components/public/events/playFilterModel'
import { PlayResults } from '@/components/public/events/PlayResults'
import { useLocationHash, writeHash } from '@/components/public/events/playHashStore'

/** One event as the island sees it: filter keys plus the server-rendered card. */
export interface PlayEntry extends PlayFilterItem {
  card: ReactNode
}

interface PlayFiltersProps {
  /** Every upcoming event, in server order. Never empty (the page renders its own empty state). */
  entries: readonly PlayEntry[]
}

/** Quiet time before the search text is written to the hash. Filtering itself is not delayed. */
const SEARCH_COMMIT_MS = 400

const EMPTY_TITLE ='No games match these filters'
const EMPTY_BODY = 'Try another kind of game or a shorter search. New dates go up every week.'

/**
 * Play filter island (TASK-042, reference screen 02 `.filter-row`). Narrows the list the server already delivered; a
 * filter change makes no network request.
 *
 * State: the chip and the committed search live in the URL hash (`#filter=rated&q=blitz`) through `useLocationHash`,
 * so a shared link, a reload and Back/Forward restore them. A chip press pushes a history entry; search typing
 * replaces the current one. Not searchParams: reading them would make /play dynamic (ARCH-001 7.3). The input keeps
 * its own draft so typing stays instant; filtering runs on `useDeferredValue(draft)` (RBP rerender-use-deferred-value).
 *
 * Server HTML and the hydration pass see no hash, so every card is in the raw HTML; the hash filter applies right
 * after hydration. The result count is a polite status line, announced when it changes (not on load).
 */
export function PlayFilters({ entries }: PlayFiltersProps) {
  const searchId = useId()
  const resultsId = useId()
  const hashState = parsePlayHash(useLocationHash())
  const { filter } = hashState

  // Draft search text. Re-synced from the hash when the hash changes from outside (Back, a pasted link) and differs
  // from what the draft would write, so trailing spaces while typing are never eaten (adjust state during render).
  const [draft, setDraft] = useState(hashState.query)
  const [syncedQuery, setSyncedQuery] = useState(hashState.query)
  if (hashState.query !== syncedQuery) {
    setSyncedQuery(hashState.query)
    if (hashState.query !== draft.trim()) setDraft(hashState.query)
  }

  const deferredDraft = useDeferredValue(draft)

  // Search is committed to the hash from the input handler, debounced (replace: typing is not a history step). Never
  // from an effect: during hydration the hash snapshot is still '' and an effect would wipe an incoming link's hash.
  const commitTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  useEffect(
    () => () => {
      clearTimeout(commitTimer.current)
    },
    [],
  )
  const commitSearch = (value: string): void => {
    clearTimeout(commitTimer.current)
    commitTimer.current = setTimeout(() => {
      // Read the chip at fire time so a chip press during the debounce is kept.
      const current = parsePlayHash(window.location.hash)
      writeHash(serialisePlayHash({ filter: current.filter, query: value }), 'replace')
    }, SEARCH_COMMIT_MS)
  }

  const termsKey = searchTerms(deferredDraft).join(' ')
  const matches = useMemo(() => {
    const terms = termsKey === '' ? [] : termsKey.split(' ')
    return entries.map((entry) => matchesPlayFilter(entry, filter, terms))
  }, [entries, filter, termsKey])

  const shown = matches.reduce((count, match) => (match ? count + 1 : count), 0)
  const total = entries.length

  const selectFilter = useCallback(
    (next: PlayFilter) => {
      writeHash(serialisePlayHash({ filter: next, query: draft }), 'push')
    },
    [draft],
  )

  const clearFilters = useCallback(() => {
    clearTimeout(commitTimer.current)
    setDraft('')
    writeHash('', 'push')
  }, [])

  return (
    <div className="flex min-w-0 flex-col gap-6">
      <div className="flex min-w-0 flex-col gap-4 md:flex-row md:items-end md:justify-between md:gap-8">
        <div role="group" aria-label="Kind of game" className="flex min-w-0 flex-wrap gap-2">
          {PLAY_FILTERS.map((value) => (
            <PlayFilterChip
              key={value}
              label={PLAY_FILTER_LABEL[value]}
              pressed={filter === value}
              onPress={() => {
                selectFilter(value)
              }}
            />
          ))}
        </div>
        <div className="flex w-full min-w-0 flex-col gap-2 md:max-w-sm">
          <label htmlFor={searchId} className="font-ui text-label text-ink">
            Search games
          </label>
          <Input
            id={searchId}
            preset="search"
            value={draft}
            placeholder="Title, area or format"
            aria-controls={resultsId}
            enterKeyHint="search"
            onChange={(event) => {
              const value = event.currentTarget.value
              setDraft(value)
              commitSearch(value)
            }}
          />
        </div>
      </div>

      <p role="status" aria-live="polite" className="font-mono text-eyebrow text-muted uppercase">
        {resultCountText(shown, total)}
      </p>

      {shown === 0 ? (
        <EmptyState
          title={EMPTY_TITLE}
          action={
            <Button variant="secondary" onClick={clearFilters}>
              Clear filters
            </Button>
          }
        >
          {EMPTY_BODY}
        </EmptyState>
      ) : null}

      <PlayResults id={resultsId} entries={entries} matches={matches} />
    </div>
  )
}
