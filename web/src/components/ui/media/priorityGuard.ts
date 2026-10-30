// One `priority` image per page (ARCH-001 13.3, 14: the LCP image only). More than one eager, preloaded image competes
// with the real LCP element and defeats `priority`. This is a development and test guard, not a runtime restriction:
// ResponsiveImage registers each mounted priority image here and logs when a second one is live at the same time.
// It runs in effects only, so it never executes on the server and cannot leak between requests. A client navigation
// unmounts the previous page's image before the next page's effect runs, so the count is per page.

const live = new Set<string>()

export const PRIORITY_GUARD_MESSAGE =
  'ResponsiveImage: more than one `priority` image is mounted. Only the single LCP image of a page may be priority ' +
  '(ARCH-001 13.3). Remove `priority` from the others.'

/** Registers a mounted priority image. Returns the cleanup that unregisters it. */
export function trackPriorityImage(id: string): () => void {
  live.add(id)
  if (live.size > 1 && process.env.NODE_ENV !== 'production') console.error(PRIORITY_GUARD_MESSAGE)
  return () => {
    live.delete(id)
  }
}

export function livePriorityImageCount(): number {
  return live.size
}

/** Test helper: forget every registration. */
export function resetPriorityGuard(): void {
  live.clear()
}
