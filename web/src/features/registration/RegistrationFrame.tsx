'use client'

import { useQuery } from '@tanstack/react-query'
import { Shell } from '@/components/layout/Shell'
import { Skeleton } from '@/components/ui/feedback/Skeleton'
import { PageIntro } from '@/components/ui/PageIntro'
import { TextLink } from '@/components/ui/TextLink'
import { EventFacts } from '@/features/registration/EventFacts'
import { FrameBody } from '@/features/registration/FrameBody'
import { eventPageHref } from '@/features/registration/links'
import { useApi } from '@/lib/api/adapters/useApi.browser'
import type { SessionStatus } from '@/features/registration/resolve-screen'
import type { Slug } from '@/lib/api/types/primitives'
import { availabilityRowText } from '@/features/registration/free-registration'
import {
  registrationAvailabilityQuery,
  registrationEventQuery,
  registrationStateQuery,
} from '@/lib/query/query-options/player'

/**
 * Registration frame (FE-05; screens 18 to 21). Owns layout and data; the decision of which screen to show lives in
 * `resolveScreen`, and the step bodies belong to FE-06, FE-07 and FE-08 (see SlotPanel).
 *
 * Data: the public event (P03) and the player's registration state (R01) are two independent `useQuery` calls that start
 * in the same render, so neither waits for the other (RBP async-parallel). R01 needs a token, so it starts once the
 * session is confirmed; the event read never waits for the session. R01 already carries eligibility
 * (`requiredProfileFields`, `ineligible`), the existing registration and the price, so no separate profile read is made.
 * The route is a player-area route (dynamic, noindex, no RequireAuth): a signed-out visitor sees the sign-in screen
 * instead of being redirected, because the event summary is public.
 */
export function RegistrationFrame({ slug, session }: { slug: Slug; session: SessionStatus }) {
  const api = useApi()
  const eventQuery = useQuery(registrationEventQuery(api, slug))
  const stateQuery = useQuery({ ...registrationStateQuery(api, slug), enabled: session === 'signed-in' })
  // Live places for the side panel: independent of R01 and decorative, so a failure just hides the row.
  const availabilityQuery = useQuery(registrationAvailabilityQuery(api, slug))
  const event = eventQuery.data

  return (
    <Shell className="flex flex-col gap-8 py-8 sm:py-12">
      <PageIntro
        eyebrow={event === undefined || event === null ? 'Registration' : event.title}
        title={event === undefined || event === null ? 'Register for an event' : 'Save your board.'}
        description={event === undefined || event === null ? undefined : event.promise}
        actions={
          <TextLink href={eventPageHref(slug)} inline>
            Back to the event page
          </TextLink>
        }
      />
      <div className="grid min-w-0 gap-8 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)] lg:items-start">
        <div className="flex min-w-0 flex-col gap-6">
          <FrameBody slug={slug} session={session} eventQuery={eventQuery} stateQuery={stateQuery} />
        </div>
        <aside aria-label="Event details" className="min-w-0">
          {event === undefined || event === null ? (
            eventQuery.isPending ? (
              <Skeleton shape="card" className="h-48" />
            ) : null
          ) : (
            <EventFacts event={event} availability={availabilityRowText(availabilityQuery.data)} />
          )}
        </aside>
      </div>
    </Shell>
  )
}
