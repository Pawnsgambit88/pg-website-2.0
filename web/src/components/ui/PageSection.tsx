import type { ReactNode } from 'react'
import { Eyebrow } from '@/components/ui/Eyebrow'
import { Heading } from '@/components/ui/Heading'

interface PageSectionProps {
  /** Unique id; the h2 becomes `${id}-title` and names the region. */
  id: string
  eyebrow: string
  title: string
  /** Optional action on the right of the heading from `sm` (a text link). */
  action?: ReactNode
  children: ReactNode
}

/** One labelled block of a player page: mono eyebrow, h2, content. Server Component. */
export function PageSection({ id, eyebrow, title, action, children }: PageSectionProps) {
  const titleId = `${id}-title`
  return (
    <section aria-labelledby={titleId} className="flex min-w-0 flex-col gap-4">
      <div className="flex min-w-0 flex-col gap-1 sm:flex-row sm:items-end sm:justify-between sm:gap-6">
        <div className="min-w-0">
          <Eyebrow>{eyebrow}</Eyebrow>
          <Heading level={2} size="panel" id={titleId} className="mt-1">
            {title}
          </Heading>
        </div>
        {action === undefined ? null : <div className="shrink-0">{action}</div>}
      </div>
      {children}
    </section>
  )
}
