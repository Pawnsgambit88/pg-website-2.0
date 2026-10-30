import type { ReactNode } from 'react'
import { ActionLink } from '@/components/ui/ActionLink'
import { ExternalLink } from '@/components/ui/icons/ExternalLink'
import type { LinkHref } from '@/components/ui/linkHref'
import { cn } from '@/lib/cn'

interface TextLinkProps {
  /** Site path, or an absolute http(s), mailto or tel URL. Anything else renders as an inert placeholder. */
  href: LinkHref
  /**
   * Link on a forest surface: copper-soft text (5.50:1 on forest). Not needed inside `Section tone="forest"` or
   * `Surface tone="forest"`, which switch it automatically.
   */
  tone?: 'default' | 'on-dark'
  /** Opens in a new tab: adds `target="_blank"`, `rel="noopener noreferrer"`, the external icon and a screen-reader hint. */
  newTab?: boolean
  /** Prefetch only on hover or focus (footer, long lists). Loads a small client island. */
  prefetchOnIntent?: boolean
  /**
   * Link inside a sentence: drops the 44px `tap` hit area, which would overlap the neighbouring words (WCAG 2.5.8 inline
   * exception). Leave off for a link on its own line.
   */
  inline?: boolean
  /** Icon element from components/ui/icons placed after the text, e.g. `<ArrowRight size="sm" />`. */
  icon?: ReactNode
  'aria-current'?: 'page' | undefined
  'aria-label'?: string
  'aria-describedby'?: string
  id?: string
  /** Layout additions only (margin, alignment). */
  className?: string
  children: ReactNode
}

/**
 * Underlined text link (reference `.text-link`: 1px underline, 0.86rem). Colour is copper-dark (5.56:1 on parchment,
 * 6.01 on parchment-soft, 4.78 on sand), never `copper` (3.55). The underline is always on, so a link is never colour
 * alone; hover thickens it. External web links get `rel="noopener noreferrer"`. In running text the link is exempt from
 * the 44px target rule (WCAG 2.5.8 inline exception); a link on its own line gets `tap`, which grows the hit area
 * without changing the layout (`inline` turns it off). Server Component.
 */
export function TextLink({
  href,
  tone = 'default',
  newTab = false,
  prefetchOnIntent,
  inline = false,
  icon,
  className,
  children,
  ...aria
}: TextLinkProps) {
  return (
    <ActionLink
      href={href}
      newTab={newTab}
      prefetchOnIntent={prefetchOnIntent}
      className={cn(
        !inline && 'tap',
        'inline-flex max-w-full items-baseline gap-1 text-sm wrap-break-word underline decoration-1 underline-offset-4',
        'hover:decoration-2',
        tone === 'on-dark' ? 'text-copper-soft' : 'text-copper-dark in-data-[surface=dark]:text-copper-soft',
        className,
      )}
      id={aria.id}
      aria-current={aria['aria-current']}
      aria-label={aria['aria-label']}
      aria-describedby={aria['aria-describedby']}
    >
      {children}
      {newTab ? <ExternalLink size="sm" className="self-center" /> : icon}
    </ActionLink>
  )
}
