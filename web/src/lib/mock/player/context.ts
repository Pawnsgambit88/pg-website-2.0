import { ApiError } from '@/lib/api/errors'
import { authRequired } from '@/lib/mock/auth/errors'
import { verifyAccess } from '@/lib/mock/auth/sessions'
import type { AuthStateStore, MockAccount } from '@/lib/mock/auth/state'
import { transact } from '@/lib/mock/auth/transact'
import type { PlayerState, PlayerStateStore } from '@/lib/mock/player/state'
import { DEMO_PLAYER_ID } from '@/lib/mock/seeds/player-registrations'

// One mock "server request" for the player data (ARCH-001 11.4): verify the bearer against the auth store, read the
// player store, run the handler synchronously, write the player store back (also when the handler throws, so a partial
// change is never lost). No module-level state. On the server there are no stores: a read answers AUTH_REQUIRED and a
// write answers MOCK_SERVER_MUTATION.

export interface PlayerContextOptions {
  authStore: AuthStateStore | null
  playerStore: PlayerStateStore | null
  now?: (() => number) | undefined
}

export interface PlayerContext {
  account: MockAccount
  state: PlayerState
  /** Real milliseconds (browser clock): used only for hold windows and registration timestamps. */
  nowMs: number
  /** Only the seeded demo player has history; every other account starts empty. */
  isDemo: boolean
}

export interface PlayerRunner {
  read: <T>(token: string | null, handler: (ctx: PlayerContext) => T) => T
  write: <T>(token: string | null, handler: (ctx: PlayerContext) => T) => T
}

export function createPlayerRunner(options: PlayerContextOptions): PlayerRunner {
  const now = options.now ?? Date.now

  function open(token: string | null, kind: 'read' | 'write'): PlayerContext & { store: PlayerStateStore } {
    const { authStore, playerStore } = options
    if (authStore === null || playerStore === null || typeof window === 'undefined') {
      throw kind === 'read' ? authRequired() : new ApiError('MOCK_SERVER_MUTATION', { status: 0 })
    }
    const nowMs = now()
    const account = transact(authStore, 'read', (state) => verifyAccess(state, token, nowMs))
    return { account, state: playerStore.read(), nowMs, isDemo: account.id === DEMO_PLAYER_ID, store: playerStore }
  }

  return {
    read: (token, handler) => handler(open(token, 'read')),
    write: (token, handler) => {
      const { store, ...ctx } = open(token, 'write')
      try {
        return handler(ctx)
      } finally {
        store.write(ctx.state)
      }
    },
  }
}

export const notFound = (): ApiError => new ApiError('NOT_FOUND', { status: 404 })
export const toIso = (ms: number): string => new Date(ms).toISOString()
