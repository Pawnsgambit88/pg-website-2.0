// Resolve a concrete pathname to its registry entry, mirroring App Router precedence (static segments beat dynamic
// ones). Used by tests and by later guards (TASK-024 route allow-list). Pure, no directive.
import { patternToRegExp } from './csp-class.ts'
import { ROUTES, type RouteDef } from './routes.ts'

interface Compiled {
  readonly route: RouteDef
  readonly regexp: RegExp
  readonly segments: readonly string[]
}

const COMPILED: readonly Compiled[] = ROUTES.map((route) => ({
  route,
  regexp: patternToRegExp(route.pattern),
  segments: route.pattern.split('/').filter((segment) => segment !== ''),
}))

const isDynamicSegment = (segment: string) => segment.startsWith('[')

/** Static segments first, left to right, which is how Next orders `/admin/events/new` before `/admin/events/[id]`. */
function precedence(a: Compiled, b: Compiled): number {
  const length = Math.max(a.segments.length, b.segments.length)
  for (let i = 0; i < length; i += 1) {
    const left = a.segments[i]
    const right = b.segments[i]
    if (left === undefined || right === undefined) continue
    const leftDynamic = isDynamicSegment(left)
    const rightDynamic = isDynamicSegment(right)
    if (leftDynamic !== rightDynamic) return leftDynamic ? 1 : -1
  }
  return 0
}

/** Whether every closed-set dynamic segment (`expand`) holds an allowed value in this concrete path. */
function satisfiesExpand(candidate: Compiled, pathname: string): boolean {
  const { expand } = candidate.route
  if (expand === undefined) return true
  const parts = pathname.split('/').filter((part) => part !== '')
  return candidate.segments.every((segment, index) => {
    if (!isDynamicSegment(segment)) return true
    const allowed = expand[segment.slice(1, -1)]
    return allowed === undefined || allowed.includes(parts[index] ?? '')
  })
}

/**
 * The registry route that serves `pathname` (no query, no trailing slash), or undefined when nothing does (the
 * global not-found page answers it).
 */
export function resolveRoute(pathname: string): RouteDef | undefined {
  return COMPILED.filter(({ regexp }) => regexp.test(pathname))
    .filter((candidate) => satisfiesExpand(candidate, pathname))
    .toSorted(precedence)[0]?.route
}
