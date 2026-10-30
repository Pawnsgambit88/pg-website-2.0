import type { Route } from 'next'

// Typed hrefs for data-driven paths (typedRoutes cannot verify a template string). Segments are encoded.

export const eventRoomHref = (eventId: string): Route => `/app/events/${encodeURIComponent(eventId)}` as Route
export const publicEventHref = (slug: string): Route => `/events/${encodeURIComponent(slug)}` as Route
export const registerHref = (slug: string): Route => `/events/${encodeURIComponent(slug)}/register` as Route
