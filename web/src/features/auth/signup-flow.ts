'use client'

import { z } from 'zod'
import { copyFor, type ErrorCopy } from '@/lib/api/error-copy'
import { isApiError } from '@/lib/api/errors'

// Pure pieces of the create-account flow (TASK-051, screen 14): the form schema with human messages, the visible
// password rules and how a failure becomes copy. Where to go afterwards is `loginDestination` (login-flow.ts), so the
// order is identical to Login. Kept out of SignupForm.tsx so the component stays declarative.

/**
 * Small client stand-in for the server's "too common" list (FEAT-000 OQ-13 open). Early feedback only: the server is the
 * authority and answers WEAK_PASSWORD on `fields.password` for anything it rejects.
 */
const COMMON_PASSWORDS: ReadonlySet<string> = new Set([
  'password',
  'password1',
  'password123',
  '12345678',
  '123456789',
  '1234567890',
  'qwertyui',
  'qwerty123',
  'iloveyou',
  'chess123',
  'letmein1',
])

export const PASSWORD_MIN = 8
export const PASSWORD_MAX = 128

export type PasswordRuleId = 'length' | 'common' | 'email'

export interface PasswordRule {
  id: PasswordRuleId
  label: string
}

/** Shown before submit, in this order (mirrors the server policy: length, not common, not your email). */
export const PASSWORD_RULES: readonly PasswordRule[] = [
  { id: 'length', label: `At least ${String(PASSWORD_MIN)} characters` },
  { id: 'common', label: 'Not a common or easy-to-guess password (like "password1")' },
  { id: 'email', label: 'Not the same as your email address' },
]

function isEasyToGuess(password: string): boolean {
  const lower = password.toLowerCase()
  return COMMON_PASSWORDS.has(lower) || new Set(lower).size <= 1
}

function sameAsEmail(password: string, email: string): boolean {
  const normalised = email.trim().toLowerCase()
  return normalised !== '' && password.toLowerCase() === normalised
}

/** Which rules the typed password meets. An empty password meets none (nothing to judge yet). */
export function passwordRuleStatus(password: string, email: string): Readonly<Record<PasswordRuleId, boolean>> {
  const typed = password.length > 0
  return {
    length: password.length >= PASSWORD_MIN && password.length <= PASSWORD_MAX,
    common: typed && !isEasyToGuess(password),
    email: typed && !sameAsEmail(password, email),
  }
}

/**
 * Mirrors `registerInputSchema` (lib/api/types/auth.ts: name 1 to 80, email, password 8 to 128) with messages written for
 * people, plus the visible password rules. `city` and `phone` are optional in the contract and left for the progressive
 * profile; no rating or Elo questions here.
 */
export const signupFormSchema = z
  .object({
    name: z
      .string()
      .trim()
      .min(1, { error: 'Enter your name.' })
      .max(80, { error: 'Names are at most 80 characters.' }),
    email: z
      .string()
      .trim()
      .min(1, { error: 'Enter your email address.' })
      .max(254, { error: 'That email address is too long.' })
      .pipe(z.email({ error: 'Enter an email address like name@example.com.' })),
    password: z
      .string()
      .min(1, { error: 'Choose a password.' })
      .min(PASSWORD_MIN, { error: `Use at least ${String(PASSWORD_MIN)} characters.` })
      .max(PASSWORD_MAX, { error: `Passwords are at most ${String(PASSWORD_MAX)} characters.` }),
  })
  .superRefine((values, context) => {
    if (values.password.length < PASSWORD_MIN) return
    if (isEasyToGuess(values.password)) {
      context.addIssue({
        code: 'custom',
        path: ['password'],
        message: 'That password is too easy to guess. Choose a less common one.',
      })
    } else if (sameAsEmail(values.password, values.email)) {
      context.addIssue({
        code: 'custom',
        path: ['password'],
        message: 'Use a password that is not your email address.',
      })
    }
  })
export type SignupFormInput = z.input<typeof signupFormSchema>
export type SignupFormValues = z.output<typeof signupFormSchema>

export const SIGNUP_FIELDS = ['name', 'email', 'password'] as const satisfies readonly (keyof SignupFormInput)[]

export const SIGNUP_FIELD_LABELS: Readonly<Record<(typeof SIGNUP_FIELDS)[number], string>> = {
  name: 'Name',
  email: 'Email',
  password: 'Password',
}

/** Field fallbacks when the server answers EMAIL_TAKEN or WEAK_PASSWORD without `fields`. */
export const EMAIL_TAKEN_FIELD_MESSAGE = 'An account already uses this email.'
export const WEAK_PASSWORD_FIELD_MESSAGE = 'Choose a less common password.'

export function isEmailTaken(error: unknown): boolean {
  return isApiError(error) && (error.code === 'EMAIL_TAKEN' || error.status === 409)
}

export function isWeakPassword(error: unknown): boolean {
  return isApiError(error) && error.code === 'WEAK_PASSWORD'
}

/**
 * Copy for a failed sign-up. EMAIL_TAKEN is said plainly (the register contract answers it on `fields.email`);
 * RATE_LIMITED carries the wait; network, timeout and 5xx say the details are kept and a retry is safe (a retry after an
 * account was in fact created answers EMAIL_TAKEN, whose field offers the log-in link).
 */
export function signupErrorCopy(error: unknown): ErrorCopy {
  if (isEmailTaken(error)) return copyFor({ code: 'EMAIL_TAKEN' })
  return copyFor(error, { action: 'create your account' })
}
