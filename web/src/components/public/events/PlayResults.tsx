'use client'

import { memo, type ReactNode } from 'react'
import { Grid } from '@/components/layout/Grid'

export interface PlayResultEntry {
  slug: string
  /** The server-rendered EventCard. Passed through untouched, so card code never ships to the browser. */
  card: ReactNode
}

interface PlayResultsProps {
  entries: readonly PlayResultEntry[]
  /** `matches[i]` decides whether `entries[i]` is shown. Same identity while the filter is unchanged. */
  matches: readonly boolean[]
  id?: string
}

/**
 * Play results grid (TASK-042; RESPONSIVE-BEHAVIOR "Event discovery"): one column below 720px, two to 960px, three from
 * 960px. Non-matching cards are `hidden`, not unmounted: the DOM order and loaded images stay, and with no JS (or no
 * hash) every card is visible in the server HTML. Memoised so typing in search does not re-render 200 cards until the
 * deferred filter result actually changes (RBP rerender-memo). `cv-auto` skips off-screen cards (rendering-content-visibility).
 */
export const PlayResults = memo(function PlayResults({ entries, matches, id }: PlayResultsProps) {
  return (
    <div id={id}>
      <Grid as="ul" columns={3} gap="md">
        {entries.map((entry, index) => (
          <li key={entry.slug} hidden={matches[index] === false} className="cv-auto cv-h-card">
            {entry.card}
          </li>
        ))}
      </Grid>
    </div>
  )
})
