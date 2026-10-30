'use client'

import { PreviewPanel } from '@/features/event-builder/PreviewPanel'
import { Sheet } from '@/components/ui/overlay/Sheet'

/** Phone preview: opened only by the explicit Preview button; the panel mounts only while open. Loaded with next/dynamic. */
export function PreviewSheet({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  return (
    <Sheet
      open={open}
      onOpenChange={onOpenChange}
      side="bottom"
      title="Preview"
      descriptionText="Preview. Not published. This is how the event card looks on the website."
      closeLabel="Close preview"
    >
      <PreviewPanel />
    </Sheet>
  )
}
