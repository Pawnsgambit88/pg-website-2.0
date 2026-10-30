// Page and group metadata for the route skeleton (TASK-013). Pure, no directive.
import type { Metadata } from 'next'
import { routeById, type RouteId } from './routes.ts'

/** Group layouts of the client groups and `(handoff)` (ARCH-001 17.4). The `X-Robots-Tag` header is added by TASK-120. */
export const NOINDEX_METADATA: Metadata = { robots: { index: false, follow: false } }

/** `(public)` layout: overrides the root default, which is noindex so a forgotten group fails safe. */
export const INDEX_METADATA: Metadata = { robots: { index: true, follow: true } }

/** Placeholder page title from the registry. Real pages replace it with their own `generateMetadata`. */
export function routeMetadata(id: RouteId): Metadata {
  return { title: routeById(id).name }
}
