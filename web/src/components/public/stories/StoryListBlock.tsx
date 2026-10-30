import type { ContentBlock } from '@/lib/api/types/content-blocks'
import { cn } from '@/lib/cn'

interface StoryListBlockProps {
  block: Extract<ContentBlock, { type: 'list' }>
}

/** Ordered or bulleted list of plain-text items. */
export function StoryListBlock({ block }: StoryListBlockProps) {
  const Tag = block.ordered ? 'ol' : 'ul'
  return (
    <Tag
      className={cn(
        'flex flex-col gap-2 pl-6 text-body text-ink-soft marker:text-copper-dark',
        block.ordered ? 'list-decimal' : 'list-disc',
      )}
    >
      {block.items.map((item, index) => (
        <li key={`${index}-${item}`} className="wrap-break-word">
          {item}
        </li>
      ))}
    </Tag>
  )
}
