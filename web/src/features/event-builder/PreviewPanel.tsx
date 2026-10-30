'use client'

import { useDeferredValue, useMemo } from 'react'
import { EventCard } from '@/components/domain/EventCard'
import { Eyebrow } from '@/components/ui/Eyebrow'
import { Surface } from '@/components/ui/Surface'
import { useBuilderSelector } from '@/features/event-builder/context'
import { toPreviewSummary } from '@/features/event-builder/preview-model'

/**
 * Public preview (TASK-077). Renders the same `EventCard` the live site uses, in a non-interactive wrapper (`inert`),
 * labelled "Preview. Not published.". Reads the draft through `useDeferredValue`, so typing never waits for it.
 * Inline at 720px and up; under 720px it is only mounted by `PreviewSheet`, on request.
 */
export function PreviewPanel() {
  const server = useBuilderSelector((state) => state.server)
  const pending = useBuilderSelector((state) => state.pending)
  const deferredServer = useDeferredValue(server)
  const deferredPending = useDeferredValue(pending)
  const summary = useMemo(() => toPreviewSummary(deferredServer, deferredPending), [deferredServer, deferredPending])

  return (
    <Surface as="aside" tone="admin" padding="md" className="flex min-w-0 flex-col gap-4">
      <div className="flex flex-col gap-1">
        <Eyebrow>Preview</Eyebrow>
        <p className="text-sm text-muted">Preview. Not published.</p>
      </div>
      <div inert className="pointer-events-none min-w-0">
        <EventCard event={summary} headingLevel={3} actionLabel="See event" />
      </div>
    </Surface>
  )
}
