'use client'

import * as RadixDialog from '@radix-ui/react-dialog'
import { Close } from '@/components/ui/icons/Close'

/** 44px close target in the panel corner. */
export function OverlayCloseButton({ label }: { label: string }) {
  return (
    <RadixDialog.Close
      aria-label={label}
      className="absolute top-2 right-2 inline-flex size-11 items-center justify-center rounded-public text-ink hover:bg-line"
    >
      <Close />
    </RadixDialog.Close>
  )
}
