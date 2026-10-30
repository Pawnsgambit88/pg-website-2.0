'use client'

import { useState } from 'react'
import { ConfirmAction } from '@/components/admin/ConfirmAction'
import { Button } from '@/components/ui/Button'
import { useToast } from '@/components/ui/feedback/useToast'
import { Switch } from '@/components/ui/form/Switch'
import { useApi } from '@/lib/api/adapters/useApi.browser'

export function CompleteAction({ eventId, onDone }: { eventId: string; onDone: () => Promise<void> }) {
  const api = useApi().admin
  const toast = useToast()
  const [publishArchive, setPublishArchive] = useState(false)
  return (
    <ConfirmAction
      renderTrigger={(open) => (
        <Button
          variant="secondary"
          onClick={() => {
            setPublishArchive(false)
            open()
          }}
        >
          Complete event
        </Button>
      )}
      title="Complete this event?"
      consequence="This closes the event: no more check-ins, results or registrations. It cannot be reopened."
      confirmLabel="Complete event"
      actionLabel="complete this event"
      onConfirm={async (key) => {
        await api.events.completeEvent(eventId, { publishArchive }, { idempotencyKey: key })
      }}
      onDone={() => {
        void onDone()
        toast.success('Event completed')
      }}
    >
      <div className="mt-4">
        <Switch
          label="Publish the recap and gallery now"
          description="Leave off to publish them later from the Gallery and recap tab."
          checked={publishArchive}
          onCheckedChange={setPublishArchive}
        />
      </div>
    </ConfirmAction>
  )
}
