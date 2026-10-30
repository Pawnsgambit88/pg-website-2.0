import type { Metadata } from 'next'
import { ArchiveHero } from '@/components/public/archive/ArchiveHero'
import { ArchiveSearch } from '@/components/public/archive/ArchiveSearch'
import { newestFirst, toArchiveItem } from '@/components/public/archive/archiveItem'
import { Section } from '@/components/layout/Section'
import { Button } from '@/components/ui/Button'
import { EmptyState } from '@/components/ui/feedback/EmptyState'
import { MAX_PAGE_SIZE } from '@/lib/api/types/pagination'
import { getPastEvents } from '@/lib/data/public/past-events'
import { buildMetadata } from '@/lib/seo/metadata'

// Past events archive (screen 05, TASK-045). Static, prerendered; 900 s matches the public ISR window (ARCH-001 7.3)
// and the `past-events` tag revalidates on demand. No request APIs (no searchParams): page 1 of the archive is baked
// into the HTML and the search island filters it in memory. A failed read throws to the route error boundary.
export const revalidate = 900

const PATH = '/past-events'
const EYEBROW = 'Past events'
const TITLE = 'The club keeps its memory.'
const LEAD = 'Results, photographs, recaps and the games people kept talking about.'

export const metadata: Metadata = buildMetadata({ title: 'Past events', description: LEAD, path: PATH })

export default async function PastEventsPage() {
  const page = await getPastEvents(1, MAX_PAGE_SIZE)
  // Completed and cancelled only, newest first, whatever order the backend used.
  const items = newestFirst(
    page.items.filter((event) => event.status === 'completed' || event.status === 'cancelled').map(toArchiveItem),
  )

  return (
    <>
      <ArchiveHero eyebrow={EYEBROW} title={TITLE} lead={LEAD} />
      <Section space="compact" aria-label="Past events list">
        {items.length === 0 ? (
          <EmptyState
            title="No past events yet"
            headingLevel={2}
            action={
              <Button href="/play" variant="primary">
                Find my next game
              </Button>
            }
          >
            Once the first events finish, their results, photos and recaps will live here.
          </EmptyState>
        ) : (
          <ArchiveSearch items={items} />
        )}
      </Section>
    </>
  )
}
