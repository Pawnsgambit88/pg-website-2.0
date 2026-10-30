import type { UseQueryResult } from '@tanstack/react-query'
import { Button } from '@/components/ui/Button'
import { EmptyState } from '@/components/ui/feedback/EmptyState'
import { ErrorState } from '@/components/ui/feedback/ErrorState'
import { Skeleton } from '@/components/ui/feedback/Skeleton'
import { SkeletonRegion } from '@/components/ui/feedback/SkeletonRegion'
import { Stepper } from '@/components/ui/nav/Stepper'
import { ScreenPanel } from '@/features/registration/ScreenPanels'
import { SlotPanel } from '@/features/registration/SlotPanel'
import { flowStepsOf, isSlotScreen, resolveScreen } from '@/features/registration/resolve-screen'
import type { SessionStatus } from '@/features/registration/resolve-screen'
import type { EventDetailDto } from '@/lib/api/types/event'
import type { Slug } from '@/lib/api/types/primitives'
import type { RegistrationStateDto } from '@/lib/api/types/registration'

const bodySkeleton = (
  <SkeletonRegion label="Loading registration">
    <Skeleton shape="card" className="h-64" />
  </SkeletonRegion>
)

interface FrameBodyProps {
  slug: Slug
  session: SessionStatus
  eventQuery: UseQueryResult<EventDetailDto | null>
  stateQuery: UseQueryResult<RegistrationStateDto>
}

/**
 * The three states (DoD-S) around the resolver: loading, error with retry, then the screen the resolver picks.
 * Order: event first (it decides "not found" and "cancelled"), then the session, then R01 for a signed-in player.
 */
export function FrameBody({ slug, session, eventQuery, stateQuery }: FrameBodyProps) {
  const event = eventQuery.data
  if (event === null) {
    return (
      <EmptyState
        headingLevel={2}
        title="We could not find that event"
        action={
          <Button href="/play" variant="secondary" fullWidth>
            See upcoming events
          </Button>
        }
      >
        The link may be out of date, or the event is no longer listed.
      </EmptyState>
    )
  }
  if (event === undefined) {
    return eventQuery.isPending ? (
      bodySkeleton
    ) : (
      <ErrorState
        error={eventQuery.error}
        action="load this event"
        onRetry={() => void eventQuery.refetch()}
        retrying={eventQuery.isFetching}
        headingLevel={2}
      />
    )
  }
  if (session === 'loading') return bodySkeleton

  if (session === 'signed-in' && stateQuery.data === undefined) {
    return stateQuery.isPending ? (
      bodySkeleton
    ) : (
      <ErrorState
        error={stateQuery.error}
        action="check your registration"
        onRetry={() => void stateQuery.refetch()}
        retrying={stateQuery.isFetching}
        headingLevel={2}
      />
    )
  }

  const screen = resolveScreen({
    session,
    event,
    state: session === 'signed-in' ? (stateQuery.data ?? null) : null,
  })
  const flow = flowStepsOf(screen)
  return (
    <>
      {flow === null ? null : <Stepper steps={flow.steps} current={flow.current} label="Registration steps" />}
      {isSlotScreen(screen) ? <SlotPanel screen={screen} event={event} /> : <ScreenPanel screen={screen} slug={slug} />}
    </>
  )
}
