'use client'

import { useQuery } from '@tanstack/react-query'
import { useState } from 'react'
import { RatingPoolCard } from '@/components/domain/RatingPoolCard'
import { Shell } from '@/components/layout/Shell'
import { PageIntro } from '@/components/ui/PageIntro'
import { EmptyState } from '@/components/ui/feedback/EmptyState'
import { ErrorState } from '@/components/ui/feedback/ErrorState'
import { Skeleton } from '@/components/ui/feedback/Skeleton'
import { SkeletonRegion } from '@/components/ui/feedback/SkeletonRegion'
import { Field } from '@/components/ui/form/Field'
import { ChoiceCard } from '@/components/ui/form/ChoiceCard'
import { useApi } from '@/lib/api/adapters/useApi.browser'
import { RATING_POOLS, type RatingPool } from '@/lib/api/types/identity'
import { ratingsQuery } from '@/lib/query/query-options/player'
import { RatingLedger } from '@/features/player/rating/RatingLedger'
import { RdExplainer } from '@/features/player/rating/RdExplainer'
import { TrendSlot } from '@/features/player/rating/TrendSlot'
import { defaultPool, hasAnyRatedGames, POOL_LABEL, poolOptionHint } from '@/features/player/rating/rating-labels'

/** Ratings (screen 30): pool selector, the selected pool's card, RD explanation, trend slot (TASK-067) and ledger. */
export function RatingPage() {
  const api = useApi()
  const query = useQuery(ratingsQuery(api))
  const [chosen, setChosen] = useState<{ pool: RatingPool; page: number } | null>(null)

  const intro = (
    <PageIntro
      eyebrow="Ratings"
      title="Your game, without turning it into a personality test."
      description="Separate Blitz, Rapid and Classical pools. Social games remain social."
    />
  )

  if (query.data === undefined) {
    return (
      <Shell className="flex flex-col gap-8 py-8 sm:py-12">
        {intro}
        {query.isPending ? (
          <SkeletonRegion label="Loading your ratings">
            <div className="flex flex-col gap-4">
              <Skeleton className="h-16" />
              <Skeleton shape="card" />
              <Skeleton shape="card" />
            </div>
          </SkeletonRegion>
        ) : (
          <ErrorState
            error={query.error}
            action="load your ratings"
            onRetry={() => void query.refetch()}
            retrying={query.isFetching}
            headingLevel={2}
          />
        )}
      </Shell>
    )
  }

  const profile = query.data
  const pool = chosen?.pool ?? defaultPool(profile)
  const page = chosen?.page ?? 1
  const summary = profile[pool]

  return (
    <Shell className="flex flex-col gap-8 py-8 sm:py-12">
      {intro}
      {!hasAnyRatedGames(profile) ? (
        <EmptyState headingLevel={2} title="No rated games yet" action={undefined}>
          Play a rated PG event and your Blitz, Rapid or Classical rating appears here, with every change listed.
        </EmptyState>
      ) : null}

      <Field group label="Rating pool">
        <div className="grid gap-3 sm:grid-cols-3">
          {RATING_POOLS.map((option) => (
            <ChoiceCard
              key={option}
              type="radio"
              name="rating-pool"
              value={option}
              label={POOL_LABEL[option]}
              description={poolOptionHint(profile[option])}
              checked={option === pool}
              onCheckedChange={(checked) => {
                if (checked) setChosen({ pool: option, page: 1 })
              }}
            />
          ))}
        </div>
      </Field>

      <div role="region" aria-label={`${POOL_LABEL[pool]} details`} className="flex flex-col gap-6">
        <div className="grid gap-6 lg:grid-cols-2">
          <RatingPoolCard summary={summary} selected />
          <RdExplainer summary={summary} />
        </div>
        {/* TASK-067: lazy trend chart replaces the body of TrendSlot. */}
        <TrendSlot pool={pool} />
        <RatingLedger pool={pool} page={page} onPageChange={(next) => setChosen({ pool, page: next })} />
      </div>
    </Shell>
  )
}
