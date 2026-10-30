'use client'

import { useEffect } from 'react'
import { Button } from '@/components/ui/Button'
import { Eyebrow } from '@/components/ui/Eyebrow'
import { Heading } from '@/components/ui/Heading'

const TITLE_ID = 'not-found-title'

/**
 * The designed 404 (FEAT-001 screen 12, F-PUB-013, reference `.not-found`): centred eyebrow, a large display h1
 * ("Wrong board."), one friendly line and the two ways on: Play (primary) and Home. Landmarks are the caller's job:
 * the root not-found adds its own skip link and <main>.
 *
 * Client only for focus (TASK-049 AC): on mount, focus moves to the h1 so keyboard and screen-reader users land on the
 * message after a client navigation to an unknown URL ((public) has no RouteFocus). `tabIndex=-1` keeps it out of the
 * tab order. The HTTP 404 status is set by Next before streaming, not here.
 */
export function NotFoundView() {
  useEffect(() => {
    const heading = document.getElementById(TITLE_ID)
    if (heading === null) return
    heading.setAttribute('tabindex', '-1')
    heading.focus({ preventScroll: true })
  }, [])

  return (
    <div className="shell flex flex-col items-center py-24 text-center sm:py-32">
      <Eyebrow>404 · Page not found</Eyebrow>
      <Heading level={1} size="hero" id={TITLE_ID} className="mt-3 mb-6 outline-none">
        Wrong board.
      </Heading>
      <p className="max-w-prose text-xl wrap-break-word text-muted">
        The page moved, finished, or never existed. Find your next game, or head back to the start.
      </p>
      <div className="mt-8 flex w-full flex-col justify-center gap-3 xs:w-auto xs:flex-row">
        <Button href="/play" variant="primary" size="lg">
          Find a game
        </Button>
        <Button href="/" variant="secondary" size="lg">
          Back to home
        </Button>
      </div>
    </div>
  )
}
