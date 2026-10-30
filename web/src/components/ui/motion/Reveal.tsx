'use client'

import { useLayoutEffect, useRef, type ElementType, type HTMLAttributes, type Ref } from 'react'
import { observeReveal } from '@/lib/motion/revealObserver'

export type RevealTag =
  'div' | 'section' | 'article' | 'aside' | 'header' | 'footer' | 'figure' | 'li' | 'p' | 'span' | 'blockquote'

/** Stagger step 0 to 4 (each step is a theme-derived delay, see `reveal-delay-*` in utilities.css). */
export type RevealDelay = 0 | 1 | 2 | 3 | 4

// Full class names so Tailwind's source scan generates them.
const DELAY_CLASS: Record<RevealDelay, string> = {
  0: '',
  1: 'reveal-delay-1',
  2: 'reveal-delay-2',
  3: 'reveal-delay-3',
  4: 'reveal-delay-4',
}

export interface RevealProps extends HTMLAttributes<HTMLElement> {
  /** Element to render. Default `div`. */
  as?: RevealTag
  /** Stagger step for siblings revealed together. Default 0. */
  delay?: RevealDelay
  /** Reveal one time (default). `false` re-arms when the element scrolls back out through the bottom edge. */
  once?: boolean
}

/**
 * Editorial fade-and-rise when a below-the-fold block first scrolls into view (500 to 800 ms, opacity and transform only).
 *
 * Server HTML is fully visible: this component renders the same markup on the server and the client and never puts
 * `data-reveal` in it. After hydration a layout effect hands the node to the shared observer
 * (`lib/motion/revealObserver.ts`), which hides only nodes that start below the viewport and reveals them on entry.
 * Above-the-fold content (hero, LCP) is never hidden. No-JS, crawlers, reduced motion and browsers without
 * `IntersectionObserver` all see the content immediately. Do not wrap the LCP element for animation; do not nest Reveals.
 */
export function Reveal({ as = 'div', delay = 0, once = true, className, children, ...rest }: RevealProps) {
  const ref = useRef<HTMLElement>(null)
  // The `as` union makes the ref type an intersection TypeScript cannot satisfy; every tag in RevealTag is an HTMLElement.
  const Tag = as as ElementType<HTMLAttributes<HTMLElement> & { ref?: Ref<HTMLElement> }>

  useLayoutEffect(() => {
    const element = ref.current
    if (element === null) return undefined
    return observeReveal(element, { once })
  }, [once])

  const classes = ['reveal', DELAY_CLASS[delay], className].filter(Boolean).join(' ')

  return (
    <Tag {...rest} ref={ref} className={classes}>
      {children}
    </Tag>
  )
}
