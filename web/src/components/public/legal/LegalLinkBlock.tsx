import type { Route } from 'next'
import { TextLink } from '@/components/ui/TextLink'
import { ArrowRight } from '@/components/ui/icons/ArrowRight'
import type { ContentBlock } from '@/lib/api/types/content-blocks'

/**
 * Stand-alone link line. The href is data, so it goes through TextLink and ActionLink's policy: site paths and
 * http(s), mailto and tel only; anything else (`javascript:`, `data:`, `//host`) renders as an inert placeholder, never a
 * link. The cast only satisfies typed routes; the runtime classification decides the element.
 */
export function LegalLinkBlock({ block }: { block: Extract<ContentBlock, { type: 'link' }> }) {
  return (
    <p className="mb-4 max-w-prose">
      <TextLink href={block.href as Route} icon={<ArrowRight size="sm" className="self-center" />}>
        {block.label}
      </TextLink>
    </p>
  )
}
