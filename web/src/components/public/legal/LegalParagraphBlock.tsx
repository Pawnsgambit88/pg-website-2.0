import { Text } from '@/components/ui/Text'
import type { ContentBlock } from '@/lib/api/types/content-blocks'

/**
 * Body paragraph (reference `.legal-body p`: readable measure, relaxed leading). Ink-soft on parchment (8.6:1) for long
 * reading. The text is a React text child, so markup in the data stays inert (AC-102).
 */
export function LegalParagraphBlock({ block }: { block: Extract<ContentBlock, { type: 'paragraph' }> }) {
  return (
    <Text tone="inherit" className="mb-4 max-w-prose leading-relaxed whitespace-pre-line text-ink-soft">
      {block.text}
    </Text>
  )
}
