'use client'

import { Shell } from '@/components/layout/Shell'
import { Button } from '@/components/ui/Button'
import { PageIntro } from '@/components/ui/PageIntro'
import { useQuery } from '@tanstack/react-query'
import { useApi } from '@/lib/api/adapters/useApi.browser'
import { meQuery } from '@/lib/query/query-options/player'
import { NextUpHero } from '@/features/player/dashboard/NextUpHero'
import { People } from '@/features/player/dashboard/People'
import { RatingSummary } from '@/features/player/dashboard/RatingSummary'
import { RecentGames } from '@/features/player/dashboard/RecentGames'

function firstName(name: string | undefined): string | null {
  const first = name?.trim().split(/\s+/)[0]
  return first === undefined || first === '' ? null : first
}

/**
 * Player dashboard (screen 22, TASK-060). Each section owns its query and its own loading and error state, so the
 * reads start together on mount (no waterfall) and one failing read does not block the others. Order answers the
 * five-second questions: next thing and what to do, then rating, recent games, people.
 */
export function DashboardPage() {
  const api = useApi()
  // Greeting only: it falls back to a nameless line while loading or on failure, and never blocks a section.
  const me = useQuery(meQuery(api))
  const name = firstName(me.data?.name)
  return (
    <Shell className="flex flex-col gap-10 py-8 sm:py-12">
      <PageIntro
        eyebrow="My PG"
        title={name === null ? 'Good to see you.' : `Good to see you, ${name}.`}
        description="Everything you need for your next game, in the order you need it."
        actions={
          <Button href="/play" variant="secondary" size="lg">
            Find another game
          </Button>
        }
      />
      <NextUpHero />
      <RatingSummary />
      <div className="grid min-w-0 gap-10 lg:grid-cols-2">
        <RecentGames />
        <People />
      </div>
    </Shell>
  )
}
