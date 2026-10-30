import { z } from 'zod'

// Stable error codes (backend contract 2.2; ARCH-001 11.7). The copy map (TASK-014) must hold a key for every code here.

/** Tier A: the 15 codes of the reference BACKEND-CONTRACT.md. */
export const TIER_A_CODES = [
  'AUTH_REQUIRED',
  'ADMIN_REQUIRED',
  'EVENT_NOT_FOUND',
  'REGISTRATION_NOT_OPEN',
  'REGISTRATION_CLOSED',
  'EVENT_FULL',
  'ALREADY_REGISTERED',
  'PAYMENT_REQUIRED',
  'PAYMENT_MISMATCH',
  'INVALID_SIGNATURE',
  'CHECKIN_WINDOW_CLOSED',
  'REGISTRATION_NOT_CONFIRMED',
  'ROUND_NOT_FOUND',
  'RESULTS_NOT_FINAL',
  'ROUND_ALREADY_FINALIZED',
] as const

/** Tier B: transport fallbacks originated by the frontend. The backend must not emit these names. */
export const TIER_B_CODES = [
  'HTTP_400',
  'HTTP_401',
  'HTTP_403',
  'HTTP_404',
  'HTTP_429',
  'HTTP_5XX',
  'NETWORK',
  'TIMEOUT',
  'BAD_RESPONSE',
  'MOCK_SERVER_MUTATION',
] as const

/**
 * Tier C: inferred additions (contract 2.2), pending owner ratification. Until ratified the frontend falls back to HTTP
 * copy, so a code missing from the copy map is not an error. STEP_UP_REQUIRED comes from contract 2.4, not the 2.2 table.
 */
export const TIER_C_CODES = [
  'VALIDATION_FAILED',
  'RATE_LIMITED',
  'INVALID_CREDENTIALS',
  'EMAIL_TAKEN',
  'WEAK_PASSWORD',
  'RESET_TOKEN_INVALID',
  'HOLD_EXPIRED',
  'SLUG_TAKEN',
  'SLUG_LOCKED',
  'VERSION_CONFLICT',
  'NOT_PUBLISHABLE',
  'ASSET_IN_USE',
  'NOT_FOUND',
  'IDEMPOTENCY_CONFLICT',
  'RESULT_NOT_ALLOWED',
  'CANCELLATION_NOT_ALLOWED',
  'STEP_UP_REQUIRED',
  // Ratified Tier C (ENDPOINTS-IMPLEMENTED D2).
  'SIGNUP_CLOSED',
  'METHOD_NOT_ALLOWED',
  'UNSUPPORTED_MEDIA_TYPE',
  'STORAGE_UNAVAILABLE',
  'INTERNAL_ERROR',
  'PAYMENT_UNAVAILABLE',
] as const

export const tierACodeSchema = z.enum(TIER_A_CODES)
export const tierBCodeSchema = z.enum(TIER_B_CODES)
export const tierCCodeSchema = z.enum(TIER_C_CODES)

/** Codes the backend may put in `error.code` (tiers A and C). */
export const backendErrorCodeSchema = z.union([tierACodeSchema, tierCCodeSchema])
/** Every code `ApiError.code` can hold on the frontend. */
export const errorCodeSchema = z.union([tierACodeSchema, tierBCodeSchema, tierCCodeSchema])

export type TierACode = z.infer<typeof tierACodeSchema>
export type TierBCode = z.infer<typeof tierBCodeSchema>
export type TierCCode = z.infer<typeof tierCCodeSchema>
export type BackendErrorCode = z.infer<typeof backendErrorCodeSchema>
export type ErrorCode = z.infer<typeof errorCodeSchema>

export const ALL_ERROR_CODES: readonly ErrorCode[] = [...TIER_A_CODES, ...TIER_B_CODES, ...TIER_C_CODES]

const KNOWN: ReadonlySet<string> = new Set(ALL_ERROR_CODES)

/** Narrowing guard for a code received over the wire. Unknown codes are legal: they get the HTTP fallback copy. */
export function isKnownErrorCode(code: string): code is ErrorCode {
  return KNOWN.has(code)
}

/** Reasons attached to AUTH_REQUIRED (contract 2.4). */
export const authFailureReasonSchema = z.enum([
  'REFRESH_REUSED',
  'SESSION_EXPIRED',
  'ROLE_CHANGED',
  'ACCOUNT_SUSPENDED',
])
export type AuthFailureReason = z.infer<typeof authFailureReasonSchema>
