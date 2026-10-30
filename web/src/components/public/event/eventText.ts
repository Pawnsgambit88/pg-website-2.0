import type { Route } from 'next'

// Small pure text helpers for the event detail sections (TASK-043, TASK-044). No directive.

/** Plain text split on blank lines into paragraphs; whitespace-only parts are dropped. */
export function paragraphs(text: string | null | undefined): string[] {
  if (text === null || text === undefined) return []
  return text
    .split(/\n\s*\n/)
    .map((part) => part.trim())
    .filter((part) => part !== '')
}

/** True when the string has visible text. */
export function hasText(value: string | null | undefined): value is string {
  return typeof value === 'string' && value.trim() !== ''
}

/** Half-point score: 8 gives "8", 7.5 gives "7.5". */
export function scoreText(score: number): string {
  return Number.isInteger(score) ? String(score) : score.toFixed(1)
}

/** Public detail path of an event. Slugs are validated by the DTO schema. */
export function eventPath(slug: string): Route {
  return `/events/${encodeURIComponent(slug)}` as Route
}

/** Registration route of an event (the (auth) group handles sign-in and return-to). */
export function registerPath(slug: string): Route {
  return `/events/${encodeURIComponent(slug)}/register` as Route
}
