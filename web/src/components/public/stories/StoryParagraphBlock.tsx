import { Text } from '@/components/ui/Text'
import type { ContentBlock } from '@/lib/api/types/content-blocks'

interface StoryParagraphBlockProps {
  block: Extract<ContentBlock, { type: 'paragraph' }>
}

/** Body paragraph. Rendered as a React text node, so any markup in the CMS text stays inert characters. */
export function StoryParagraphBlock({ block }: StoryParagraphBlockProps) {
  return (
    <Text tone="inherit" className="text-ink-soft">
      {block.text}
    </Text>
  )
}
