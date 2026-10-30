'use client'

import { envPublic } from '@/lib/env/env.public'
import {
  tokenErrorFromResponse,
  TokenError,
  type AuthRequest,
  type AuthTransport,
} from '@/lib/api/browser/auth-transport'
import { createRefreshLock, type WithRefreshLock } from '@/lib/api/browser/session-lock'
import { sessionTokensSchema, tokenPairBodySchema, type UserRole } from '@/lib/api/types/auth'
import type { AuthFailureReason } from '@/lib/api/types/error-codes'
import { clearSessionHint, readSessionHint, subscribeSessionHint, writeSessionHint } from '@/lib/auth/session-hint'
import { defineStore } from '@/lib/storage/versioned'

// Token module (TASK-125; ARCH-001 12.1 to 12.3, 17.1; backend contract 2.4; SEC-001 F-01, F-02, F-04, F-10).
// One interface, two strategies, chosen once at construction:
//   body   (mock-backed build): access token in memory; refresh token in `pg:auth:v1` = { v: 1, rt } for players,
//                               memory only for admins (never persisted, 12h cap).
//   cookie (launch, DEC-026):   refresh token lives in the httpOnly `__Secure-pg_rt` cookie; JavaScript never sees it.
//                               Refresh is POST /auth/refresh with `X-CSRF-Token: <access token>` and cookies sent.
// Rules for this file: no token in a URL, log, thrown error or event payload; localStorage only through
// lib/storage/versioned; no fetch (the injected AuthTransport is the only network seam; TASK-014 supplies it).
// (public) code must NOT import this module (F-04): it reads the non-secret hint from lib/auth/session-hint instead.

export type TokenMode = 'body' | 'cookie'

/**
 * `NEXT_PUBLIC_USE_MOCKS=true` always selects body mode (the mock backend has no cookies). Against a real backend,
 * `NEXT_PUBLIC_AUTH_MODE` (default `cookie`, launch) must match the backend `AUTH_TOKEN_MODE`.
 */
export function resolveTokenMode(useMocks: boolean, configured: TokenMode = 'cookie'): TokenMode {
  return useMocks ? 'body' : configured
}

/** Absolute admin session cap (ARCH-001 12.1, contract 2.4). */
export const ADMIN_SESSION_CAP_MS = 12 * 60 * 60 * 1000
export const AUTH_CHANNEL = 'pg-auth'
/**
 * Cookie-mode refresh needs `X-CSRF-Token: <access token>` (contract 2.4) but after a reload there is no access token.
 * Until the backend states what it accepts at bootstrap, a fixed non-secret marker is sent. See the TASK-125 report.
 */
export const CSRF_BOOTSTRAP_VALUE = 'bootstrap'

export type SessionEndReason = AuthFailureReason | 'logout' | 'remote'

export interface SessionInput {
  accessToken: string
  /** Body mode only. Ignored (never retained) in cookie mode. */
  refreshToken?: string | undefined
  role: UserRole
  /** Lifetime of the access token in seconds, if the backend says. Without it expiry is learnt from a 401. */
  expiresInSec?: number | undefined
}

export interface SessionEndedEvent {
  reason: SessionEndReason
}

export interface TokenManager {
  readonly mode: TokenMode
  /** The in-memory access token, or `null` when absent, expired or the admin cap has passed. */
  getAccessToken: () => string | null
  /** Called after login, register, OAuth exchange. Stores tokens per mode and writes the role hint. */
  setSession: (input: SessionInput) => void
  /** After `GET /auth/me`: the server's role is authoritative. Admins lose any persisted refresh token. */
  updateRole: (role: UserRole) => void
  /** Single-flight, cross-tab refresh. Resolves the new access token. Rejects with `TokenError` only. */
  refresh: () => Promise<string>
  /** Local wipe (memory, `pg:auth:v1`, hint) plus cross-tab broadcast. No network call. */
  clear: () => void
  /** Revokes on the server first (best effort), then `clear()`. Never rejects. */
  logout: () => Promise<void>
  /** Fires once per ended session (logout, expiry, reuse, role change, remote tab). Returns unsubscribe. */
  subscribe: (listener: (event: SessionEndedEvent) => void) => () => void
  /** The refresh token for `POST /auth/logout`-style callers is never exposed; there is deliberately no getter. */
  dispose: () => void
}

export interface ChannelLike {
  postMessage: (message: unknown) => void
  addEventListener: (type: 'message', listener: (event: MessageEvent) => void) => void
  removeEventListener: (type: 'message', listener: (event: MessageEvent) => void) => void
  close: () => void
}

export interface TokenManagerOptions {
  transport: AuthTransport
  mode: TokenMode
  /** Defaults to Web Locks with the localStorage lease fallback. */
  lock?: WithRefreshLock
  now?: () => number
  /** `null` disables BroadcastChannel (storage events still work). Default: `BroadcastChannel('pg-auth')` if present. */
  createChannel?: ((name: string) => ChannelLike | null) | undefined
}

interface StoredRefresh {
  v: 1
  rt: string
}

function parseStoredRefresh(value: unknown): StoredRefresh | null {
  if (typeof value !== 'object' || value === null) return null
  const record = value as Record<string, unknown>
  return record.v === 1 && typeof record.rt === 'string' && record.rt.length > 0 ? { v: 1, rt: record.rt } : null
}

const refreshStore = defineStore<StoredRefresh>({ area: 'local', name: 'auth', version: 1, parse: parseStoredRefresh })

function defaultChannel(name: string): ChannelLike | null {
  return typeof BroadcastChannel === 'undefined' ? null : new BroadcastChannel(name)
}

function isSignoutMessage(data: unknown): boolean {
  return typeof data === 'object' && data !== null && (data as Record<string, unknown>).type === 'signout'
}

export function createTokenManager(options: TokenManagerOptions): TokenManager {
  const { transport, mode } = options
  const now = options.now ?? Date.now
  const lock = options.lock ?? createRefreshLock()
  const openChannel = options.createChannel ?? defaultChannel

  let access: string | null = null
  let accessExpiresAt: number | null = null
  let role: UserRole | null = null
  let memoryRefresh: string | null = null // body mode: the live refresh token (always), storage is a mirror for players
  let sessionStartedAt: number | null = null
  let generation = 0
  let inflight: Promise<string> | null = null
  const listeners = new Set<(event: SessionEndedEvent) => void>()

  const channel = openChannel(AUTH_CHANNEL)

  const isAdminCapped = (): boolean =>
    role === 'admin' && sessionStartedAt !== null && now() - sessionStartedAt >= ADMIN_SESSION_CAP_MS

  function getAccessToken(): string | null {
    if (access === null || isAdminCapped()) return null
    return accessExpiresAt !== null && now() >= accessExpiresAt ? null : access
  }

  function persistRefresh(token: string): void {
    memoryRefresh = token
    // Admin refresh tokens are never persisted (ARCH-001 12.1). A role still unknown (bootstrap) persists as a player.
    if (mode === 'body' && role !== 'admin') refreshStore.write({ v: 1, rt: token })
  }

  function applyAccess(token: string, expiresInSec: number | undefined): void {
    access = token
    accessExpiresAt = expiresInSec !== undefined && expiresInSec > 0 ? now() + expiresInSec * 1000 : null
  }

  function hadSession(): boolean {
    return access !== null || role !== null || memoryRefresh !== null || readSessionHint() !== null
  }

  function wipe(): void {
    generation += 1
    access = null
    accessExpiresAt = null
    role = null
    memoryRefresh = null
    sessionStartedAt = null
    refreshStore.remove()
    clearSessionHint()
  }

  function endSession(reason: SessionEndReason, broadcast: boolean): void {
    const active = hadSession()
    wipe()
    if (broadcast) channel?.postMessage({ type: 'signout' })
    if (!active) return
    for (const listener of [...listeners]) listener({ reason })
  }

  function setSession(input: SessionInput): void {
    access = null
    applyAccess(input.accessToken, input.expiresInSec)
    role = input.role
    sessionStartedAt = now()
    generation += 1
    if (mode === 'body') {
      if (input.refreshToken !== undefined && input.refreshToken.length > 0) persistRefresh(input.refreshToken)
      if (input.role === 'admin') refreshStore.remove()
    } else {
      // Cookie mode: the refresh token is httpOnly. Drop anything the body carried; JavaScript must never hold it.
      memoryRefresh = null
      refreshStore.remove()
    }
    writeSessionHint(input.role)
  }

  function updateRole(next: UserRole): void {
    role = next
    if (next === 'admin') {
      refreshStore.remove() // an admin refresh token is never persisted
      sessionStartedAt ??= now()
    }
    writeSessionHint(next)
  }

  function buildRequest(): AuthRequest | null {
    if (mode === 'cookie') {
      return {
        method: 'POST',
        path: '/auth/refresh',
        headers: { 'X-CSRF-Token': access ?? CSRF_BOOTSTRAP_VALUE },
        withCredentials: true,
      }
    }
    // Another tab may have rotated since this tab last looked: the stored token is the newest (ARCH-001 12.3 step 3).
    const rt = role === 'admin' ? memoryRefresh : (refreshStore.read()?.rt ?? memoryRefresh)
    if (rt === null) return null
    return { method: 'POST', path: '/auth/refresh', body: { refreshToken: rt }, withCredentials: false }
  }

  async function runRefresh(startedGeneration: number): Promise<string> {
    return lock(async () => {
      if (generation !== startedGeneration) throw new TokenError('AUTH_REQUIRED', 401) // ended while waiting
      if (isAdminCapped()) {
        endSession('SESSION_EXPIRED', true)
        throw new TokenError('AUTH_REQUIRED', 401, 'SESSION_EXPIRED')
      }
      const request = buildRequest()
      if (request === null) {
        endSession('SESSION_EXPIRED', false)
        throw new TokenError('AUTH_REQUIRED', 401)
      }

      let response
      try {
        response = await transport(request)
      } catch {
        throw new TokenError('NETWORK', 0) // transient: keep the session so a retry can succeed
      }

      if (generation !== startedGeneration) throw new TokenError('AUTH_REQUIRED', 401) // logout while in flight

      if (!response.ok) {
        const error = tokenErrorFromResponse(response)
        if (error.code === 'AUTH_REQUIRED' || response.status === 401 || response.status === 403) {
          // REFRESH_REUSED, SESSION_EXPIRED, ROLE_CHANGED, ACCOUNT_SUSPENDED and a bare 401 all end the session.
          endSession(error.reason ?? 'SESSION_EXPIRED', true)
        }
        throw error
      }

      const parsed = (mode === 'body' ? tokenPairBodySchema : sessionTokensSchema).safeParse(response.data)
      if (!parsed.success) throw new TokenError('BAD_RESPONSE', 200)
      applyAccess(parsed.data.accessToken, undefined)
      if (mode === 'body' && 'refreshToken' in parsed.data) persistRefresh(parsed.data.refreshToken)
      return parsed.data.accessToken
    })
  }

  function refresh(): Promise<string> {
    // Ten concurrent callers share one promise, hence one network call (ARCH-001 12.3 step 2).
    inflight ??= runRefresh(generation).finally(() => {
      inflight = null
    })
    return inflight
  }

  function clear(): void {
    endSession('logout', true)
  }

  async function logout(): Promise<void> {
    const request: AuthRequest =
      mode === 'body'
        ? {
            method: 'POST',
            path: '/auth/logout',
            ...(memoryRefresh === null ? {} : { body: { refreshToken: memoryRefresh } }),
            ...(access === null ? {} : { bearer: access }),
            withCredentials: false,
          }
        : {
            method: 'POST',
            path: '/auth/logout',
            ...(access === null ? {} : { bearer: access }),
            headers: { 'X-CSRF-Token': access ?? CSRF_BOOTSTRAP_VALUE },
            withCredentials: true,
          }
    try {
      await transport(request) // revoke server-side first (contract 2.4); logout succeeds even if already revoked
    } catch {
      // Offline logout still signs this device out locally.
    }
    clear()
  }

  function subscribe(listener: (event: SessionEndedEvent) => void): () => void {
    listeners.add(listener)
    return () => {
      listeners.delete(listener)
    }
  }

  // ---- cross-tab sign-out: BroadcastChannel primary, `storage` events as fallback (ARCH-001 12.3 step 5) ----
  const onRemoteSignout = (): void => {
    endSession('remote', false)
  }
  const onChannelMessage = (event: MessageEvent): void => {
    if (isSignoutMessage(event.data)) onRemoteSignout()
  }
  channel?.addEventListener('message', onChannelMessage)
  const unsubscribeRefreshKey = refreshStore.subscribe((value) => {
    if (value === null && mode === 'body' && role !== 'admin') onRemoteSignout()
  })
  const unsubscribeHint = subscribeSessionHint((hint) => {
    if (hint === null) onRemoteSignout()
  })

  function dispose(): void {
    channel?.removeEventListener('message', onChannelMessage)
    channel?.close()
    unsubscribeRefreshKey()
    unsubscribeHint()
    listeners.clear()
  }

  return { mode, getAccessToken, setSession, updateRole, refresh, clear, logout, subscribe, dispose }
}

// ---- app singleton: TASK-014's browser client calls `configureTokens` once with its transport ----

let instance: TokenManager | null = null

export function configureTokens(
  transport: AuthTransport,
  overrides: Partial<Omit<TokenManagerOptions, 'transport'>> = {},
): TokenManager {
  instance?.dispose()
  instance = createTokenManager({
    transport,
    mode: resolveTokenMode(envPublic.USE_MOCKS, envPublic.AUTH_MODE),
    ...overrides,
  })
  return instance
}

export function getTokens(): TokenManager {
  if (instance === null) throw new Error('Token manager is not configured. Call configureTokens(transport) first.')
  return instance
}
