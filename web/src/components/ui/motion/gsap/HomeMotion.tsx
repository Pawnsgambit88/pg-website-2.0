'use client'

import { useEffect } from 'react'
// Type-only: erased at compile time, so the route's static import graph never contains gsap (DEC-029 constraint 3).
import type { gsap as Gsap } from 'gsap'
import { readMotionTokens, type MotionTokens } from './motionTokens'

/**
 * Home motion island (HOME-09, DEC-029). Side effect only: renders `null`, takes no children and no props, so no server
 * content is wrapped in a client boundary.
 *
 * Server components mark their own elements with `data-motion="reveal"` (fade and rise) or `data-motion="scale"` (subtle
 * settle of an inner image inside an `overflow:hidden` aspect box), optionally with `data-motion-index="n"` for stagger.
 * The server HTML is the finished page; this island only enhances it:
 *
 *   1. Reduced motion first: unless `(prefers-reduced-motion: no-preference)` matches (and IntersectionObserver
 *      exists), nothing happens and the gsap chunk is never requested.
 *   2. Off the critical path: waits for `load`, then for idle (`requestIdleCallback`, `setTimeout` fallback), then
 *      `import('gsap')` (core only, no plugins). A failed chunk leaves everything visible.
 *   3. First viewport is never touched: only elements that start below the first viewport AND are below the current
 *      viewport at setup get a start state, so nothing the user can see (hero, LCP) ever gets `opacity: 0`.
 *   4. One IntersectionObserver for all targets; each animates in once (transform and opacity only, tokens from
 *      theme.css), `will-change` only during the tween, inline styles cleared on completion.
 *   5. `gsap.matchMedia()` owns everything: a live switch to reduced motion reverts all start states and tweens, and
 *      unmount calls `revert()` (StrictMode double effect safe).
 *
 * Elements owned by `Reveal` (`data-reveal`) are skipped, so CSS and GSAP never animate one node. Mount only on routes
 * in the DEC-029 allow-list (`motionAllowedRoutes` in budgets.json).
 */

const MOTION_ALLOWED = '(prefers-reduced-motion: no-preference)'
const SELECTOR = '[data-motion="reveal"], [data-motion="scale"]'
/** Same entry edge as the CSS Reveal observer (lib/motion/revealObserver.ts). */
const ROOT_MARGIN = '0px 0px -8% 0px'
/** Idle wait cap, so motion still arrives on a busy main thread. */
const IDLE_TIMEOUT_MS = 2000
/** DEC-029: at most 12 nodes tweened together; the stagger index is clamped to the same bound. */
const MAX_STAGGER_INDEX = 11
/** Inline styles gsap wrote; cleared on completion so the node returns to its server-rendered styling. */
const CLEAR_PROPS = 'opacity,transform'

type MotionKind = 'reveal' | 'scale'

function whenLoadedAndIdle(run: () => void): () => void {
  let idleHandle: number | null = null
  let timeoutHandle: ReturnType<typeof setTimeout> | null = null

  const scheduleIdle = () => {
    if (typeof window.requestIdleCallback === 'function') {
      idleHandle = window.requestIdleCallback(run, { timeout: IDLE_TIMEOUT_MS })
    } else {
      timeoutHandle = setTimeout(run, 1)
    }
  }

  if (document.readyState === 'complete') scheduleIdle()
  else window.addEventListener('load', scheduleIdle, { once: true })

  return () => {
    window.removeEventListener('load', scheduleIdle)
    if (idleHandle !== null && typeof window.cancelIdleCallback === 'function') window.cancelIdleCallback(idleHandle)
    if (timeoutHandle !== null) clearTimeout(timeoutHandle)
  }
}

function staggerIndex(element: HTMLElement): number {
  const raw = Number.parseInt(element.dataset.motionIndex ?? '', 10)
  if (!Number.isFinite(raw) || raw < 0) return 0
  return Math.min(raw, MAX_STAGGER_INDEX)
}

/**
 * Below the first viewport (document position) and below the current viewport (nothing on screen, and nothing the user
 * already scrolled past). Anything else is never touched.
 */
function isSafeToHide(element: HTMLElement, firstViewportHeight: number): boolean {
  const top = element.getBoundingClientRect().top
  return top >= window.innerHeight && top + window.scrollY >= firstViewportHeight
}

/**
 * Runs inside the `gsap.matchMedia()` context: every `set` and tween created here (or in `contextSafe` callbacks) is
 * reverted with the context. Returns the cleanup gsap calls on revert.
 */
function startMotion(
  gsap: typeof Gsap,
  contextSafe: (func: () => void) => () => void,
  tokens: MotionTokens,
  firstViewportHeight: number,
  revealed: WeakSet<Element>,
): () => void {
  const targets = new Map<Element, MotionKind>()

  for (const element of document.querySelectorAll<HTMLElement>(SELECTOR)) {
    if (revealed.has(element) || element.hasAttribute('data-reveal')) continue
    if (!isSafeToHide(element, firstViewportHeight)) continue
    const kind: MotionKind = element.dataset.motion === 'scale' ? 'scale' : 'reveal'
    targets.set(element, kind)
  }
  if (targets.size === 0) return () => undefined

  let observer: IntersectionObserver | null = null
  const animating = new Set<HTMLElement>()

  const animate = (element: HTMLElement, kind: MotionKind) =>
    contextSafe(() => {
      animating.add(element)
      const vars = kind === 'scale' ? { scale: 1 } : { opacity: 1, y: 0 }
      gsap.to(element, {
        ...vars,
        duration: kind === 'scale' ? tokens.durationSlow : tokens.duration,
        delay: staggerIndex(element) * tokens.staggerStep,
        ease: tokens.ease,
        overwrite: 'auto',
        onStart: () => {
          element.style.willChange = kind === 'scale' ? 'transform' : 'transform, opacity'
        },
        onComplete: () => {
          animating.delete(element)
          revealed.add(element)
          element.style.removeProperty('will-change')
          gsap.set(element, { clearProps: CLEAR_PROPS })
        },
      })
    })()

  const onEntries = (entries: IntersectionObserverEntry[]) => {
    for (const entry of entries) {
      if (!entry.isIntersecting) continue
      const kind = targets.get(entry.target)
      observer?.unobserve(entry.target)
      targets.delete(entry.target)
      if (kind !== undefined) animate(entry.target as HTMLElement, kind)
    }
    if (targets.size === 0) {
      observer?.disconnect()
      observer = null
    }
  }

  try {
    observer = new IntersectionObserver(onEntries, { rootMargin: ROOT_MARGIN, threshold: 0 })
  } catch {
    // No observer: set nothing, so nothing can stay hidden.
    return () => undefined
  }

  for (const [element, kind] of targets) {
    // Start state: off-screen nodes only, so the change is never seen. Opacity is never touched for `scale`.
    if (kind === 'scale') gsap.set(element, { scale: tokens.scaleFrom })
    else gsap.set(element, { opacity: 0, y: tokens.distance })
    observer.observe(element)
  }

  return () => {
    observer?.disconnect()
    observer = null
    targets.clear()
    // Tweens and start states are reverted by gsap; `will-change` was written directly, so drop it here.
    for (const element of animating) element.style.removeProperty('will-change')
    animating.clear()
  }
}

export function HomeMotion(): null {
  useEffect(() => {
    if (typeof window.matchMedia !== 'function' || !window.matchMedia(MOTION_ALLOWED).matches) return undefined
    if (typeof window.IntersectionObserver !== 'function') return undefined

    const firstViewportHeight = window.innerHeight
    const revealed = new WeakSet<Element>()
    let cancelled = false
    let media: ReturnType<typeof Gsap.matchMedia> | null = null

    const cancelIdle = whenLoadedAndIdle(() => {
      import('gsap')
        .then(({ gsap }) => {
          if (cancelled) return
          // Re-check: the preference may have changed while waiting for idle.
          if (!window.matchMedia(MOTION_ALLOWED).matches) return
          const tokens = readMotionTokens(document.documentElement)
          media = gsap.matchMedia()
          media.add(MOTION_ALLOWED, (_context, contextSafe) =>
            startMotion(
              gsap,
              (func) => (contextSafe === undefined ? func : (contextSafe(func) as () => void)),
              tokens,
              firstViewportHeight,
              revealed,
            ),
          )
        })
        .catch(() => {
          // Chunk failed to load or setup threw: undo anything partial; the server HTML is already complete.
          media?.revert()
          media = null
        })
    })

    return () => {
      cancelled = true
      cancelIdle()
      media?.revert()
      media = null
    }
  }, [])

  return null
}
