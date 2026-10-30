import {
  authFailureReasonSchema,
  backendErrorCodeSchema,
  type AuthFailureReason,
  type ErrorCode,
} from '@/lib/api/types/error-codes'

// ApiError: the one error the API layer throws (ARCH-001 11.7; TASK-014). Shared by the server and browser entries, so it
// has no browser or Node globals beyond DOMException (guarded) and no server-only or client-only imports.
//
// What it never holds: a token, a request body, a response body, a URL. `message` is a fixed string per code and
// `toJSON()` exposes only {code, status, requestId, retryAfter}, so a stray JSON.stringify or console.log of the error
// cannot leak `detail` (legacy backends put emails in it) or `fields`. `detail` is for diagnosis in a debugger, not for the
// user: the UI always goes through `copyFor` (error-copy.ts), never through `detail`.

export interface ApiErrorInit {
  /** HTTP status; 0 when no response arrived (network, timeout). */
  status: number
  /** Server-supplied free text. Never shown to users, never logged, never reported. */
  detail?: string | null | undefined
  /** Field-level validation messages (`{ field: [message] }`). Read them through `fieldErrorsFrom` in error-copy.ts. */
  fields?: Readonly<Record<string, readonly string[]>> | null | undefined
  requestId?: string | null | undefined
  /** Seconds, from `error.retry_after` or the `Retry-After` header. */
  retryAfter?: number | null | undefined
  /** AUTH_REQUIRED only: why the session ended. Unknown reasons are dropped. */
  reason?: string | null | undefined
  /** A backend code the frontend does not know. Kept (charset-checked) for diagnostics; `code` holds the HTTP fallback. */
  serverCode?: string | null | undefined
}

const SAFE_REQUEST_ID = /^[A-Za-z0-9._:-]{1,128}$/
const SAFE_SERVER_CODE = /^[A-Z][A-Z0-9_]{1,63}$/

/** Accepts a request id only if it is short and made of safe characters (it ends up in support messages). */
export function safeRequestId(value: string | null | undefined): string | undefined {
  return typeof value === 'string' && SAFE_REQUEST_ID.test(value) ? value : undefined
}

export class ApiError extends Error {
  readonly code: ErrorCode
  readonly status: number
  readonly detail: string | undefined
  readonly fields: Readonly<Record<string, readonly string[]>> | undefined
  readonly requestId: string | undefined
  readonly retryAfter: number | undefined
  readonly reason: AuthFailureReason | undefined
  readonly serverCode: string | undefined

  constructor(code: ErrorCode, init: ApiErrorInit) {
    super(`API error: ${code}`)
    this.name = 'ApiError'
    this.code = code
    this.status = init.status
    this.detail = init.detail ?? undefined
    this.fields = init.fields ?? undefined
    this.requestId = safeRequestId(init.requestId)
    this.retryAfter =
      typeof init.retryAfter === 'number' && Number.isFinite(init.retryAfter) && init.retryAfter >= 0
        ? Math.floor(init.retryAfter)
        : undefined
    const reason = authFailureReasonSchema.safeParse(init.reason)
    this.reason = reason.success ? reason.data : undefined
    this.serverCode =
      typeof init.serverCode === 'string' && SAFE_SERVER_CODE.test(init.serverCode) ? init.serverCode : undefined
  }

  /** The only fields safe to serialise, log or report (ARCH-001 19.4, SEC-001 F-17). */
  toJSON(): { code: ErrorCode; status: number; requestId: string | undefined; retryAfter: number | undefined } {
    return { code: this.code, status: this.status, requestId: this.requestId, retryAfter: this.retryAfter }
  }
}

export function isApiError(value: unknown): value is ApiError {
  return value instanceof ApiError
}

// ---------- abort ----------

/** A caller-initiated cancel. It is not an API failure and must never become an error state or a console message. */
export function isAbortError(value: unknown): boolean {
  return typeof value === 'object' && value !== null && (value as { name?: unknown }).name === 'AbortError'
}

export function createAbortError(): Error {
  if (typeof DOMException !== 'undefined') return new DOMException('The request was cancelled.', 'AbortError')
  const error = new Error('The request was cancelled.')
  error.name = 'AbortError'
  return error
}

// ---------- status and wire code mapping ----------

/** HTTP status to the frontend fallback code (tier B). 2xx and 3xx here mean a response we could not use. */
export function codeFromStatus(status: number): ErrorCode {
  switch (status) {
    case 0:
      return 'NETWORK'
    case 400:
      return 'HTTP_400'
    case 401:
      return 'HTTP_401'
    case 403:
      return 'HTTP_403'
    case 404:
      return 'HTTP_404'
    case 408:
      return 'TIMEOUT'
    case 429:
      return 'HTTP_429'
    default:
      if (status >= 500) return 'HTTP_5XX'
      if (status >= 400) return 'HTTP_400' // 402, 405, 409, 410, 422 ... without a known backend code: generic "check and retry"
      return 'BAD_RESPONSE'
  }
}

export interface ResolvedCode {
  code: ErrorCode
  serverCode: string | undefined
}

/**
 * A backend `error.code` becomes `ApiError.code` only when it is one the backend may emit (tiers A and C). Anything else,
 * including a tier B name the backend must not use, falls back to the HTTP status and is kept as `serverCode`.
 */
export function resolveErrorCode(wireCode: string | null | undefined, status: number): ResolvedCode {
  const known = backendErrorCodeSchema.safeParse(wireCode)
  if (known.success) return { code: known.data, serverCode: undefined }
  return {
    code: codeFromStatus(status),
    serverCode: typeof wireCode === 'string' && SAFE_SERVER_CODE.test(wireCode) ? wireCode : undefined,
  }
}
