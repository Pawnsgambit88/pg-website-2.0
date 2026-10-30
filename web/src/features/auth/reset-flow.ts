'use client'

import { z } from 'zod'
import { copyFor, type ErrorCopy } from '@/lib/api/error-copy'
import { isApiError } from '@/lib/api/errors'
import {
  PASSWORD_MAX,
  PASSWORD_MIN,
  PASSWORD_RULES,
  passwordRuleStatus,
  type PasswordRuleId,
} from '@/features/auth/signup-flow'

// Pure pieces of the reset-password flow (TASK-053, screen 16): both form schemas with human messages, the token read
// and URL clean-up, and how a failure becomes copy. Kept out of the components so they stay declarative.
//
// The reset token is a credential. It is read from the address bar once, kept only in component state, sent only in the
// confirm call and never logged, rendered, put into an error, a toast or a URL.

/** The query parameter the reset email link carries. */
export const RESET_TOKEN_PARAM = 'token'
/** Upper bound of `passwordResetConfirmSchema.token` (lib/api/types/auth.ts). A longer value is not a real link. */
const TOKEN_MAX = 512

/** Where a successful reset goes. The Login page can key a notice on `?reset=done`. */
export const RESET_DONE_DESTINATION = '/login?reset=done'
export const RESET_DONE_MESSAGE = 'Your password has been changed. Log in with your new password.'

// ---------- token ----------

/** The token in a query string, or `null` when it is missing, empty or too long to be a real link. */
export function tokenFromSearch(search: string): string | null {
  const token = new URLSearchParams(search).get(RESET_TOKEN_PARAM)
  if (token === null || token === '' || token.length > TOKEN_MAX) return null
  return token
}

/** The same path, query (minus the token) and fragment, for `history.replaceState`. */
export function urlWithoutToken(href: string): string {
  const url = new URL(href)
  url.searchParams.delete(RESET_TOKEN_PARAM)
  return `${url.pathname}${url.search}${url.hash}`
}

// ---------- request mode ----------

/** Mirrors `passwordResetRequestSchema` (email) with messages written for people. */
export const resetRequestFormSchema = z.object({
  email: z
    .string()
    .trim()
    .min(1, { error: 'Enter your email address.' })
    .max(254, { error: 'That email address is too long.' })
    .pipe(z.email({ error: 'Enter an email address like name@example.com.' })),
})
export type ResetRequestFormInput = z.input<typeof resetRequestFormSchema>
export type ResetRequestFormValues = z.output<typeof resetRequestFormSchema>

export const RESET_REQUEST_FIELDS = ['email'] as const satisfies readonly (keyof ResetRequestFormInput)[]

/**
 * Answers that must read exactly like success, so the screen never tells whether an email is registered. The contract
 * answers the same neutral 200 for every email; a backend that answers 404 / NOT_FOUND for an unknown one is folded in.
 */
export function isNeutralRequestAnswer(error: unknown): boolean {
  return isApiError(error) && (error.code === 'NOT_FOUND' || error.status === 404)
}

/** RATE_LIMITED carries the wait (applies to unknown emails alike, so it reveals nothing); network and 5xx say retry. */
export function resetRequestErrorCopy(error: unknown): ErrorCopy {
  return copyFor(error, { action: 'send the reset link' })
}

// ---------- confirm mode ----------

/** The rules shown before submit. "Not your email" is left out: this screen does not know the email. */
export const RESET_PASSWORD_RULES = PASSWORD_RULES.filter((rule) => rule.id !== 'email')

export function resetRuleStatus(password: string): Readonly<Record<PasswordRuleId, boolean>> {
  return passwordRuleStatus(password, '')
}

/** Mirrors `passwordResetConfirmSchema.newPassword` (8 to 128) plus the visible rules and the confirm match. */
export const resetConfirmFormSchema = z
  .object({
    newPassword: z
      .string()
      .min(1, { error: 'Choose a new password.' })
      .min(PASSWORD_MIN, { error: `Use at least ${String(PASSWORD_MIN)} characters.` })
      .max(PASSWORD_MAX, { error: `Passwords are at most ${String(PASSWORD_MAX)} characters.` }),
    confirmPassword: z.string().min(1, { error: 'Type the new password again.' }),
  })
  .superRefine((values, context) => {
    if (values.newPassword.length >= PASSWORD_MIN && !resetRuleStatus(values.newPassword).common) {
      context.addIssue({
        code: 'custom',
        path: ['newPassword'],
        message: 'That password is too easy to guess. Choose a less common one.',
      })
    }
    if (values.confirmPassword !== '' && values.confirmPassword !== values.newPassword) {
      context.addIssue({ code: 'custom', path: ['confirmPassword'], message: 'The two passwords do not match.' })
    }
  })
export type ResetConfirmFormInput = z.input<typeof resetConfirmFormSchema>
export type ResetConfirmFormValues = z.output<typeof resetConfirmFormSchema>

export const RESET_CONFIRM_FIELDS = [
  'newPassword',
  'confirmPassword',
] as const satisfies readonly (keyof ResetConfirmFormInput)[]

export const RESET_CONFIRM_FIELD_LABELS: Readonly<Record<(typeof RESET_CONFIRM_FIELDS)[number], string>> = {
  newPassword: 'New password',
  confirmPassword: 'Confirm new password',
}

export const WEAK_NEW_PASSWORD_MESSAGE = 'Choose a less common password.'

/** Bad, used and expired links all answer RESET_TOKEN_INVALID; a validation answer on `token` means the same. */
export function isResetTokenInvalid(error: unknown): boolean {
  if (!isApiError(error)) return false
  return error.code === 'RESET_TOKEN_INVALID' || (error.fields !== undefined && 'token' in error.fields)
}

export function isWeakNewPassword(error: unknown): boolean {
  return isApiError(error) && error.code === 'WEAK_PASSWORD'
}

export function resetConfirmErrorCopy(error: unknown): ErrorCopy {
  return copyFor(error, { action: 'save your new password' })
}
