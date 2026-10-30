'use client'

import { cn } from '@/lib/cn'

interface PlayFilterChipProps {
  label: string
  pressed: boolean
  onPress: () => void
}

/**
 * One Play filter chip (reference `.filter-row button`): hairline toggle, forest fill when active. A toggle button with
 * `aria-pressed`, so the state is announced and visible without colour alone (fill plus the pressed state). At least
 * 44px tall; the label wraps rather than overflowing at 320.
 */
export function PlayFilterChip({ label, pressed, onPress }: PlayFilterChipProps) {
  return (
    <button
      type="button"
      aria-pressed={pressed}
      onClick={onPress}
      className={cn(
        'min-h-tap min-w-tap rounded-public border px-3 py-2 font-ui text-sm wrap-break-word transition-colors duration-control',
        pressed
          ? 'border-forest bg-forest text-parchment'
          : 'border-line bg-transparent text-ink hover:border-ink',
      )}
    >
      {label}
    </button>
  )
}
