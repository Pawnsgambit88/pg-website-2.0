/**
 * Shared reveal-on-scroll observer (TASK-035, ARCH-001 13.5). Framework-free: no React, no module-level browser access.
 *
 * One `IntersectionObserver` serves every `Reveal` on the page (RBP client-event-listeners): created lazily on the first
 * registration, disconnected and dropped when the last target goes away.
 *
 * NO-FLICKER CONTRACT (RBP rendering-hydration-no-flicker, adapted):
 *   1. The server HTML never carries `data-reveal`, so content is visible without JavaScript, to crawlers and in the
 *      first paint of the hydrating page. The CSS (`reveal` utility) hides only `[data-reveal='pending']`.
 *   2. Registration runs in a layout effect after hydration. Only elements that start entirely below the viewport are set
 *      to `pending` (they are off-screen, so hiding them is invisible). Anything touching the viewport stays visible and
 *      is never observed (unless `once: false`), so an LCP or above-the-fold element is never hidden or delayed.
 *   3. The attribute is written straight to the DOM, not through React state or props. React does not own it, so there is
 *      no hydration mismatch and no re-render; opacity/transform only, so there is no layout shift.
 *   4. Anything that makes hiding unsafe falls back to "visible": no `window`, no `IntersectionObserver`, observer
 *      construction failure, or `prefers-reduced-motion: reduce` (checked at registration; the CSS also gates the hidden
 *      state, so a mid-session change to reduce un-hides pending nodes immediately).
 */

export const REVEAL_ATTRIBUTE = 'data-reveal'
export const REVEAL_PENDING = 'pending'
export const REVEAL_DONE = 'revealed'

/** Reveal starts slightly before the element is fully inside the viewport edge, so it is mostly settled when seen. */
const ROOT_MARGIN = '0px 0px -8% 0px'
const REDUCED_MOTION_QUERY = '(prefers-reduced-motion: reduce)'

export interface RevealOptions {
  /** Reveal one time (default) and stop observing. `false` re-arms the element when it leaves through the bottom edge. */
  once?: boolean
}

interface Target {
  once: boolean
}

const targets = new Map<Element, Target>()
let observer: IntersectionObserver | null = null

function canObserve(): boolean {
  return typeof window !== 'undefined' && typeof window.IntersectionObserver === 'function'
}

function prefersReducedMotion(): boolean {
  return typeof window.matchMedia === 'function' && window.matchMedia(REDUCED_MOTION_QUERY).matches
}

function release(): void {
  if (targets.size === 0 && observer !== null) {
    observer.disconnect()
    observer = null
  }
}

function onEntries(entries: IntersectionObserverEntry[]): void {
  for (const entry of entries) {
    const target = targets.get(entry.target)
    if (target === undefined) {
      observer?.unobserve(entry.target)
      continue
    }
    if (entry.isIntersecting) {
      entry.target.setAttribute(REVEAL_ATTRIBUTE, REVEAL_DONE)
      if (target.once) {
        targets.delete(entry.target)
        observer?.unobserve(entry.target)
      }
    } else if (!target.once && entry.boundingClientRect.top > 0) {
      // Left through the bottom edge (scrolled back up): arm again. Leaving through the top stays revealed.
      entry.target.setAttribute(REVEAL_ATTRIBUTE, REVEAL_PENDING)
    }
  }
  release()
}

function getObserver(): IntersectionObserver | null {
  if (observer !== null) return observer
  try {
    observer = new window.IntersectionObserver(onEntries, { rootMargin: ROOT_MARGIN, threshold: 0 })
  } catch {
    observer = null
  }
  return observer
}

/**
 * Registers `element` for a one-time reveal and returns the cleanup. Safe to call anywhere: on the server, without
 * `IntersectionObserver`, or under reduced motion it does nothing and the element simply stays visible.
 * Call from a client effect (after hydration), never during render.
 */
export function observeReveal(element: Element, options: RevealOptions = {}): () => void {
  const once = options.once ?? true
  const noop = () => undefined
  if (!canObserve() || prefersReducedMotion()) return noop

  const belowTheFold = element.getBoundingClientRect().top >= window.innerHeight
  // Above-the-fold and one-time: nothing to animate, and never touch it (LCP safety).
  if (!belowTheFold && once) return noop

  const io = getObserver()
  if (io === null) return noop

  if (belowTheFold) element.setAttribute(REVEAL_ATTRIBUTE, REVEAL_PENDING)
  targets.set(element, { once })
  io.observe(element)

  return () => {
    targets.delete(element)
    observer?.unobserve(element)
    // Never leave a node stuck hidden once nothing will reveal it (unmount, StrictMode re-run, option change).
    if (element.getAttribute(REVEAL_ATTRIBUTE) === REVEAL_PENDING) element.removeAttribute(REVEAL_ATTRIBUTE)
    release()
  }
}
