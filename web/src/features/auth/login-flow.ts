'use client'

import { z } from 'zod'
import { copyFor, type ErrorCopy } from '@/lib/api/error-copy'
import { isApiError } from '@/lib/api/errors'
import type { MeDto } from '@/lib/api/types/auth'
import { safeReturnTo } from '@/components/ui/feedback/safeReturnTo'

// Pure pieces of the login flow (TASK-050; ARCH-001 12.4): the form schema with human messages, where to go after a
// successful sign-in, and how a failure becomes copy. Kept out of LoginForm.tsx so the component stays declarative.

/**
 * Mirrors `loginInputSchema` (lib/api/types/auth.ts: email, password 1 to 128) with field messages written for people.
 * The server stays the authority: it answers INVALID_CREDENTIALS or VALIDATION_FAILED.
 */
export const loginFormSchema = z.object({
  email: z
    .string()
    .trim()
    .min(1, { error: 'Enter your email address.' })
    .max(254, { error: 'That email address is too long.' })
    .pipe(z.email({ error: 'Enter an email address like name@example.com.' })),
  password: z
    .string()
    .min(1, { error: 'Enter your password.' })
    .max(128, { error: 'Passwords are at most 128 characters.' }),
})
export type LoginFormInput = z.input<typeof loginFormSchema>
export type LoginFormValues = z.output<typeof loginFormSchema>

export const LOGIN_FIELDS = ['email', 'password'] as const satisfies readonly (keyof LoginFormInput)[]

export const LOGIN_FIELD_LABELS: Readonly<Record<(typeof LOGIN_FIELDS)[number], string>> = {
  email: 'Email',
  password: 'Password',
}

function isAdminPath(path: string): boolean {
  return path === '/admin' || path.startsWith('/admin/') || path.startsWith('/admin?')
}

/**
 * Where a successful sign-in goes. Order:
 *  1. the return-to intent recorded when the previous session ended (`login()` result, single use),
 *  2. the `?returnTo=` query value,
 *  3. the role landing: `/admin` for admins, `/app` for players.
 * Every candidate passes `safeReturnTo` (same-site path only, never the auth screens). A player is never sent to an
 * `/admin` path (it would only show the permission state). A player whose onboarding is not done goes to `/welcome`
 * first, carrying the chosen target as `?returnTo=` so the welcome screen can continue there (ARCH-001 12.4).
 */
export function loginDestination(user: MeDto, intent: string | undefined, queryReturnTo: string | undefined): string {
  const isAdmin = user.role === 'admin'
  const target = [intent, queryReturnTo]
    .map((candidate) => safeReturnTo(candidate))
    .find((candidate): candidate is string => candidate !== undefined && (isAdmin || !isAdminPath(candidate)))

  if (!isAdmin && !user.onboardingDone) {
    return target === undefined ? '/welcome' : `/welcome?returnTo=${encodeURIComponent(target)}`
  }
  return target ?? (isAdmin ? '/admin' : '/app')
}

/** Upper bound for the client-side lock after RATE_LIMITED, whatever `retryAfter` says. */
const MAX_LOCK_SECONDS = 15 * 60

/** Seconds to keep the submit locked after a rate-limit answer, or `undefined` when the error is not a rate limit. */
export function rateLimitSeconds(error: unknown): number | undefined {
  if (!isApiError(error) || (error.code !== 'RATE_LIMITED' && error.code !== 'HTTP_429')) return undefined
  if (error.retryAfter === undefined || error.retryAfter <= 0) return undefined
  return Math.min(error.retryAfter, MAX_LOCK_SECONDS)
}

/**
 * Copy for a failed sign-in. Anything that could tell "no such account" apart from "wrong password" (INVALID_CREDENTIALS,
 * a bare 401, AUTH_REQUIRED, a 404 or NOT_FOUND from a backend that answers that way) gets the same neutral
 * INVALID_CREDENTIALS sentence, so the screen never discloses whether an email is registered. RATE_LIMITED carries the
 * wait (`describeWait` inside `copyFor`); network, timeout and 5xx say the details are kept and a retry is safe.
 */
export function loginErrorCopy(error: unknown): ErrorCopy {
  if (isCredentialsError(error)) return copyFor({ code: 'INVALID_CREDENTIALS' })
  return copyFor(error, { action: 'log you in' })
}

/** True for every answer that must read as "email and password don't match" (see `loginErrorCopy`). */
export function isCredentialsError(error: unknown): boolean {
  if (!isApiError(error)) return false
  return (
    error.code === 'INVALID_CREDENTIALS' ||
    error.code === 'AUTH_REQUIRED' ||
    error.code === 'NOT_FOUND' ||
    error.status === 401 ||
    error.status === 404
  )
}
