'use client'

import * as RadixDialog from '@radix-ui/react-dialog'
import type { ReactNode } from 'react'

/**
 * Backdrop that also centres its content and scrolls when the content is taller than the viewport (Radix pattern: the
 * Content sits inside the Overlay). `overscroll-contain` stops scroll chaining; Radix locks body scroll (iOS included).
 * The fade-in is a CSS transition from `starting:` styles and is off under prefers-reduced-motion.
 */
export function OverlayBackdrop({ children }: { children: ReactNode }) {
  return (
    <RadixDialog.Overlay className="fixed inset-0 z-overlay flex items-center justify-center overflow-y-auto overscroll-contain bg-ink/60 px-4 pt-safe-4 pb-safe-4 transition-opacity duration-control ease-brand motion-reduce:transition-none starting:opacity-0">
      {children}
    </RadixDialog.Overlay>
  )
}
