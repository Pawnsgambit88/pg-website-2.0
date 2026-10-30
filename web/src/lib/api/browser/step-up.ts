'use client'

import { tokenErrorFromResponse, TokenError, type AuthTransport } from '@/lib/api/browser/auth-transport'
import { stepUpResultSchema } from '@/lib/api/types/auth'

// Step-up re-authentication scaffolding (contract 2.4 "Admin session cap and step-up re-auth"; ARCH-001 12.1, 17.1).
// Flow: a sensitive call (refund, role change, export) fails with 401 STEP_UP_REQUIRED -> ask the user for their
// password -> POST /auth/step-up { password } -> a fresh access token valid for 5 minutes -> retry the original call ONCE
// with that token. The grant lives in memory only, is never persisted, logged or placed in a URL, and is dropped on
// sign-out. The password is passed straight to the transport and never kept. Not wired to any screen yet.

/** Contract: the step-up token is valid for 5 minutes. A margin avoids sending one that expires in flight. */
export const STEP_UP_TTL_MS = 5 * 60 * 1000
export const STEP_UP_MARGIN_MS = 15 * 1000

export interface StepUpGrant {
  /** Send as `X-Step-Up-Token` (`RequestSpec.stepUpToken`) on the sensitive call; the access token stays the Bearer. */
  readonly token: string
  readonly expiresAt: number
}

/** Resolves the user's password, or `null` when they cancel. The UI (a later task) renders the dialog. */
export type PasswordPrompt = () => Promise<string | null>

export interface StepUp {
  /** A cached, unexpired grant, or `null`. */
  getGrant: () => StepUpGrant | null
  /** `POST /auth/step-up`. Caches and returns the grant. Rejects with `TokenError` (never containing the password). */
  authenticate: (password: string) => Promise<StepUpGrant>
  /**
   * Runs `action(grant)`. `grant` is the cached grant or `null` on the first attempt. If the action fails with
   * `STEP_UP_REQUIRED`, prompts for the password, authenticates and retries exactly once. A cancelled prompt rethrows
   * the original error; a second `STEP_UP_REQUIRED` is rethrown (no loop). Other errors pass through untouched.
   */
  withStepUp: <T>(action: (grant: StepUpGrant | null) => Promise<T>, prompt: PasswordPrompt) => Promise<T>
  clear: () => void
}

export interface StepUpOptions {
  transport: AuthTransport
  /** The caller's current access token; the step-up endpoint is authenticated. */
  getAccessToken: () => string | null
  now?: () => number
  /** Pass `tokens.subscribe`: the grant is dropped when the session ends (logout, expiry, other tab). */
  subscribeSessionEnd?: (listener: () => void) => () => void
}

/** Duck-typed so TASK-014's `ApiError` and this module's `TokenError` both qualify without an import cycle. */
export function isStepUpRequired(error: unknown): boolean {
  return typeof error === 'object' && error !== null && (error as { code?: unknown }).code === 'STEP_UP_REQUIRED'
}

export function createStepUp(options: StepUpOptions): StepUp {
  const { transport, getAccessToken } = options
  const now = options.now ?? Date.now
  let grant: StepUpGrant | null = null
  let pending: Promise<StepUpGrant> | null = null

  function getGrant(): StepUpGrant | null {
    if (grant !== null && now() >= grant.expiresAt - STEP_UP_MARGIN_MS) grant = null
    return grant
  }

  async function authenticate(password: string): Promise<StepUpGrant> {
    const bearer = getAccessToken()
    let response
    try {
      response = await transport({
        method: 'POST',
        path: '/auth/step-up',
        body: { password },
        ...(bearer === null ? {} : { bearer }),
        withCredentials: false,
      })
    } catch {
      throw new TokenError('NETWORK', 0)
    }
    if (!response.ok) throw tokenErrorFromResponse(response)
    const parsed = stepUpResultSchema.safeParse(response.data)
    if (!parsed.success) throw new TokenError('BAD_RESPONSE', 200)
    grant = { token: parsed.data.accessToken, expiresAt: now() + STEP_UP_TTL_MS }
    return grant
  }

  async function withStepUp<T>(action: (grant: StepUpGrant | null) => Promise<T>, prompt: PasswordPrompt): Promise<T> {
    try {
      const held = getGrant()
      grant = null // single use (decided BE-14): a grant is never offered to two actions
      return await action(held)
    } catch (error) {
      if (!isStepUpRequired(error)) throw error
      grant = null // the server rejected whatever we held
      // Concurrent sensitive actions share one prompt and one step-up call.
      pending ??= (async () => {
        const password = await prompt()
        if (password === null) throw error
        return authenticate(password)
      })().finally(() => {
        pending = null
      })
      const fresh = await pending
      grant = null // consumed by this retry
      return action(fresh) // exactly one retry; a second STEP_UP_REQUIRED propagates
    }
  }

  options.subscribeSessionEnd?.(() => {
    grant = null
  })

  return {
    getGrant,
    authenticate,
    withStepUp,
    clear: () => {
      grant = null
    },
  }
}
