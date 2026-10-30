'use client'

import type { ReactNode } from 'react'
import { Button } from '@/components/ui/Button'
import { ChevronLeft } from '@/components/ui/icons/ChevronLeft'

export interface SplitWorkspaceProps {
  /** Left pane: the list or tree. */
  list: ReactNode
  /** Right pane: the editor or detail. */
  detail: ReactNode
  /** Accessible names of the two regions. */
  listLabel: string
  detailLabel: string
  /**
   * Below 1024px only one pane shows. `true` shows the detail (with a Back button), `false` shows the list. From 1024px
   * both panes are always visible side by side.
   */
  detailOpen: boolean
  onBack: () => void
  backLabel?: string
}

/**
 * Master/detail workspace for admin screens (CMS sections, media, stories, rounds) (FE-14). Mobile-first: a single column
 * that swaps list and detail, with a 44px Back button; desktop: list (one third) and detail (two thirds), each scrolling
 * on its own. The hidden pane is `hidden` (not just off-screen), so it leaves the tab order and the accessibility tree.
 */
export function SplitWorkspace({
  list,
  detail,
  listLabel,
  detailLabel,
  detailOpen,
  onBack,
  backLabel = 'Back to list',
}: SplitWorkspaceProps) {
  return (
    <div className="grid gap-6 lg:grid-cols-3 lg:items-start">
      <section
        aria-label={listLabel}
        className={`min-w-0 lg:sticky lg:top-0 lg:col-span-1 lg:block lg:max-h-dvh lg:overflow-y-auto ${detailOpen ? 'hidden' : 'block'}`}
      >
        {list}
      </section>
      <section aria-label={detailLabel} className={`min-w-0 lg:col-span-2 lg:block ${detailOpen ? 'block' : 'hidden'}`}>
        <div className="mb-4 lg:hidden">
          <Button variant="secondary" icon={<ChevronLeft />} onClick={onBack}>
            {backLabel}
          </Button>
        </div>
        {detail}
      </section>
    </div>
  )
}
