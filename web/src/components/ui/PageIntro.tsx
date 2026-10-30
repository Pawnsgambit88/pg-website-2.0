import type { ReactNode } from 'react'
import { Eyebrow } from '@/components/ui/Eyebrow'
import { Heading } from '@/components/ui/Heading'
import { Text } from '@/components/ui/Text'
import { cn } from '@/lib/cn'

interface PageIntroProps {
  /** Mono label above the title (page job or area, for example "Player" or "Operations"). */
  eyebrow?: string
  /** The page `h1`. One per page. */
  title: ReactNode
  /** One or two sentences of context. */
  description?: ReactNode
  /** Primary and secondary actions (an `ActionRow` or a single Button). Below the text on mobile, right of it from `md`. */
  actions?: ReactNode
  /** `signed-in` for player pages, `admin` for operations pages (a wider description measure, as in `.admin-hero`). */
  variant?: 'signed-in' | 'admin'
  /** Id for the h1, so a region can use `aria-labelledby`. */
  titleId?: string
  className?: string
}

/**
 * Signed-in and admin page introduction (COMPONENT-CATALOG `PageIntro`, reference `.page-intro` and `.admin-hero`):
 * eyebrow, h1, short description and actions. Stacks below 960px; from `md` the text sits left and the actions are
 * bottom-aligned on the right. Public inner pages use their own hero, not this component.
 */
export function PageIntro({
  eyebrow,
  title,
  description,
  actions,
  variant = 'signed-in',
  titleId,
  className,
}: PageIntroProps) {
  return (
    <header
      className={cn('flex min-w-0 flex-col gap-6 md:flex-row md:items-end md:justify-between md:gap-12', className)}
    >
      <div className="min-w-0">
        {eyebrow !== undefined ? <Eyebrow>{eyebrow}</Eyebrow> : null}
        <Heading level={1} size="page-intro" id={titleId} className="mt-2 mb-3 max-w-3xl">
          {title}
        </Heading>
        {description !== undefined ? (
          <Text className={variant === 'admin' ? 'max-w-2xl' : 'max-w-xl'}>{description}</Text>
        ) : null}
      </div>
      {actions !== undefined ? <div className="shrink-0">{actions}</div> : null}
    </header>
  )
}
