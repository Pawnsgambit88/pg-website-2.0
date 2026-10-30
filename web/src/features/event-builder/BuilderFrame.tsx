'use client'

import { useQueryClient } from '@tanstack/react-query'
import { useEffect, useState } from 'react'
import { BuilderLayout } from '@/features/event-builder/BuilderLayout'
import { BuilderProvider } from '@/features/event-builder/context'
import { createBuilderStore, type BuilderStore } from '@/features/event-builder/store'
import { useApi } from '@/lib/api/adapters/useApi.browser'
import type { BuilderDraftDto } from '@/lib/api/types/admin/event-builder'
import { qk } from '@/lib/query/keys'

// Event Builder shell (FE-25, TASK-077, DEC-023). Layout (BuilderLayout): >= 1200px steps column, editor and persistent
// preview; 720-1199px compact stepper with the preview below; < 720px one step at a time, "Step n of N" header, explicit
// Preview button that opens a full-screen sheet (mounted only when opened).

/** Owns the vanilla store for one draft. Mount with `key={draft.id}`; the store seeds once from `draft`. */
export function BuilderFrame({ draft }: { draft: BuilderDraftDto }) {
  const api = useApi().admin
  const queryClient = useQueryClient()
  const [store] = useState<BuilderStore>(() =>
    createBuilderStore({
      initial: draft,
      save: (patch, version) => api.events.updateEvent(draft.id, { ...patch, version }),
      reload: () => api.events.getEvent(draft.id),
      onSaved: (next) => {
        queryClient.setQueryData(qk.admin.event(draft.id), next)
        void queryClient.invalidateQueries({ queryKey: qk.admin.events() })
      },
    }),
  )
  // Leaving without saving (m8): send what is pending when the tab is hidden or closed and when the builder unmounts
  // (route change). Best effort (the response cannot be awaited there); the session backup keeps the rest. Staged
  // operational edits are never sent from here, so leaving can never open a step-up prompt.
  useEffect(() => {
    const flushNow = (): void => {
      void store.flush()
    }
    const onHidden = (): void => {
      if (document.visibilityState === 'hidden') flushNow()
    }
    window.addEventListener('pagehide', flushNow)
    document.addEventListener('visibilitychange', onHidden)
    return () => {
      window.removeEventListener('pagehide', flushNow)
      document.removeEventListener('visibilitychange', onHidden)
      flushNow()
      store.stop()
    }
  }, [store])
  return (
    <BuilderProvider store={store}>
      <BuilderLayout />
    </BuilderProvider>
  )
}
