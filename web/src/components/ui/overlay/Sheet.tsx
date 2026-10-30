'use client'

import * as RadixDialog from '@radix-ui/react-dialog'
import type { ReactElement, ReactNode } from 'react'
import { Close } from '@/components/ui/icons/Close'
import { cn } from '@/lib/cn'

/** Edge the sheet slides from. `right`/`left` for the mobile nav and filters, `bottom` for builder preview. */
export type SheetSide = 'right' | 'left' | 'bottom'

// Written out in full for the Tailwind scanner. Enter: CSS transition from `starting:` styles (no JS, off under
// reduced motion). Exit is instant on purpose: unmount on close keeps "content mounted only when open" exact.
const SIDE_CLASS: Record<SheetSide, string> = {
  right: 'inset-y-0 right-0 h-dvh w-11/12 max-w-sm border-l pr-safe pt-safe pb-safe starting:translate-x-full',
  left: 'inset-y-0 left-0 h-dvh w-11/12 max-w-sm border-r pl-safe pt-safe pb-safe starting:-translate-x-full',
  bottom: 'inset-x-0 bottom-0 max-h-5/6 w-full border-t px-safe pb-safe starting:translate-y-full',
}

export interface SheetProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** Required: the accessible name. Shown as a heading unless `titleHidden`. */
  title: string
  /** Optional description (aria-describedby). When omitted, aria-describedby is explicitly cleared. */
  descriptionText?: string
  titleHidden?: boolean
  side?: SheetSide
  /** Optional trigger (one button element); Radix returns focus to it on close. */
  trigger?: ReactElement
  /** Accessible name of the close button. */
  closeLabel?: string
  children?: ReactNode
}

/**
 * Side or bottom drawer on Radix Dialog: focus trap, Escape, scroll lock, inert background, focus returns to the
 * trigger, content mounted only while open. Safe-area insets on the edges it touches, 44px close target, no swipe
 * gestures. Self-contained on purpose: this is the ONE overlay module (public) may import (.dependency-cruiser.cjs
 * MENU_ISLAND_OVERLAY = components/ui/overlay/Sheet.tsx), so it imports no other overlay file.
 */
export function Sheet({
  open,
  onOpenChange,
  title,
  descriptionText,
  titleHidden = false,
  side = 'right',
  trigger,
  closeLabel = 'Close',
  children,
}: SheetProps) {
  return (
    <RadixDialog.Root open={open} onOpenChange={onOpenChange}>
      {trigger ? <RadixDialog.Trigger asChild>{trigger}</RadixDialog.Trigger> : null}
      <RadixDialog.Portal>
        <RadixDialog.Overlay className="fixed inset-0 z-overlay bg-ink/60 transition-opacity duration-control ease-brand motion-reduce:transition-none starting:opacity-0" />
        <RadixDialog.Content
          {...(descriptionText ? {} : { 'aria-describedby': undefined })}
          className={cn(
            'fixed z-sidebar flex flex-col border-line bg-parchment text-ink shadow-brand outline-none',
            'transition-transform duration-control ease-brand motion-reduce:transition-none',
            SIDE_CLASS[side],
          )}
        >
          <div className="flex min-h-14 items-center justify-between gap-3 pl-5">
            <RadixDialog.Title
              className={cn('font-display text-2xl leading-snug wrap-break-word', titleHidden && 'sr-only')}
            >
              {title}
            </RadixDialog.Title>
            <RadixDialog.Close
              aria-label={closeLabel}
              className="inline-flex size-11 shrink-0 items-center justify-center rounded-public text-ink hover:bg-line"
            >
              <Close />
            </RadixDialog.Close>
          </div>
          {descriptionText ? (
            <RadixDialog.Description className="px-5 pb-2 text-body wrap-break-word">
              {descriptionText}
            </RadixDialog.Description>
          ) : null}
          <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 py-4">{children}</div>
        </RadixDialog.Content>
      </RadixDialog.Portal>
    </RadixDialog.Root>
  )
}
