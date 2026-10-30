'use client'

import { useQuery } from '@tanstack/react-query'
import { RatingPoolCard } from '@/components/domain/RatingPoolCard'
import { TextLink } from '@/components/ui/TextLink'
import { Skeleton } from '@/components/ui/feedback/Skeleton'
import { useApi } from '@/lib/api/adapters/useApi.browser'
import { ratingsQuery } from '@/lib/query/query-options/player'
import { PageSection } from '@/components/ui/PageSection'
import { QueryView } from '@/components/ui/feedback/QueryView'
import { poolSummaries } from '@/features/player/rating/rating-labels'

/** Three pool cards, never blended (M10). Shares the cache entry with the rating page. */
export function RatingSummary() {
  const api = useApi()
  const query = useQuery(ratingsQuery(api))
  return (
    <PageSection
      id="dash-ratings"
      eyebrow="Your game"
      title="A quiet view of where you are."
      action={<TextLink href="/app/rating">See rating history</TextLink>}
    >
      <QueryView
        query={query}
        loadingLabel="Loading your ratings"
        skeleton={
          <div className="grid gap-4 sm:grid-cols-3">
            <Skeleton shape="card" />
            <Skeleton shape="card" />
            <Skeleton shape="card" />
          </div>
        }
        errorAction="load your ratings"
      >
        {(profile) => (
          <div className="grid min-w-0 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {poolSummaries(profile).map((summary) => (
              <RatingPoolCard key={summary.pool} summary={summary} />
            ))}
          </div>
        )}
      </QueryView>
    </PageSection>
  )
}
