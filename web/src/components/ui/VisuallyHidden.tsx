import type { ReactNode } from 'react'

interface VisuallyHiddenProps {
  as?: 'span' | 'div' | 'p'
  id?: string
  children: ReactNode
}

/**
 * Text for assistive technology only (Tailwind `sr-only`): icon-button names, table captions, "opens in a new tab".
 * Not for hiding content that should be read by sighted users too.
 */
export function VisuallyHidden({ as: Tag = 'span', id, children }: VisuallyHiddenProps) {
  return (
    <Tag id={id} className="sr-only">
      {children}
    </Tag>
  )
}
