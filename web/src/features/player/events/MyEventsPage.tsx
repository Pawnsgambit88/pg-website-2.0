'use client'

import { useState } from 'react'
import { Shell } from '@/components/layout/Shell'
import { PageIntro } from '@/components/ui/PageIntro'
import { LocalTabs } from '@/components/ui/nav/LocalTabs'
import type { MyRegistrationDto } from '@/lib/api/types/my-events'
import { CancelRegistrationDialog } from '@/features/player/events/CancelRegistrationDialog'
import { RegistrationList } from '@/features/player/events/RegistrationList'

/**
 * My Events (screen 23, TASK-061): Upcoming (every registration state, actions the server allows) and History
 * (completed events linking back to the archive). One cancel dialog serves the page; it is closed unless a row asked.
 */
export function MyEventsPage() {
  const [cancelTarget, setCancelTarget] = useState<MyRegistrationDto | null>(null)
  return (
    <Shell className="flex flex-col gap-8 py-8 sm:py-12">
      <PageIntro
        eyebrow="My events"
        title="Everything you said yes to."
        description="Upcoming registrations, live event access and the events already in your PG history."
      />
      <LocalTabs
        label="My events"
        items={[
          {
            value: 'upcoming',
            label: 'Upcoming',
            content: <RegistrationList scope="upcoming" onCancel={setCancelTarget} />,
          },
          { value: 'history', label: 'History', content: <RegistrationList scope="history" /> },
        ]}
      />
      <CancelRegistrationDialog
        target={cancelTarget}
        onClose={() => {
          setCancelTarget(null)
        }}
      />
    </Shell>
  )
}
