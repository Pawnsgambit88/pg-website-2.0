'use client'

import { useQuery } from '@tanstack/react-query'
import { Avatar } from '@/components/ui/Avatar'
import { EmptyState } from '@/components/ui/feedback/EmptyState'
import { Skeleton } from '@/components/ui/feedback/Skeleton'
import { useApi } from '@/lib/api/adapters/useApi.browser'
import { peopleQuery } from '@/lib/query/query-options/player'
import { PageSection } from '@/components/ui/PageSection'
import { QueryView } from '@/components/ui/feedback/QueryView'

/** Opponents played most (M03). Public identity only; rematch actions stay hidden at launch (OQ-09). */
export function People() {
  const api = useApi()
  const query = useQuery(peopleQuery(api))
  return (
    <PageSection id="dash-people" eyebrow="People" title="Games worth playing again.">
      <QueryView
        query={query}
        loadingLabel="Loading people you have met"
        skeleton={<Skeleton shape="block" className="h-32" />}
        errorAction="load the people you have met"
      >
        {(people) =>
          people.length === 0 ? (
            <EmptyState title="No one yet">
              The players you meet over the board are listed here, with how many games you have played.
            </EmptyState>
          ) : (
            <ul className="min-w-0">
              {people.map((person, index) => (
                <li
                  key={`${index}-${person.identity.displayName}`}
                  className="flex min-w-0 items-center gap-4 border-t border-line py-3"
                >
                  <Avatar name={person.identity.displayName} size="md" decorative />
                  <span className="min-w-0 flex-1">
                    <strong className="block font-strong wrap-break-word">{person.identity.displayName}</strong>
                    <small className="block text-sm text-muted">
                      {person.games} {person.games === 1 ? 'game' : 'games'} together
                      {person.identity.cityChapter === null ? '' : ` Â· ${person.identity.cityChapter}`}
                    </small>
                  </span>
                </li>
              ))}
            </ul>
          )
        }
      </QueryView>
    </PageSection>
  )
}
