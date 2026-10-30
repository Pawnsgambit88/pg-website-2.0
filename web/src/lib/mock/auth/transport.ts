import type { AuthRequest, AuthResponse, AuthTransport } from '@/lib/api/browser/auth-transport'
import { ApiError, isAbortError } from '@/lib/api/errors'
import type { MockAuthService } from '@/lib/mock/auth/auth-service'

// The mock behind the TokenManager's `AuthTransport` seam (TASK-021; lib/api/browser/auth-transport.ts). Same contract
// as browser/transport.ts: transport failures (status 0: network, timeout, abort) REJECT; every business failure
// RESOLVES `{ ok: false, status, code, reason }`. Paths: POST /auth/refresh, /auth/logout, /auth/step-up.
// Body mode only (mock builds resolve body mode): the refresh token arrives in `body.refreshToken`; the TokenManager
// alone decides where it is kept (players: pg:auth:v1, admins: memory only). Nothing is logged.

/** Same `gate` as the adapter: mode latency and failure injection. */
export type TransportGate = () => Promise<unknown>

function failure(error: unknown): AuthResponse {
  if (error instanceof ApiError) {
    if (error.status === 0) throw error // transient: the TokenManager keeps the session
    return { ok: false, status: error.status, code: error.code, reason: error.reason }
  }
  throw new ApiError('NETWORK', { status: 0 })
}

function handle(service: MockAuthService, request: AuthRequest): unknown {
  switch (request.path) {
    case '/auth/refresh':
      return service.refresh(request.body?.refreshToken)
    case '/auth/logout':
      service.logout(request.body?.refreshToken, request.bearer ?? null)
      return null
    case '/auth/step-up':
      return service.stepUp(request.bearer ?? null, request.body)
  }
}

export function createMockAuthTransport(service: MockAuthService, gate: TransportGate): AuthTransport {
  return async function mockTransport(request) {
    try {
      await gate()
      return { ok: true, data: handle(service, request) }
    } catch (error) {
      if (isAbortError(error)) throw error
      return failure(error)
    }
  }
}
