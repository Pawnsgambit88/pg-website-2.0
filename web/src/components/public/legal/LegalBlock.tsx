import { LegalHeadingBlock } from '@/components/public/legal/LegalHeadingBlock'
import { LegalImageBlock } from '@/components/public/legal/LegalImageBlock'
import { LegalLinkBlock } from '@/components/public/legal/LegalLinkBlock'
import { LegalListBlock } from '@/components/public/legal/LegalListBlock'
import { LegalParagraphBlock } from '@/components/public/legal/LegalParagraphBlock'
import { LegalQuoteBlock } from '@/components/public/legal/LegalQuoteBlock'
import type { ContentBlock } from '@/lib/api/types/content-blocks'

interface LegalBlockProps {
  block: ContentBlock
  /** Heading anchor id (headings only). */
  id: string | undefined
}

/**
 * Renders one block of the closed content model (content-blocks.ts). The switch is exhaustive: a new block type is a
 * compile error here, never a silent raw render. No block uses HTML injection; every string is a text child.
 */
export function LegalBlock({ block, id }: LegalBlockProps) {
  switch (block.type) {
    case 'heading':
      return <LegalHeadingBlock block={block} id={id} />
    case 'paragraph':
      return <LegalParagraphBlock block={block} />
    case 'quote':
      return <LegalQuoteBlock block={block} />
    case 'list':
      return <LegalListBlock block={block} />
    case 'link':
      return <LegalLinkBlock block={block} />
    case 'image':
      return <LegalImageBlock block={block} />
    default: {
      const unknownBlock: never = block
      return unknownBlock
    }
  }
}
