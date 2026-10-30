import { EmptyState } from '@/components/ui/feedback/EmptyState'

/**
 * Shown instead of a 500 when a previewer opens a draft that does not yet satisfy the public event schema (empty
 * headline, time control, dates). Draft mode only; published reads never reach this. Server Component.
 */
export function IncompleteDraftState() {
  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-12">
      <EmptyState title="This draft is incomplete" headingLevel={1}>
        Some required details are still missing, so the preview cannot be shown yet. Finish the remaining steps in the
        event builder and open the preview again.
      </EmptyState>
    </div>
  )
}
