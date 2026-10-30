import type { z } from 'zod'
import { ApiError } from '@/lib/api/errors'
import type { AuthFailureReason, ErrorCode } from '@/lib/api/types/error-codes'

// Errors the mock auth backend answers with, shaped like the contract (backend contract 2.2, 2.4): stable code, HTTP
// status, field errors as `{ field: [message] }`. Messages are plain English for `fieldErrorsFrom`; they never echo the
// submitted value, a token or a password.

export function authRequired(reason?: AuthFailureReason): ApiError {
  return new ApiError('AUTH_REQUIRED', { status: 401, reason })
}

export function invalidCredentials(): ApiError {
  return new ApiError('INVALID_CREDENTIALS', { status: 401 })
}

export function rateLimited(retryAfterSec: number): ApiError {
  return new ApiError('RATE_LIMITED', { status: 429, retryAfter: retryAfterSec })
}

export function fieldFailure(code: ErrorCode, status: number, fields: Record<string, string[]>): ApiError {
  return new ApiError(code, { status, fields })
}

type Issue = z.core.$ZodIssue

function messageFor(issue: Issue): string {
  switch (issue.code) {
    case 'invalid_type':
      return 'This is required.'
    case 'too_small':
      return Number(issue.minimum) <= 1 ? 'This is required.' : `Use at least ${String(issue.minimum)} characters.`
    case 'too_big':
      return `Use at most ${String(issue.maximum)} characters.`
    case 'invalid_format':
      return issue.format === 'email' ? 'Enter a valid email address.' : 'Check the format of this field.'
    case 'invalid_value':
      return 'Choose one of the listed options.'
    default:
      return 'Check this field.'
  }
}

/** zod failure to VALIDATION_FAILED (400). A key the endpoint does not accept is reported under its own name. */
export function validationFailed(error: z.ZodError): ApiError {
  const fields: Record<string, string[]> = {}
  const add = (field: string, message: string) => {
    const list = (fields[field] ??= [])
    if (!list.includes(message)) list.push(message)
  }
  for (const issue of error.issues) {
    if (issue.code === 'unrecognized_keys') {
      for (const key of issue.keys) add(key, 'This field cannot be changed here.')
      continue
    }
    const head = issue.path[0]
    add(typeof head === 'string' ? head : 'form', messageFor(issue))
  }
  return fieldFailure('VALIDATION_FAILED', 400, fields)
}

/** Parses a request body like the server would: VALIDATION_FAILED with field errors on mismatch. */
export function parseInput<S extends z.ZodType>(schema: S, input: unknown): z.output<S> {
  const result = schema.safeParse(input)
  if (!result.success) throw validationFailed(result.error)
  return result.data
}
