'use client'

import type { UseQueryResult } from '@tanstack/react-query'
import type { ReactNode } from 'react'
import { ErrorState } from '@/components/ui/feedback/ErrorState'
import { SkeletonRegion } from '@/components/ui/feedback/SkeletonRegion'
import type { HeadingLevel } from '@/components/ui/headingLevel'

interface QueryViewProps<T> {
  query: UseQueryResult<T>
  /** Announced once while the section loads ("Loading your next game"). */
  loadingLabel: string
  /** Skeleton blocks that mirror the final layout. */
  skeleton: ReactNode
  /** Verb phrase for the error copy ("load your next game"). */
  errorAction: string
  headingLevel?: HeadingLevel
  children: (data: T) => ReactNode
}

/**
 * The three states of one independent section (DoD-S): skeleton while the first load runs, ErrorState with retry when
 * it failed, data otherwise. Data already in the cache stays on screen during a background refetch or a failed refetch,
 * so one failing section never blanks the page and never blocks its siblings.
 */
export function QueryView<T>({
  query,
  loadingLabel,
  skeleton,
  errorAction,
  headingLevel = 3,
  children,
}: QueryViewProps<T>) {
  if (query.data !== undefined) return <>{children(query.data)}</>
  if (query.isPending) return <SkeletonRegion label={loadingLabel}>{skeleton}</SkeletonRegion>
  return (
    <ErrorState
      error={query.error}
      action={errorAction}
      onRetry={() => void query.refetch()}
      retrying={query.isFetching}
      headingLevel={headingLevel}
    />
  )
}
