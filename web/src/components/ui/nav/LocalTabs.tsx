'use client'

import * as Tabs from '@radix-ui/react-tabs'
import type { ReactNode } from 'react'
import { cn } from '@/lib/cn'

export interface LocalTabItem {
  value: string
  label: ReactNode
  /** Rendered only while this tab is selected (panels mount lazily and unmount when left). */
  content: ReactNode
  disabled?: boolean
}

interface LocalTabsProps {
  items: readonly LocalTabItem[]
  /** Accessible name of the tab list ("Event sections"). Required: a tablist without a name is not announced. */
  label: string
  /** Uncontrolled start tab. Defaults to the first item. */
  defaultValue?: string
  /** Controlled tab. Pair with `onValueChange`. */
  value?: string
  onValueChange?: (value: string) => void
  /** Layout additions only. */
  className?: string
}

/**
 * In-page tabs on Radix Tabs (ARCH-001 15): roving tabindex, Left/Right/Home/End, automatic activation, ARIA
 * tablist/tab/tabpanel wiring. Use RouteTabs when each tab is its own URL. The strip scrolls sideways when it
 * overflows (320px), triggers are 44px tall, and the active tab is marked by a 2px underline, not by colour alone.
 * Only the selected panel is mounted. Client Component (Radix state).
 */
export function LocalTabs({ items, label, defaultValue, value, onValueChange, className }: LocalTabsProps) {
  const fallback = items[0]?.value
  const rootProps =
    value !== undefined ? { value, onValueChange } : { defaultValue: defaultValue ?? fallback, onValueChange }
  return (
    <Tabs.Root {...rootProps} className={className}>
      <div className="overflow-x-auto overscroll-x-contain border-b border-line">
        <Tabs.List aria-label={label} className="flex min-w-max gap-1">
          {items.map((item) => (
            <Tabs.Trigger
              key={item.value}
              value={item.value}
              disabled={item.disabled}
              className={cn(
                '-mb-px inline-flex min-h-11 items-center border-b-2 border-transparent px-4 py-2 type-button whitespace-nowrap text-ink-soft select-none',
                'hover:text-ink data-[state=active]:border-copper-dark data-[state=active]:text-ink',
                'data-disabled:cursor-not-allowed data-disabled:opacity-60',
              )}
            >
              {item.label}
            </Tabs.Trigger>
          ))}
        </Tabs.List>
      </div>
      {items.map((item) => (
        <Tabs.Content key={item.value} value={item.value} className="pt-6">
          {item.content}
        </Tabs.Content>
      ))}
    </Tabs.Root>
  )
}
