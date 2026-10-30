'use client'

import { useDeferredValue, useId, useMemo, useState } from 'react'
import { ArchiveCard } from '@/components/public/archive/ArchiveCard'
import type { ArchiveItem } from '@/components/public/archive/archiveItem'
import {
  ARCHIVE_FILTERS,
  ARCHIVE_FILTER_LABEL,
  archiveCountText,
  matchesArchiveFilter,
  parseArchiveFilter,
  serialiseArchiveFilter,
  type ArchiveFilter,
} from '@/components/public/archive/archiveFilterModel'
import { PlayFilterChip } from '@/components/public/events/PlayFilterChip'
import { useLocationHash, writeHash } from '@/components/public/events/playHashStore'
import { EmptyState } from '@/components/ui/feedback/EmptyState'
import { Field } from '@/components/ui/form/Field'
import { Input } from '@/components/ui/form/Input'

interface ArchiveSearchProps {
  /** Already loaded and sorted newest first by the page. Minimal card slices only. */
  items: readonly ArchiveItem[]
}

function normalise(value: string): string {
  return value.toLocaleLowerCase('en-IN').normalize('NFKD').replace(/\p{M}/gu, '').trim()
}

/**
 * Client search + type-chip island over the prerendered archive (TASK-045, EV-07). The full list is in the server HTML;
 * typing and chip presses filter it in memory — no network request. Type chip state lives in the URL hash
 * (`#type=social`) so a reload or shared link restores the filter. Search draft stays local.
 *
 * `useDeferredValue` keeps typing responsive on long archives; rows use `cv-auto` for off-screen savings.
 * The result count is a polite status region, announced once per change (not on load).
 */
export function ArchiveSearch({ items }: ArchiveSearchProps) {
  const [query, setQuery] = useState('')
  const deferred = useDeferredValue(query)
  const countId = useId()

  // Type-chip state — pulled from the URL hash (same store that Play uses; different key: `#type=…`).
  const hash = useLocationHash()
  const filter = parseArchiveFilter(hash)

  const selectFilter = (next: ArchiveFilter): void => {
    writeHash(serialiseArchiveFilter(next), 'push')
  }

  // Pre-computed normalised search text — one pass over the full list, stable across renders.
  const index = useMemo(
    () => items.map((item) => ({ item, text: normalise(`${item.title} ${item.promise} ${item.format} ${item.area}`) })),
    [items],
  )

  const needle = normalise(deferred)

  // Combined pass: apply type chip then search needle. Single iteration — no intermediate array.
  const visible = useMemo(() => {
    const results: ArchiveItem[] = []
    for (const entry of index) {
      if (!matchesArchiveFilter(entry.item, filter)) continue
      if (needle !== '' && !entry.text.includes(needle)) continue
      results.push(entry.item)
    }
    return results
  }, [index, needle, filter])

  const countText = archiveCountText(visible.length, items.length)

  return (
    <div className="flex min-w-0 flex-col gap-8">
      {/* Type filter chips — reference screen 05: All | Social | Tournaments | Special formats */}
      <div role="group" aria-label="Filter by event type" className="flex min-w-0 flex-wrap gap-2">
        {ARCHIVE_FILTERS.map((value) => (
          <PlayFilterChip
            key={value}
            label={ARCHIVE_FILTER_LABEL[value]}
            pressed={filter === value}
            onPress={() => {
              selectFilter(value)
            }}
          />
        ))}
      </div>

      <div className="flex min-w-0 flex-col gap-3 sm:max-w-md">
        <Field label="Search past events" hint="Title, format or area.">
          <Input
            type="search"
            preset="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            aria-controls={countId}
          />
        </Field>
        <p id={countId} role="status" aria-live="polite" aria-atomic="true" className="text-sm text-muted">
          {countText}
        </p>
      </div>

      {visible.length === 0 ? (
        <EmptyState title="No past events match" headingLevel={2}>
          Try a shorter search, another word, or select a different type above.
        </EmptyState>
      ) : (
        <ul className="grid grid-cols-1 gap-4 *:min-w-0 sm:grid-cols-2 sm:gap-6 md:grid-cols-3">
          {visible.map((item) => (
            <li key={item.slug} className="cv-auto">
              <ArchiveCard item={item} />
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
