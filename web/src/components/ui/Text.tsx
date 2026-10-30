import type { ReactNode } from 'react'
import { cn } from '@/lib/cn'

/**
 * Paragraph variants.
 *  body   17px UI font (reference body copy)
 *  lead   editorial intro paragraph: display font, 1.5rem to 1.875rem, 65ch measure
 *  small  0.875rem helper copy (reference .microcopy)
 */
export type TextVariant = 'body' | 'lead' | 'small'

/**
 * Colour. `auto` (default) is muted for body and small copy (4.85 on parchment) and the inherited ink for `lead`.
 * `inherit` takes the parent colour: use it on sand (muted fails AA there, 4.17). `on-dark` is parchment-muted
 * (6.59 on forest) for `Section tone="forest"`.
 */
export type TextTone = 'auto' | 'muted' | 'inherit' | 'on-dark'

const VARIANT_CLASS: Record<TextVariant, string> = {
  body: 'text-body',
  lead: 'font-display text-2xl leading-snug sm:text-3xl max-w-prose',
  small: 'text-sm',
}

const TONE_CLASS: Record<Exclude<TextTone, 'auto'>, string> = {
  muted: 'text-muted',
  inherit: '',
  'on-dark': 'text-parchment-muted',
}

interface TextProps {
  as?: 'p' | 'span' | 'div'
  variant?: TextVariant
  tone?: TextTone
  id?: string
  /** Layout additions only (margin, max width). */
  className?: string
  children: ReactNode
}

/** Body, lead and small copy. Long words wrap so a 320px column never scrolls sideways. */
export function Text({ as: Tag = 'p', variant = 'body', tone = 'auto', id, className, children }: TextProps) {
  const resolved = tone === 'auto' ? (variant === 'lead' ? 'inherit' : 'muted') : tone
  return (
    <Tag id={id} className={cn(VARIANT_CLASS[variant], TONE_CLASS[resolved], 'wrap-break-word', className)}>
      {children}
    </Tag>
  )
}
