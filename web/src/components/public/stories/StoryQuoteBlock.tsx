import type { ContentBlock } from '@/lib/api/types/content-blocks'

interface StoryQuoteBlockProps {
  block: Extract<ContentBlock, { type: 'quote' }>
}

/** Pull quote: display font with a copper rule, optional attribution in mono. Text only. */
export function StoryQuoteBlock({ block }: StoryQuoteBlockProps) {
  return (
    <figure className="my-4 border-l-2 border-copper pl-4 sm:pl-6">
      <blockquote className="font-display text-2xl leading-snug wrap-break-word text-ink sm:text-3xl">
        <p>{block.text}</p>
      </blockquote>
      {block.attribution === undefined ? null : (
        <figcaption className="mt-3 font-mono text-eyebrow wrap-break-word text-muted uppercase">
          {block.attribution}
        </figcaption>
      )}
    </figure>
  )
}
