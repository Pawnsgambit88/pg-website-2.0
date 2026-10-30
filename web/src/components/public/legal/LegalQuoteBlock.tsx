import type { ContentBlock } from '@/lib/api/types/content-blocks'

/** Pull quote: copper rule on the left, display font; the attribution is a caption. Text only. */
export function LegalQuoteBlock({ block }: { block: Extract<ContentBlock, { type: 'quote' }> }) {
  return (
    <figure className="my-8 max-w-prose border-l-2 border-copper pl-6">
      <blockquote className="font-display text-2xl leading-snug wrap-break-word text-ink">
        <p>{block.text}</p>
      </blockquote>
      {block.attribution === undefined ? null : (
        <figcaption className="mt-3 font-mono text-label text-muted">{block.attribution}</figcaption>
      )}
    </figure>
  )
}
