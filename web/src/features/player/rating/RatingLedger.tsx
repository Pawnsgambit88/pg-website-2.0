'use client'

import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { ResultRow } from '@/components/domain/ResultRow'
import { Button } from '@/components/ui/Button'
import { Eyebrow } from '@/components/ui/Eyebrow'
import { Heading } from '@/components/ui/Heading'
import { Surface } from '@/components/ui/Surface'
import { Text } from '@/components/ui/Text'
import { EmptyState } from '@/components/ui/feedback/EmptyState'
import { ErrorState } from '@/components/ui/feedback/ErrorState'
import { Skeleton } from '@/components/ui/feedback/Skeleton'
import { SkeletonRegion } from '@/components/ui/feedback/SkeletonRegion'
import { useApi } from '@/lib/api/adapters/useApi.browser'
import type { RatingPool } from '@/lib/api/types/identity'
import { ratingLedgerQuery } from '@/lib/query/query-options/player'
import { POOL_LABEL } from '@/features/player/rating/rating-labels'

interface RatingLedgerProps {
  pool: RatingPool
  page: number
  onPageChange: (page: number) => void
}

/**
 * Scan-friendly ledger of one pool: newest first, one row per game (`ResultRow` carries `cv-auto cv-h-row`, so long
 * ledgers skip off-screen rendering). Page controls rather than infinite scroll keep focus and position predictable.
 * Only rated games move a rating; social and unrated games show no change.
 */
export function RatingLedger({ pool, page, onPageChange }: RatingLedgerProps) {
  const api = useApi()
  const query = useQuery({ ...ratingLedgerQuery(api, pool, page), placeholderData: keepPreviousData })
  const label = POOL_LABEL[pool]
  const data = query.data

  return (
    <Surface as="section" aria-labelledby="ledger-heading">
      <Eyebrow>RECENT LEDGER</Eyebrow>
      <Heading level={2} size="panel" id="ledger-heading" className="mt-1">
        {label} games
      </Heading>
      <Text variant="small" className="mt-2">
        Newest first. Only rated games change a rating; social and unrated games stay social and show no change.
      </Text>
      <div className="mt-4">
        {data === undefined && query.isPending ? (
          <SkeletonRegion label={`Loading ${label} games`}>
            <div className="flex flex-col gap-3">
              <Skeleton className="h-12" />
              <Skeleton className="h-12" />
              <Skeleton className="h-12" />
            </div>
          </SkeletonRegion>
        ) : data === undefined ? (
          <ErrorState
            error={query.error}
            action="load your games"
            onRetry={() => void query.refetch()}
            retrying={query.isFetching}
            variant="inline"
          />
        ) : data.items.length === 0 ? (
          <EmptyState framed={false} title={`No ${label} games yet`}>
            Rated games in this pool appear here with the rating change after each one.
          </EmptyState>
        ) : (
          <>
            <ul aria-busy={query.isPlaceholderData ? true : undefined}>
              {data.items.map((entry) => (
                <ResultRow
                  key={entry.id}
                  outcome={entry.outcome}
                  opponentName={entry.opponent.displayName}
                  context={entry.event.title}
                  playedAt={entry.at}
                  delta={entry.delta}
                />
              ))}
            </ul>
            {data.pagination.totalPages > 1 ? (
              <nav aria-label={`${label} ledger pages`} className="mt-4 flex flex-wrap items-center gap-3">
                <Button variant="secondary" disabled={page <= 1} onClick={() => onPageChange(page - 1)}>
                  Newer
                </Button>
                <Text as="span" variant="small">
                  Page {data.pagination.page} of {data.pagination.totalPages}
                </Text>
                <Button
                  variant="secondary"
                  disabled={page >= data.pagination.totalPages}
                  onClick={() => onPageChange(page + 1)}
                >
                  Older
                </Button>
              </nav>
            ) : null}
          </>
        )}
      </div>
    </Surface>
  )
}
