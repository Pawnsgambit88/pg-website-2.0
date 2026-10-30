// URL building for the API layer (ARCH-001 11.6; SEC-001 F-16). Pure: no browser or Node globals except `URL`.
// The rules, enforced here so both entries share them:
//   - requests are built ONLY from a relative path that starts with one `/` and a fixed base path (`/api`);
//   - an absolute URL, a scheme, `//`, `\`, a query or fragment inside the path, dot segments and encoded slashes/dots are
//     rejected (a backend-supplied `next` link or redirect can never become a request, so a bearer token cannot be steered
//     to another host);
//   - the final URL must have the expected origin AND stay under the base path, or building throws.
// Errors thrown here are programmer errors (a bad route definition), not API failures, and never echo the input.

export type QueryValue = string | number | boolean | null | undefined
export type QueryParams = Readonly<Record<string, QueryValue>>

const BASE_PATH = /^(?:\/[A-Za-z0-9._~-]+)+$/
const PATH = /^\/[A-Za-z0-9._~%/-]*$/
const ENCODED_DANGER = /%(?:2e|2f|5c|00)/i
const QUERY_KEY = /^[a-z][A-Za-z0-9]{0,39}$/

/** Encodes one path segment (a slug, a UUID, a pool name). Never put a `/` in a segment. */
export function seg(value: string): string {
  return encodeURIComponent(value)
}

export function isSafeApiPath(path: string): boolean {
  if (!PATH.test(path) || path.length > 512 || path.includes('//') || ENCODED_DANGER.test(path)) return false
  return !path.split('/').some((segment) => segment === '.' || segment === '..')
}

function toSnakeCase(key: string): string {
  return key.replace(/[A-Z]/g, (letter) => `_${letter.toLowerCase()}`)
}

export interface ApiUrlParts {
  /** Origin the request is allowed to reach: `location.origin` in the browser, the origin of `API_INTERNAL_URL` on the server. */
  origin: string
  /** Fixed prefix such as `/api`. */
  basePath: string
  /** Relative route path such as `/events/open-night`. */
  path: string
  /** camelCase keys are sent snake_case (`pageSize` becomes `page_size`). Empty values are skipped. Keys are sorted. */
  query?: QueryParams | undefined
}

/** Builds the request URL or throws `Error('Invalid API URL')`. */
export function resolveApiUrl(parts: ApiUrlParts): URL {
  const { origin, basePath, path, query } = parts
  if (!BASE_PATH.test(basePath) || !isSafeApiPath(path)) throw new Error('Invalid API URL')
  let url: URL
  let expected: string
  try {
    expected = new URL(origin).origin
    url = new URL(`${basePath}${path}`, expected)
  } catch {
    throw new Error('Invalid API URL')
  }
  if (url.origin !== expected || !(url.pathname === basePath || url.pathname.startsWith(`${basePath}/`))) {
    throw new Error('Invalid API URL')
  }
  if (query !== undefined) {
    for (const key of Object.keys(query).sort()) {
      const value = query[key]
      if (value === undefined || value === null || value === '') continue
      if (!QUERY_KEY.test(key)) throw new Error('Invalid API URL')
      url.searchParams.set(toSnakeCase(key), String(value))
    }
  }
  return url
}

/** The bearer-token gate (F-16): true only when the resolved request origin equals the page origin. */
export function isSameOrigin(url: URL, origin: string): boolean {
  try {
    return url.origin === new URL(origin).origin
  } catch {
    return false
  }
}
