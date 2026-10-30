'use client'

import { Button } from '@/components/ui/Button'
import { ArrowRight } from '@/components/ui/icons/ArrowRight'
import { ChevronLeft } from '@/components/ui/icons/ChevronLeft'

interface StepFooterProps {
  canBack: boolean
  isLast: boolean
  busy: boolean
  /** Phone only: opens the full-screen preview sheet. */
  onPreview: () => void
  onBack: () => void
  onContinue: () => void
}

/**
 * Inline back / continue row, rendered inside the step panel (not sticky).
 * Continue validates the current step only; isLast hides Continue for the final step.
 */
export function StepFooter({ canBack, isLast, busy, onPreview, onBack, onContinue }: StepFooterProps) {
  return (
    <div className="mt-6 flex items-center justify-between gap-3 border-t border-line-admin pt-4">
      <Button
        variant="secondary"
        size="md"
        icon={<ChevronLeft />}
        disabled={!canBack}
        onClick={canBack ? onBack : undefined}
      >
        Back
      </Button>
      <div className="flex items-center gap-3">
        {/* Preview available on small screens where the step list is hidden */}
        <div className="sm:hidden">
          <Button variant="ghost" size="md" onClick={onPreview}>
            Preview
          </Button>
        </div>
        {isLast ? null : (
          <Button
            size="md"
            icon={<ArrowRight />}
            iconPosition="end"
            loading={busy}
            loadingLabel="Checking this step"
            onClick={onContinue}
          >
            Continue
          </Button>
        )}
      </div>
    </div>
  )
}
