import { StoryHeadingBlock } from '@/components/public/stories/StoryHeadingBlock'
import { StoryImageBlock } from '@/components/public/stories/StoryImageBlock'
import { StoryLinkBlock } from '@/components/public/stories/StoryLinkBlock'
import { StoryListBlock } from '@/components/public/stories/StoryListBlock'
import { StoryParagraphBlock } from '@/components/public/stories/StoryParagraphBlock'
import { StoryQuoteBlock } from '@/components/public/stories/StoryQuoteBlock'
import type { ContentBlock } from '@/lib/api/types/content-blocks'

interface StoryBlockProps {
  block: ContentBlock
}

/**
 * Closed block model dispatcher (FEAT-001 OQ-01, ARCH-001 17.1): one component per block type, text rendered as text.
 * An unknown type (a contract change that reached the browser before this code) renders nothing rather than guessing.
 */
export function StoryBlock({ block }: StoryBlockProps) {
  switch (block.type) {
    case 'heading':
      return <StoryHeadingBlock block={block} />
    case 'paragraph':
      return <StoryParagraphBlock block={block} />
    case 'quote':
      return <StoryQuoteBlock block={block} />
    case 'image':
      return <StoryImageBlock block={block} />
    case 'list':
      return <StoryListBlock block={block} />
    case 'link':
      return <StoryLinkBlock block={block} />
    default:
      return null
  }
}
