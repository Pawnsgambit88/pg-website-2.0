import Link from 'next/link'
import type { ComponentProps, ReactNode } from 'react'
import { PrefetchLink } from '@/components/ui/PrefetchLink'
import { VisuallyHidden } from '@/components/ui/VisuallyHidden'
import { classifyHref, isWebUrl, type LinkHref } from '@/components/ui/linkHref'

type AnchorAria = Pick<ComponentProps<'a'>, 'id' | 'aria-describedby' | 'aria-label' | 'aria-current'>

export interface ActionLinkProps extends AnchorAria {
  href: LinkHref
  /** Final class list (Button and TextLink own the look; this component owns the element choice and link safety). */
  className: string
  children: ReactNode
  /** Open in a new tab: adds `target="_blank"`, `rel="noopener noreferrer"` and a screen-reader hint. */
  newTab?: boolean
  /** Prefetch only on hover or focus (PrefetchLink, client). Default is plain `next/link`. Internal paths only. */
  prefetchOnIntent?: boolean
  /** Render a non-navigating placeholder (a disabled action). The anchor keeps its look but has no href. */
  inert?: boolean
}

const NEW_TAB_HINT = ' (opens in a new tab)'

/**
 * The one place that decides how an `href` becomes an element, shared by Button and TextLink (Server Component):
 *  - site path, query or hash        `next/link` (or PrefetchLink when `prefetchOnIntent`)
 *  - http(s), mailto, tel            plain `<a>`; web URLs get `rel="noopener noreferrer"`
 *  - anything else (`javascript:`, `data:`, `//host`, empty) or `inert`   `<a role="link" aria-disabled>` without href
 * So a link from CMS data can never become a script URL (rules/40-frontend.mdc Security).
 */
export function ActionLink({
  href,
  className,
  children,
  newTab = false,
  prefetchOnIntent = false,
  inert = false,
  ...aria
}: ActionLinkProps) {
  const kind = inert ? 'unsafe' : classifyHref(href)

  if (kind === 'unsafe') {
    // Focusable like a disabled button, so the reason text linked by aria-describedby can be reached by keyboard.
    return (
      <a role="link" aria-disabled="true" tabIndex={0} className={className} {...aria}>
        {children}
      </a>
    )
  }

  // Spread, not inline props: target and rel are decided here once for every branch.
  const newTabProps = newTab ? ({ target: '_blank', rel: 'noopener noreferrer' } as const) : {}
  const hint = newTab ? <VisuallyHidden>{NEW_TAB_HINT}</VisuallyHidden> : null

  if (kind === 'external' && typeof href === 'string') {
    // Every web URL gets noopener noreferrer, even in the same tab; mailto and tel need no rel.
    const relProps = isWebUrl(href) ? ({ rel: 'noopener noreferrer' } as const) : {}
    return (
      <a href={href} className={className} {...relProps} {...newTabProps} {...aria}>
        {children}
        {hint}
      </a>
    )
  }

  const Component = prefetchOnIntent ? PrefetchLink : Link
  return (
    <Component href={href} className={className} {...newTabProps} {...aria}>
      {children}
      {hint}
    </Component>
  )
}
