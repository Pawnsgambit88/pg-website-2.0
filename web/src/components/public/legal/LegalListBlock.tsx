import type { ContentBlock } from '@/lib/api/types/content-blocks'

/** Bulleted or numbered list with native markers (screen readers announce the count). Items are text only. */
export function LegalListBlock({ block }: { block: Extract<ContentBlock, { type: 'list' }> }) {
  const Tag = block.ordered ? 'ol' : 'ul'
  return (
    <Tag
      className={`mb-4 flex max-w-prose flex-col gap-2 pl-6 text-body leading-relaxed text-ink-soft ${block.ordered ? 'list-decimal' : 'list-disc'}`}
    >
      {block.items.map((item, index) => (
        // Items have no id and the list is static per render, so the position is a stable key.
        <li key={index} className="pl-1 wrap-break-word">
          {item}
        </li>
      ))}
    </Tag>
  )
}
