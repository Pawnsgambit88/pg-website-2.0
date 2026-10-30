// Pure helpers for the Carousel (TASK-033). No React, safe in server and client modules.

/** WCAG 2.2.2 comfort floor: an automatic slide never changes faster than this, whatever the CMS interval says. */
export const MIN_AUTOPLAY_INTERVAL_MS = 5000

export function clampAutoplayInterval(intervalMs: number): number {
  return Number.isFinite(intervalMs) ? Math.max(MIN_AUTOPLAY_INTERVAL_MS, intervalMs) : MIN_AUTOPLAY_INTERVAL_MS
}

/** Wraps `index` into 0..count-1 (previous from the first slide goes to the last). */
export function wrapIndex(index: number, count: number): number {
  if (count <= 0) return 0
  return ((index % count) + count) % count
}

/** Slide index nearest to a scroll position, for full-width slides. Works for RTL (negative scrollLeft) too. */
export function indexFromScroll(scrollLeft: number, slideWidth: number, count: number): number {
  if (slideWidth <= 0 || count <= 0) return 0
  return Math.min(count - 1, Math.max(0, Math.round(Math.abs(scrollLeft) / slideWidth)))
}
