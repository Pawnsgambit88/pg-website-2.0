'use client'

import { getStepUp } from '@/lib/api/browser/client'
import type { PasswordPrompt } from '@/lib/api/browser/step-up'
import { isStepUpRequired } from '@/lib/api/browser/step-up'
import { ApiError } from '@/lib/api/errors'
import { stepUpTokenSchema, type StepUpToken } from '@/lib/api/types/admin/common'

// Bridge between the step-up helper (step-up.ts, no UI) and the dialog (AdminShell mounts `StepUpPrompt`, which registers
// itself here). Two ways to use it:
//   - conditional step-up (event update, event cancel, registration actions): the admin adapter wraps the call in
//     `getStepUp().withStepUp(..., promptForPassword)` and the server decides whether a grant is needed;
//   - required step-up (refund, role change, audit export): the API method needs a token in `opts.stepUp`. Call
//     `withStepUpToken((token) => api.payments.refund(id, input, key, { stepUp: token }))`.
// The password lives only inside the dialog and the step-up request. Nothing here stores or logs it or a token.

let handler: PasswordPrompt | null = null

/** Registers the dialog. Returns the unregister function (use as an effect cleanup). */
export function registerPasswordPrompt(next: PasswordPrompt): () => void {
  handler = next
  return () => {
    if (handler === next) handler = null
  }
}

/** Resolves the password, or `null` when the admin cancels or no dialog is mounted. */
export const promptForPassword: PasswordPrompt = () => (handler === null ? Promise.resolve(null) : handler())

async function obtainToken(): Promise<StepUpToken> {
  const stepUp = getStepUp()
  let grant = stepUp.getGrant()
  if (grant === null) {
    const password = await promptForPassword()
    if (password === null) throw new ApiError('STEP_UP_REQUIRED', { status: 401 })
    grant = await stepUp.authenticate(password)
  }
  stepUp.clear() // single use: this grant goes to exactly one call
  return stepUpTokenSchema.parse(grant.token)
}

/**
 * Gets a fresh step-up token (asking for the password when none is held) and runs `action` with it. If the server still
 * answers STEP_UP_REQUIRED (token expired or used), asks once more and retries once. A cancelled prompt rejects with
 * ApiError(STEP_UP_REQUIRED).
 */
export async function withStepUpToken<T>(action: (token: StepUpToken) => Promise<T>): Promise<T> {
  try {
    return await action(await obtainToken())
  } catch (error) {
    if (!isStepUpRequired(error)) throw error
    return action(await obtainToken())
  }
}
