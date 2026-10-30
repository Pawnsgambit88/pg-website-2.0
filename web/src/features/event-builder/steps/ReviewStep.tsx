'use client'

import { ReviewActions } from '@/features/event-builder/review/ReviewActions'
import { ReviewSummary } from '@/features/event-builder/review/ReviewSummary'
import { SeoPreview } from '@/features/event-builder/review/SeoPreview'

// Builder step 8 (FE-29): read-only recap, SEO preview and the publish controls. The publish blockers (each linking back
// to the step to fix) are rendered above every step by the layout (BlockersPanel).

export function ReviewStep() {
  return (
    <div className="grid min-w-0 gap-8">
      <ReviewSummary />
      <SeoPreview />
      <ReviewActions />
    </div>
  )
}
