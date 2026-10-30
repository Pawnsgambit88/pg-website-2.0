import { Heading } from '@/components/ui/Heading'
import type { ContentBlock } from '@/lib/api/types/content-blocks'

interface StoryHeadingBlockProps {
  block: Extract<ContentBlock, { type: 'heading' }>
}

/** Body heading: h2 or h3 from the block (the page h1 is the story title). Text only. */
export function StoryHeadingBlock({ block }: StoryHeadingBlockProps) {
  return (
    <Heading level={block.level} size={block.level === 2 ? 'panel' : 'card'} className="mt-6">
      {block.text}
    </Heading>
  )
}
