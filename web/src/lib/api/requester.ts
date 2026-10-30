import type { z } from 'zod'
import type { LegacyPageHint } from '@/lib/api/envelope'
import type { QueryParams } from '@/lib/api/url'

// The seam between the PgApi adapter (adapters/real.ts) and the two transports (server/fetch.ts, browser/client.ts).
// The adapter describes WHAT to call (method, relative path, query, body, schema); a transport decides HOW (base URL,
// credentials, caching, refresh). Types only: no runtime code, no directive, importable from both sides.

export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'

export interface RequestSpec {
  method: HttpMethod
  /** Relative route path under the API base, for example `/events/open-night`. Built with `seg()` from `lib/api/url`. */
  path: string
  /** camelCase keys are sent snake_case. Empty values are skipped. */
  query?: QueryParams | undefined
  /** JSON body. Intent only: the browser never sends price, amount, currency, user id or role (AC-35). */
  body?: unknown
  /** `Idempotency-Key`, created by the caller when the user's intent started. Never generated or retried here. */
  idempotencyKey?: string | undefined
  /** The caller's cancel signal (TanStack Query supplies one). An abort is never surfaced as an error. */
  signal?: AbortSignal | undefined
  /** Request paging, used only to shape a legacy DRF page into `Page<T>`. */
  legacyPage?: LegacyPageHint | undefined

  // ----- browser transport only -----
  /** Attach the in-memory access token and join the single-flight 401 refresh. Default false. */
  auth?: boolean | undefined
  /** An explicit bearer for this one call (the step-up endpoint itself). Disables the refresh path. */
  bearer?: string | undefined
  /**
   * A single-use step-up grant for a sensitive admin call. Sent as `X-Step-Up-Token`; the access token stays the
   * Authorization bearer (use with `auth: true`; ENDPOINTS-IMPLEMENTED D1).
   */
  stepUpToken?: string | undefined
  /** Extra non-credential headers, such as `X-CSRF-Token`. `Authorization` is rejected. */
  headers?: Readonly<Record<string, string>> | undefined

  // ----- server transport only -----
  /** Next data-cache tags (`lib/revalidate` / `tags.ts`). */
  tags?: readonly string[] | undefined
  /** Seconds. `0` means no-store. Omitted: Next's default for the route. */
  revalidate?: number | undefined
}

export interface ApiRequester {
  /** Sends the request and resolves the payload validated by `schema`. */
  json: <S extends z.ZodType>(spec: RequestSpec, schema: S) => Promise<z.output<S>>
  /** For 202/204 style calls that return nothing the app uses. A non-2xx still throws. */
  empty: (spec: RequestSpec) => Promise<void>
}
