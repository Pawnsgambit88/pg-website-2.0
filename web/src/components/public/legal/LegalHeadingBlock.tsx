import { Heading } from '@/components/ui/Heading'
import type { ContentBlock } from '@/lib/api/types/content-blocks'

interface LegalHeadingBlockProps {
  block: Extract<ContentBlock, { type: 'heading' }>
  /** Anchor id from legal-outline.ts (table of contents target). */
  id: string | undefined
}

/**
 * Section heading (reference `.legal-copy h2`: display font, about 2rem). Level 2 or 3 only (the page owns the h1), so
 * the outline never skips. `scroll-mt-24` keeps the target clear of the 72px sticky header. Text only.
 */
export function LegalHeadingBlock({ block, id }: LegalHeadingBlockProps) {
  return block.level === 2 ? (
    <Heading level={2} size="panel" id={id} className="mt-12 mb-4 max-w-prose scroll-mt-24 first:mt-0">
      {block.text}
    </Heading>
  ) : (
    <Heading level={3} size="card" id={id} className="mt-8 mb-3 max-w-prose scroll-mt-24 first:mt-0">
      {block.text}
    </Heading>
  )
}
