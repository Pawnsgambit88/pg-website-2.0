import type { Route } from 'next'

// Typed-route hrefs for this feature (features may not import each other, M4). Slugs are validated upstream by
// `parseSlug`; the encoding is a second line of defence for any caller that passes a raw string.
export const eventPageHref = (slug: string): Route => `/events/${encodeURIComponent(slug)}` as Route
export const registerPageHref = (slug: string): Route => `/events/${encodeURIComponent(slug)}/register` as Route
export const eventRoomHref = (eventId: string): Route => `/app/events/${encodeURIComponent(eventId)}` as Route
