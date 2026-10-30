import { StoryBlock } from '@/components/public/stories/StoryBlock'
import type { ContentBlock } from '@/lib/api/types/content-blocks'

interface StoryBodyProps {
  blocks: readonly ContentBlock[]
}

/**
 * Story body: the blocks in order inside a prose measure. Server Component, so the HTML is deterministic and complete
 * without JavaScript (no hydration of the body). Keys use the index: blocks have no ids and never reorder client-side.
 */
export function StoryBody({ blocks }: StoryBodyProps) {
  return (
    <div className="flex max-w-prose min-w-0 flex-col gap-5">
      {blocks.map((block, index) => (
        <StoryBlock key={`${index}-${block.type}`} block={block} />
      ))}
    </div>
  )
}
