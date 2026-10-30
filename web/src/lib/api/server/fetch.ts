import 'server-only'
import type { z } from 'zod'
import { envServer } from '@/lib/env/env.server'
import { ApiError } from '@/lib/api/errors'
import { sendRequest, type FetchLike } from '@/lib/api/http'
import type { ApiRequester, RequestSpec } from '@/lib/api/requester'
import type { QueryParams } from '@/lib/api/url'
import { resolveApiUrl } from '@/lib/api/url'

// Server fetch for the public data layer (ARCH-001 11.5, 7.6; TASK-014). Used by `lib/data/public/*` (TASK-111) through
// getPublicApi(). Rules:
//   - stateless: no module-level mutable state, no cookies(), no headers(), no connection() (DoD-P); the module can run
//     during `next build` prerender and under ISR;
//   - public data only: never reads or forwards cookies, tokens or user headers, never sends `Authorization`;
//   - URL from API_INTERNAL_URL (the Railway origin) + `/api`, built from a relative path only (F-16);
//   - Next data cache: `next: { tags, revalidate }`. `revalidate: 0` is `cache: 'no-store'` (Next ignores both together);
//   - 10 s timeout. A failure THROWS ApiError so ISR keeps the previous good page (section 7.6); this layer never turns an
//     error into empty data. A 404 on a slug read is turned into `null` by the adapter, not here.

export const SERVER_REQUEST_TIMEOUT_MS = 10_000
/** The Railway API serves under /api (the same prefix the rewrite forwards to, ARCH-001 12.7). */
export const SERVER_API_PREFIX = '/api'

export const PREVIEW_KEY_HEADER = 'X-Preview-Key'

const MAX_TAGS = 128
const MAX_TAG_LENGTH = 256

export interface ServerGetOptions<S extends z.ZodType> {
  /** Next data-cache tags from `lib/revalidate` / `tags.ts`. */
  tags?: readonly string[] | undefined
  /** Seconds. `0` is no-store. Omitted: Next's default for the route. */
  revalidate?: number | undefined
  schema: S
  query?: QueryParams | undefined
  signal?: AbortSignal | undefined
  legacyPage?: RequestSpec['legacyPage']
  /** Draft preview only: the opaque key sent as `X-Preview-Key`. Such a request is private: never cached, never tagged. */
  previewKey?: string | undefined
  /** Test seam. */
  fetchImpl?: FetchLike
  /** Test seam. Default: `API_INTERNAL_URL`. */
  origin?: string
}

function apiOrigin(override: string | undefined): string {
  const origin = override ?? envServer.API_INTERNAL_URL
  if (origin === undefined) {
    // Mock builds do not set it and never reach this module (getPublicApi picks the mock). A real build fails env parsing.
    throw new Error('API_INTERNAL_URL is not configured.')
  }
  return origin
}

function checkedTags(tags: readonly string[] | undefined): string[] | undefined {
  if (tags === undefined || tags.length === 0) return undefined
  if (tags.length > MAX_TAGS || tags.some((tag) => tag.length === 0 || tag.length > MAX_TAG_LENGTH)) {
    throw new Error('Invalid cache tags.')
  }
  return [...tags]
}

function checkedRevalidate(revalidate: number | undefined): number | undefined {
  if (revalidate === undefined) return undefined
  if (!Number.isInteger(revalidate) || revalidate < 0) throw new Error('Invalid revalidate value.')
  return revalidate
}

/** `GET {API_INTERNAL_URL}/api{path}` validated by `schema`. Throws ApiError on any failure. */
export async function serverGet<S extends z.ZodType>(path: string, options: ServerGetOptions<S>): Promise<z.output<S>> {
  const url = resolveApiUrl({
    origin: apiOrigin(options.origin),
    basePath: SERVER_API_PREFIX,
    path,
    query: options.query,
  })
  const previewing = options.previewKey !== undefined
  // A draft response is per-visitor: no tags and no data cache, whatever the caller asked for.
  const tags = previewing ? undefined : checkedTags(options.tags)
  const revalidate = previewing ? 0 : checkedRevalidate(options.revalidate)

  const init: RequestInit = {
    method: 'GET',
    headers: {
      Accept: 'application/json',
      ...(options.previewKey === undefined ? {} : { [PREVIEW_KEY_HEADER]: options.previewKey }),
    },
    credentials: 'omit',
    redirect: 'error',
    ...(revalidate === 0
      ? { cache: 'no-store' as const, ...(tags === undefined ? {} : { next: { tags } }) }
      : { next: { ...(tags === undefined ? {} : { tags }), ...(revalidate === undefined ? {} : { revalidate }) } }),
  }

  const result = await sendRequest<z.output<S>>({
    url: url.toString(),
    init,
    signal: options.signal,
    timeoutMs: SERVER_REQUEST_TIMEOUT_MS,
    schema: options.schema,
    legacyPage: options.legacyPage,
    fetchImpl: options.fetchImpl,
  })
  return result.data
}

/** The server-side `ApiRequester`: GET only, no credentials. A mutation or an `auth` request is a programmer error. */
export function createServerRequester(base: { fetchImpl?: FetchLike; origin?: string } = {}): ApiRequester {
  const guard = (spec: RequestSpec): void => {
    const keys = spec.headers === undefined ? [] : Object.keys(spec.headers)
    const onlyPreviewHeader = keys.length === 0 || (keys.length === 1 && keys[0] === PREVIEW_KEY_HEADER)
    if (spec.method !== 'GET' || spec.auth === true || spec.bearer !== undefined || !onlyPreviewHeader) {
      // Server rendering is public and read-only (ARCH-001 11.1). Mutations and tokens exist only in the browser.
      throw new ApiError('MOCK_SERVER_MUTATION', { status: 0 })
    }
  }
  return {
    json: (spec, schema) => {
      guard(spec)
      return serverGet(spec.path, {
        schema,
        tags: spec.tags,
        revalidate: spec.revalidate,
        query: spec.query,
        signal: spec.signal,
        legacyPage: spec.legacyPage,
        previewKey: spec.headers?.[PREVIEW_KEY_HEADER],
        ...base,
      })
    },
    empty: () => {
      throw new ApiError('MOCK_SERVER_MUTATION', { status: 0 })
    },
  }
}
