'use client'

import { Banner } from '@/components/ui/feedback/Banner'
import { Button } from '@/components/ui/Button'
import { parseBlockerField } from '@/features/event-builder/patch'
import { useBuilderSelector } from '@/features/event-builder/context'
import { useGoToStep } from '@/features/event-builder/nav-context'
import type { BuilderStep } from '@/lib/api/types/admin/event-builder'

/**
 * Publish blockers from the server's `readiness` (E03/E04). On the Review step it lists all of them; on any other step
 * only that step's. Each blocker with a known step is a deep link to it. "Ready to publish" shows on Review only.
 */
export function BlockersPanel({ step, labels }: { step: BuilderStep; labels: Readonly<Record<string, string>> }) {
  const readiness = useBuilderSelector((state) => state.server.readiness)
  const goTo = useGoToStep()
  const onReview = step === 'review'

  if (readiness.ready) {
    return onReview ? (
      <Banner tone="success" title="Ready to publish.">
        Nothing is missing. Publishing is done from the event control room.
      </Banner>
    ) : null
  }
  const shown = readiness.blockers.filter((blocker) => onReview || parseBlockerField(blocker.field).step === step)
  if (shown.length === 0) return null

  return (
    <div className="flex min-w-0 flex-col gap-2">
      <Banner tone="warning" title={onReview ? 'Not ready to publish yet.' : 'Needed before publishing.'}>
        {shown.length === 1 ? '1 item to fix.' : `${shown.length} items to fix.`}
      </Banner>
      <ul className="m-0 flex list-none flex-col gap-1 p-0 text-sm">
        {shown.map((blocker, index) => {
          const target = parseBlockerField(blocker.field).step as BuilderStep | null
          return (
            <li key={`${blocker.code}-${blocker.field ?? index}`} className="flex flex-wrap items-center gap-2">
              <span className="min-w-0 wrap-break-word">{blocker.reason}</span>
              {target !== null && target !== step ? (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    goTo(target)
                  }}
                >
                  Go to {labels[target] ?? 'step'}
                </Button>
              ) : null}
            </li>
          )
        })}
      </ul>
    </div>
  )
}
