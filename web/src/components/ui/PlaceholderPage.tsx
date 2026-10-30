import { routeById, type RouteId } from '@/lib/routes/routes'

/**
 * Thin stand-in for a page that a later task builds (TASK-013 skeleton). Shows the page name and route pattern only.
 * Remove the usage when the real page lands; nothing else depends on it.
 */
export function PlaceholderPage({ routeId }: { routeId: RouteId }) {
  const route = routeById(routeId)
  return (
    <div className="shell py-12">
      <h1 className="font-display text-page-intro">{route.name}</h1>
      <p className="mt-4 font-mono text-label text-muted">
        <code>{route.pattern}</code>
      </p>
      <p className="mt-2 text-muted">Placeholder. The real page arrives with its feature task.</p>
    </div>
  )
}
