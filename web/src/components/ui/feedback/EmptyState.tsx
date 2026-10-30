import type { ReactNode } from 'react'
import { Heading } from '@/components/ui/Heading'
import type { HeadingLevel } from '@/components/ui/headingLevel'
import { Surface } from '@/components/ui/Surface'
import { Text } from '@/components/ui/Text'

interface EmptyStateProps {
  /** Decorative glyph from components/ui/icons (`<Board size="lg" />`). Reinforces the title, never replaces it. */
  icon?: ReactNode
  /** What is empty, in plain words ("No upcoming events"). */
  title: string
  /** Why, and what happens next. Helps the player continue; it never apologises. */
  children: ReactNode
  /** Optional next step: a `Button` (link or button). One action only. */
  action?: ReactNode
  /** Semantic level of the title; required in spirit, defaults to 3 because empty states sit inside a section. */
  headingLevel?: HeadingLevel
  /** Wrap in a bordered `Surface`. Turn off when the parent already is a panel. Default true. */
  framed?: boolean
  /** Layout additions only. */
  className?: string
}

/**
 * Empty list or section (COMPONENT-CATALOG EmptyState, DoD-S): icon, title, explanatory body and an optional next
 * action. Stacks at 320 and keeps the action at least 44px tall (Button). Not a live region: it replaces a skeleton
 * in place, and the section heading above it gives context. Server Component.
 */
export function EmptyState({
  icon,
  title,
  children,
  action,
  headingLevel = 3,
  framed = true,
  className,
}: EmptyStateProps) {
  const content = (
    <div className="flex flex-col items-start gap-3">
      {icon === undefined ? null : <span className="text-copper-dark">{icon}</span>}
      <Heading level={headingLevel} size="card">
        {title}
      </Heading>
      <Text className="max-w-prose">{children}</Text>
      {action === undefined ? null : <div className="mt-1 w-full sm:w-auto">{action}</div>}
    </div>
  )
  return framed ? (
    <Surface padding="lg" className={className}>
      {content}
    </Surface>
  ) : (
    <div className={className}>{content}</div>
  )
}
