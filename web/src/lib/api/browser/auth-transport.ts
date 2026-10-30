'use client'

import {
  authFailureReasonSchema,
  isKnownErrorCode,
  type AuthFailureReason,
  type ErrorCode,
} from '@/lib/api/types/error-codes'

// The minimal fetch seam for the token module (TASK-125). The full browser client (TASK-014) supplies the real
// implementation: it builds the URL from NEXT_PUBLIC_API_BASE_URL, unwraps the envelope, enforces the same-origin rule
// for Authorization (ARCH-001 11.6, F-16) and never logs bodies or headers. Tests inject a fake.
// The token module itself never calls fetch, never builds URLs and never reads query strings.

export type AuthPath = '/auth/refresh' | '/auth/logout' | '/auth/step-up'

export interface AuthRequest {
  method: 'POST'
  path: AuthPath
  /** JSON body; undefined means no body (cookie-mode refresh and logout). */
  body?: Record<string, string>
  /** Extra headers, such as `X-CSRF-Token`. Never contains the Authorization header: use `bearer`. */
  headers?: Record<string, string>
  /** Access token the transport should send as `Authorization: Bearer` (same-origin only). */
  bearer?: string
  /** Cookie mode needs the browser to send the httpOnly cookie: the transport uses `credentials: 'same-origin'`. */
  withCredentials: boolean
}

/** Envelope already unwrapped. `data` is the success payload; failures carry the stable error code and optional reason. */
export type AuthResponse =
  { ok: true; data: unknown } | { ok: false; status: number; code: string; reason?: string | undefined }

/** Rejects only for transport failures (offline, timeout, abort). Business failures resolve with `ok: false`. */
export type AuthTransport = (request: AuthRequest) => Promise<AuthResponse>

export type TokenErrorCode = ErrorCode

/**
 * The only error this module throws. The message is a fixed string per code: it never contains a token, a password, a
 * URL or a server-supplied detail (ARCH-001 17.1, AC-34). `reason` is a closed enum, not free text.
 */
export class TokenError extends Error {
  readonly code: TokenErrorCode
  readonly status: number
  readonly reason: AuthFailureReason | undefined

  constructor(code: TokenErrorCode, status: number, reason?: AuthFailureReason) {
    super(`Auth failure: ${code}`)
    this.name = 'TokenError'
    this.code = code
    this.status = status
    this.reason = reason
  }
}

const STATUS_CODES: Readonly<Record<number, ErrorCode>> = {
  400: 'HTTP_400',
  401: 'HTTP_401',
  403: 'HTTP_403',
  404: 'HTTP_404',
  429: 'HTTP_429',
}

function codeFromStatus(status: number): ErrorCode {
  return STATUS_CODES[status] ?? (status >= 500 ? 'HTTP_5XX' : 'BAD_RESPONSE')
}

/** Builds a TokenError from a failed response. Only the code, status and the closed reason enum are kept. */
export function tokenErrorFromResponse(response: Extract<AuthResponse, { ok: false }>): TokenError {
  const code = isKnownErrorCode(response.code) ? response.code : codeFromStatus(response.status)
  const reason = authFailureReasonSchema.safeParse(response.reason)
  return new TokenError(code, response.status, reason.success ? reason.data : undefined)
}
