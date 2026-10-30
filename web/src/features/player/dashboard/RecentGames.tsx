'use client'

import { useQuery } from '@tanstack/react-query'
import { ResultRow } from '@/components/domain/ResultRow'
import { EmptyState } from '@/components/ui/feedback/EmptyState'
import { Skeleton } from '@/components/ui/feedback/Skeleton'
import { useApi } from '@/lib/api/adapters/useApi.browser'
import { recentGamesQuery } from '@/lib/query/query-options/player'
import { PageSection } from '@/components/ui/PageSection'
import { QueryView } from '@/components/ui/feedback/QueryView'

const POOL_WORD = { blitz: 'Blitz', rapid: 'Rapid', classical: 'Classical' } as const
// Module scope: a stable query argument, so the key never changes between renders.
const RECENT_PAGE = { pageSize: 5 } as const

/** Last few results (M02): outcome letter plus word, opponent, event, signed delta (none for unrated games). */
export function RecentGames() {
  const api = useApi()
  const query = useQuery(recentGamesQuery(api, RECENT_PAGE))
  return (
    <PageSection id="dash-recent" eyebrow="Recent games" title="Form without the noise.">
      <QueryView
        query={query}
        loadingLabel="Loading recent games"
        skeleton={<Skeleton shape="block" className="h-48" />}
        errorAction="load your recent games"
      >
        {(page) =>
          page.items.length === 0 ? (
            <EmptyState title="No games yet">
              Results from your rated and social games appear here after your first event.
            </EmptyState>
          ) : (
            <ul className="min-w-0">
              {page.items.map((game) => (
                <ResultRow
                  key={game.id}
                  outcome={game.outcome}
                  opponentName={game.opponent.displayName}
                  context={`${POOL_WORD[game.pool]} Â· ${game.eventTitle}`}
                  playedAt={game.playedAt}
                  delta={game.ratingDelta}
                />
              ))}
            </ul>
          )
        }
      </QueryView>
    </PageSection>
  )
}
