'use client'

import { TokenError, type AuthTransport } from '@/lib/api/browser/auth-transport'
import { getBrowserClient } from '@/lib/api/browser/client'
import { ApiError } from '@/lib/api/errors'
import type { PgApi } from '@/lib/api/pg-api'
import { envPublic } from '@/lib/env/env.public'
import { createMockPgApi } from '@/lib/mock/adapter'
import { createMockAuthService } from '@/lib/mock/auth/auth-service'
import type { MockSessionBridge } from '@/lib/mock/auth/player-api'
import { createSessionAuthStore } from '@/lib/mock/auth/store.browser'
import { createMockAuthTransport } from '@/lib/mock/auth/transport'
import { createSessionPlayerStore } from '@/lib/mock/player/store.browser'
import { inject } from '@/lib/mock/latency'
import { recordContactSent, resolveBrowserMode } from '@/lib/mock/store.browser'

// The browser mock PgApi: mode from `?mock=` and the session store, contact counts and the mock auth database kept in
// the session store (sessionStorage `pg:mock:v1` and `pg:mock:v1:auth`). Created once per page load by useApi().

export interface BrowserMockApiOptions {
  /** Bearer source for authenticated mock calls. Default: the app's TokenManager (`getBrowserClient().tokens`). */
  session?: MockSessionBridge
  /** Access token lifetime in ms (default 10 min). Lower it to watch refresh rotation. */
  accessTtlMs?: number
}

/** TokenError (refresh failed) to ApiError, as lib/api/browser/client.ts does: code and closed reason only. */
function toApiError(error: unknown): ApiError {
  if (error instanceof ApiError) return error
  if (error instanceof TokenError) return new ApiError(error.code, { status: error.status, reason: error.reason })
  return new ApiError('NETWORK', { status: 0 })
}

/** The app's single TokenManager, resolved lazily (never at import time and never on the server). */
const appSession: MockSessionBridge = {
  getAccessToken: () => getBrowserClient().tokens.getAccessToken(),
  refresh: async () => {
    try {
      return await getBrowserClient().tokens.refresh()
    } catch (error) {
      throw toApiError(error)
    }
  },
}

export function createBrowserMockApi(options: BrowserMockApiOptions = {}): PgApi {
  return createMockPgApi({
    getMode: resolveBrowserMode,
    onContactSent: () => void recordContactSent(),
    playerStore: createSessionPlayerStore(),
    auth: {
      store: createSessionAuthStore(),
      session: options.session ?? appSession,
      googleAuth: envPublic.GOOGLE_AUTH,
      accessTtlMs: options.accessTtlMs,
    },
  })
}

/**
 * The mock `AuthTransport` for the TokenManager (POST /auth/refresh, /auth/logout, /auth/step-up), over the same session
 * store and the same latency/error injection. In a mock build the browser client must configure its TokenManager with
 * this instead of the fetch transport (see lib/mock/README.md, "Wiring the TokenManager").
 */
export function createBrowserMockAuthTransport(
  options: Pick<BrowserMockApiOptions, 'accessTtlMs'> = {},
): AuthTransport {
  const service = createMockAuthService({
    store: createSessionAuthStore(),
    googleAuth: envPublic.GOOGLE_AUTH,
    accessTtlMs: options.accessTtlMs,
  })
  return createMockAuthTransport(service, () => inject(resolveBrowserMode(), {}))
}
