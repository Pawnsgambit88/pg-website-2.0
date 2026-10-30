import type { ReactNode } from 'react'
import { Eyebrow } from '@/components/ui/Eyebrow'
import { Heading } from '@/components/ui/Heading'
import { Surface } from '@/components/ui/Surface'
import { Text } from '@/components/ui/Text'

/** Forest hero panel used by every room state (reference `surface--forest`): eyebrow, headline, body, extras. */
export function StatePanel({
  eyebrow,
  title,
  children,
  extra,
}: {
  eyebrow: string
  title: string
  children?: ReactNode
  extra?: ReactNode
}) {
  return (
    <Surface as="section" tone="forest" padding="lg" aria-labelledby="room-state-heading">
      <Eyebrow>{eyebrow}</Eyebrow>
      <Heading level={2} size="panel" id="room-state-heading" className="mt-2 max-w-prose">
        {title}
      </Heading>
      {children === undefined ? null : (
        <Text tone="on-dark" className="mt-3 max-w-prose">
          {children}
        </Text>
      )}
      {extra === undefined ? null : <div className="mt-4 flex flex-col gap-3">{extra}</div>}
    </Surface>
  )
}
