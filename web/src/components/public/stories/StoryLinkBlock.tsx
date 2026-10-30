import type { Route } from 'next'
import { Text } from '@/components/ui/Text'
import { TextLink } from '@/components/ui/TextLink'
import { ArrowRight } from '@/components/ui/icons/ArrowRight'
import { classifyHref } from '@/components/ui/linkHref'
import type { ContentBlock } from '@/lib/api/types/content-blocks'

interface StoryLinkBlockProps {
  block: Extract<ContentBlock, { type: 'link' }>
}

/**
 * Stand-alone link. Only http(s), mailto, tel and same-origin site paths become links (the contract schema already
 * enforces this; `classifyHref` re-checks at render). Anything else is shown as plain text, never as an inert link.
 */
export function StoryLinkBlock({ block }: StoryLinkBlockProps) {
  const href = block.href as Route
  if (classifyHref(href) === 'unsafe') {
    return <Text tone="inherit">{block.label}</Text>
  }
  return (
    <p>
      <TextLink href={href} icon={<ArrowRight size="sm" className="self-center" />}>
        {block.label}
      </TextLink>
    </p>
  )
}
