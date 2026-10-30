// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { AuthRequest, AuthResponse, AuthTransport } from '@/lib/api/browser/auth-transport'
import { TokenError } from '@/lib/api/browser/auth-transport'
import { createRefreshLock, type LockManagerLike } from '@/lib/api/browser/session-lock'
import {
  ADMIN_SESSION_CAP_MS,
  AUTH_CHANNEL,
  CSRF_BOOTSTRAP_VALUE,
  createTokenManager,
  resolveTokenMode,
  type ChannelLike,
  type SessionEndedEvent,
  type TokenManager,
  type TokenMode,
} from '@/lib/api/browser/tokens'
import { readSessionHint } from '@/lib/auth/session-hint'

const RT_KEY = 'pg:auth:v1'
const HINT_KEY = 'pg:session-hint:v1'

// ---- fakes ----

const ok = (data: unknown): AuthResponse => ({ ok: true, data })
const fail = (status: number, code: string, reason?: string): AuthResponse => ({ ok: false, status, code, reason })

/** Scripted transport: each call pops the next response; records every request. */
function scripted(...responses: (AuthResponse | Error)[]) {
  const calls: AuthRequest[] = []
  const queue = [...responses]
  const transport: AuthTransport = (request) => {
    calls.push(request)
    const next = queue.shift()
    if (next === undefined) return Promise.reject(new Error('unexpected call'))
    return next instanceof Error ? Promise.reject(next) : Promise.resolve(next)
  }
  return { transport, calls }
}

/** In-process BroadcastChannel hub: tabs sharing a hub hear each other, never themselves. */
function hub() {
  const channels = new Set<FakeChannel>()
  class FakeChannel implements ChannelLike {
    private handlers = new Set<(event: MessageEvent) => void>()
    constructor() {
      channels.add(this)
    }
    postMessage(message: unknown) {
      for (const other of channels) {
        if (other === this) continue
        for (const handler of other.handlers) handler({ data: message } as MessageEvent)
      }
    }
    addEventListener(_type: 'message', listener: (event: MessageEvent) => void) {
      this.handlers.add(listener)
    }
    removeEventListener(_type: 'message', listener: (event: MessageEvent) => void) {
      this.handlers.delete(listener)
    }
    close() {
      channels.delete(this)
    }
  }
  const names: string[] = []
  return {
    names,
    create: (name: string): ChannelLike => {
      names.push(name)
      return new FakeChannel()
    },
  }
}

/** A mutex with the shape of navigator.locks: callbacks run one at a time, in order. */
function fakeLocks(): LockManagerLike {
  let tail: Promise<unknown> = Promise.resolve()
  return {
    request: <T>(_name: string, callback: () => Promise<T>) => {
      const run = tail.then(callback, callback)
      tail = run.catch(() => undefined)
      return run
    },
  }
}

const noChannel = () => null

function make(mode: TokenMode, transport: AuthTransport, extra: { now?: () => number; locks?: LockManagerLike } = {}) {
  return createTokenManager({
    transport,
    mode,
    lock: createRefreshLock({ locks: extra.locks ?? fakeLocks() }),
    createChannel: noChannel,
    ...(extra.now === undefined ? {} : { now: extra.now }),
  })
}

let managers: TokenManager[] = []
function track(m: TokenManager): TokenManager {
  managers.push(m)
  return m
}

beforeEach(() => {
  window.localStorage.clear()
})
afterEach(() => {
  for (const m of managers) m.dispose()
  managers = []
  vi.restoreAllMocks()
})

describe('mode selection', () => {
  it('mocks select body mode, every other build selects cookie mode', () => {
    expect(resolveTokenMode(true)).toBe('body')
    expect(resolveTokenMode(false)).toBe('cookie')
    expect(resolveTokenMode(false, 'body')).toBe('body')
    expect(resolveTokenMode(true, 'cookie')).toBe('body')
  })
})

describe('body mode', () => {
  it('keeps the access token in memory and the player refresh token in pg:auth:v1', () => {
    const tokens = track(make('body', scripted().transport))
    tokens.setSession({ accessToken: 'AT1', refreshToken: 'RT1', role: 'player' })
    expect(tokens.mode).toBe('body')
    expect(tokens.getAccessToken()).toBe('AT1')
    expect(JSON.parse(window.localStorage.getItem(RT_KEY) ?? 'null')).toEqual({ v: 1, rt: 'RT1' })
    expect(window.localStorage.getItem(RT_KEY)).not.toContain('AT1')
    expect(JSON.stringify({ ...window.localStorage })).not.toContain('AT1')
  })

  it('refresh sends the stored refresh token in the body and rotates both tokens', async () => {
    const { transport, calls } = scripted(ok({ accessToken: 'AT2', refreshToken: 'RT2' }))
    const tokens = track(make('body', transport))
    tokens.setSession({ accessToken: 'AT1', refreshToken: 'RT1', role: 'player' })
    await expect(tokens.refresh()).resolves.toBe('AT2')
    expect(calls).toEqual([
      { method: 'POST', path: '/auth/refresh', body: { refreshToken: 'RT1' }, withCredentials: false },
    ])
    expect(tokens.getAccessToken()).toBe('AT2')
    expect(JSON.parse(window.localStorage.getItem(RT_KEY) ?? 'null')).toEqual({ v: 1, rt: 'RT2' })
  })

  it('bootstraps from a stored refresh token after a reload (no access token yet)', async () => {
    window.localStorage.setItem(RT_KEY, JSON.stringify({ v: 1, rt: 'RTSTORED' }))
    const { transport, calls } = scripted(ok({ accessToken: 'AT9', refreshToken: 'RT9' }))
    const tokens = track(make('body', transport))
    expect(tokens.getAccessToken()).toBeNull()
    await tokens.refresh()
    expect(calls[0]?.body).toEqual({ refreshToken: 'RTSTORED' })
  })

  it('does not persist an admin refresh token, and a role change to admin removes a stored one', async () => {
    const { transport, calls } = scripted(ok({ accessToken: 'AT2', refreshToken: 'RT2' }))
    const tokens = track(make('body', transport))
    tokens.setSession({ accessToken: 'AT1', refreshToken: 'RT1', role: 'admin' })
    expect(window.localStorage.getItem(RT_KEY)).toBeNull()
    // memory-only refresh still works within the tab
    await tokens.refresh()
    expect(calls[0]?.body).toEqual({ refreshToken: 'RT1' })
    expect(window.localStorage.getItem(RT_KEY)).toBeNull()

    window.localStorage.setItem(RT_KEY, JSON.stringify({ v: 1, rt: 'RTP' }))
    tokens.updateRole('admin')
    expect(window.localStorage.getItem(RT_KEY)).toBeNull()
  })

  it('enforces the 12 h admin cap: no access token, no refresh, session ended', async () => {
    let clock = 1_000
    const { transport, calls } = scripted()
    const tokens = track(make('body', transport, { now: () => clock }))
    const ended: SessionEndedEvent[] = []
    tokens.subscribe((e) => ended.push(e))
    tokens.setSession({ accessToken: 'AT1', refreshToken: 'RT1', role: 'admin' })
    clock += ADMIN_SESSION_CAP_MS - 1
    expect(tokens.getAccessToken()).toBe('AT1')
    clock += 1
    expect(tokens.getAccessToken()).toBeNull()
    await expect(tokens.refresh()).rejects.toMatchObject({ code: 'AUTH_REQUIRED', reason: 'SESSION_EXPIRED' })
    expect(calls).toHaveLength(0)
    expect(ended).toEqual([{ reason: 'SESSION_EXPIRED' }])
    expect(readSessionHint()).toBeNull()
  })

  it('honours expiresInSec so a stale access token is not handed out', () => {
    let clock = 0
    const tokens = track(make('body', scripted().transport, { now: () => clock }))
    tokens.setSession({ accessToken: 'AT1', refreshToken: 'RT1', role: 'player', expiresInSec: 60 })
    clock = 59_999
    expect(tokens.getAccessToken()).toBe('AT1')
    clock = 60_000
    expect(tokens.getAccessToken()).toBeNull()
  })

  it('degrades to memory when storage throws (private mode): session works, ends on reload', async () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new DOMException('quota', 'QuotaExceededError')
    })
    const { transport, calls } = scripted(ok({ accessToken: 'AT2', refreshToken: 'RT2' }))
    const tokens = track(make('body', transport))
    tokens.setSession({ accessToken: 'AT1', refreshToken: 'RT1', role: 'player' })
    expect(window.localStorage.getItem(RT_KEY)).toBeNull()
    await tokens.refresh()
    expect(calls[0]?.body).toEqual({ refreshToken: 'RT1' })
    expect(tokens.getAccessToken()).toBe('AT2')
  })

  it('treats a malformed stored value as no session', async () => {
    window.localStorage.setItem(RT_KEY, '{"v":2,"rt":"x"}')
    const tokens = track(make('body', scripted().transport))
    await expect(tokens.refresh()).rejects.toMatchObject({ code: 'AUTH_REQUIRED' })
  })
})

describe('cookie mode', () => {
  it('never stores or retains a refresh token, even if the body carried one', () => {
    const tokens = track(make('cookie', scripted().transport))
    tokens.setSession({ accessToken: 'AT1', refreshToken: 'RTLEAK', role: 'player' })
    expect(window.localStorage.getItem(RT_KEY)).toBeNull()
    expect(JSON.stringify({ ...window.localStorage })).not.toContain('RTLEAK')
    expect(tokens.getAccessToken()).toBe('AT1')
  })

  it('refreshes with X-CSRF-Token set to the access token, credentials, and no body', async () => {
    const { transport, calls } = scripted(ok({ accessToken: 'AT2' }))
    const tokens = track(make('cookie', transport))
    tokens.setSession({ accessToken: 'AT1', role: 'player' })
    await expect(tokens.refresh()).resolves.toBe('AT2')
    expect(calls).toEqual([
      { method: 'POST', path: '/auth/refresh', headers: { 'X-CSRF-Token': 'AT1' }, withCredentials: true },
    ])
    expect(calls[0]?.body).toBeUndefined()
    expect(window.localStorage.getItem(RT_KEY)).toBeNull()
  })

  it('uses the bootstrap marker header when the page has just loaded and holds no access token', async () => {
    const { transport, calls } = scripted(ok({ accessToken: 'AT2' }))
    const tokens = track(make('cookie', transport))
    await tokens.refresh()
    expect(calls[0]?.headers).toEqual({ 'X-CSRF-Token': CSRF_BOOTSTRAP_VALUE })
    expect(calls[0]?.withCredentials).toBe(true)
  })

  it('ignores a refreshToken in a cookie-mode refresh body and rejects a garbage body', async () => {
    const tokens = track(
      make('cookie', scripted(ok({ accessToken: 'AT2', refreshToken: 'RTX' }), ok({ nope: 1 })).transport),
    )
    await tokens.refresh()
    expect(window.localStorage.getItem(RT_KEY)).toBeNull()
    await expect(tokens.refresh()).rejects.toMatchObject({ code: 'BAD_RESPONSE' })
  })

  it('admin cap applies in cookie mode too', async () => {
    let clock = 0
    const { transport, calls } = scripted()
    const tokens = track(make('cookie', transport, { now: () => clock }))
    tokens.setSession({ accessToken: 'AT1', role: 'admin' })
    clock = ADMIN_SESSION_CAP_MS
    await expect(tokens.refresh()).rejects.toMatchObject({ code: 'AUTH_REQUIRED' })
    expect(calls).toHaveLength(0)
  })
})

describe('single-flight refresh', () => {
  it.each(['body', 'cookie'] as const)('N concurrent refreshes make one call (%s mode)', async (mode) => {
    let release: (r: AuthResponse) => void = () => undefined
    let count = 0
    const transport: AuthTransport = () => {
      count += 1
      return new Promise<AuthResponse>((resolve) => {
        release = resolve
      })
    }
    const tokens = track(make(mode, transport))
    tokens.setSession({ accessToken: 'AT1', ...(mode === 'body' ? { refreshToken: 'RT1' } : {}), role: 'player' })
    const all = Array.from({ length: 10 }, () => tokens.refresh())
    await Promise.resolve()
    release(ok(mode === 'body' ? { accessToken: 'AT2', refreshToken: 'RT2' } : { accessToken: 'AT2' }))
    await expect(Promise.all(all)).resolves.toEqual(Array<string>(10).fill('AT2'))
    expect(count).toBe(1)
  })

  it('starts a new flight after the previous one settles, including after a failure', async () => {
    const { transport, calls } = scripted(new Error('offline'), ok({ accessToken: 'AT2', refreshToken: 'RT2' }))
    const tokens = track(make('body', transport))
    tokens.setSession({ accessToken: 'AT1', refreshToken: 'RT1', role: 'player' })
    await expect(tokens.refresh()).rejects.toMatchObject({ code: 'NETWORK' })
    expect(tokens.getAccessToken()).toBe('AT1') // transient failure keeps the session
    await expect(tokens.refresh()).resolves.toBe('AT2')
    expect(calls).toHaveLength(2)
  })

  it('two tabs refreshing at once are serialised by the lock; the second uses the rotated token', async () => {
    const locks = fakeLocks() // shared across tabs, like navigator.locks
    const seen: string[] = []
    let n = 0
    const transport: AuthTransport = async (request) => {
      const presented = request.body?.refreshToken ?? 'none'
      seen.push(presented)
      await Promise.resolve()
      n += 1
      return ok({ accessToken: `AT-${String(n)}`, refreshToken: `RT-${String(n)}` })
    }
    const a = track(make('body', transport, { locks }))
    const b = track(make('body', transport, { locks }))
    a.setSession({ accessToken: 'A0', refreshToken: 'RT-0', role: 'player' })
    // tab B learns the session from storage (same origin)
    const results = await Promise.all([a.refresh(), b.refresh()])
    expect(seen).toEqual(['RT-0', 'RT-1']) // B did NOT reuse RT-0, which would trigger REFRESH_REUSED
    expect(results).toEqual(['AT-1', 'AT-2'])
    expect(JSON.parse(window.localStorage.getItem(RT_KEY) ?? 'null')).toEqual({ v: 1, rt: 'RT-2' })
  })

  it('uses navigator.locks when present, with the pg-refresh lock name', async () => {
    const request = vi.fn()
    const locks: LockManagerLike = {
      request: <T>(name: string, cb: () => Promise<T>) => {
        request(name, cb)
        return cb()
      },
    }
    const withLock = createRefreshLock({ locks })
    await expect(withLock(() => Promise.resolve(7))).resolves.toBe(7)
    expect(request).toHaveBeenCalledWith('pg-refresh', expect.any(Function))
  })
})

describe('lease fallback when Web Locks is unavailable', () => {
  it('serialises two lock holders through pg:auth:lock:v1 and releases the lease', async () => {
    const order: string[] = []
    const lockA = createRefreshLock({ locks: null, ownerId: 'a', pollMs: 1 })
    const lockB = createRefreshLock({ locks: null, ownerId: 'b', pollMs: 1 })
    const run = (lock: typeof lockA, name: string) =>
      lock(async () => {
        order.push(`${name}:start`)
        await new Promise((r) => setTimeout(r, 15))
        order.push(`${name}:end`)
      })
    await Promise.all([run(lockA, 'a'), run(lockB, 'b')])
    expect(order[0]?.endsWith(':start')).toBe(true)
    expect(order[1]).toBe(`${order[0]?.split(':')[0] ?? ''}:end`) // no interleaving
    expect(window.localStorage.getItem('pg:auth:lock:v1')).toBeNull()
  })

  it('does not wait forever on a crashed tab: a stale lease is taken over after expiry', async () => {
    window.localStorage.setItem('pg:auth:lock:v1', JSON.stringify({ owner: 'dead', expires: Date.now() - 1 }))
    const lock = createRefreshLock({ locks: null, ownerId: 'a', pollMs: 1 })
    await expect(lock(() => Promise.resolve('ran'))).resolves.toBe('ran')
  })

  it('proceeds without a lock when storage is unavailable', async () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('blocked')
    })
    const lock = createRefreshLock({ locks: null })
    await expect(lock(() => Promise.resolve('ran'))).resolves.toBe('ran')
  })

  it('works for a token manager end to end', async () => {
    const { transport } = scripted(ok({ accessToken: 'AT2', refreshToken: 'RT2' }))
    const tokens = track(
      createTokenManager({
        transport,
        mode: 'body',
        lock: createRefreshLock({ locks: null }),
        createChannel: noChannel,
      }),
    )
    tokens.setSession({ accessToken: 'AT1', refreshToken: 'RT1', role: 'player' })
    await expect(tokens.refresh()).resolves.toBe('AT2')
  })
})

describe('refresh failures end the session', () => {
  it.each([['REFRESH_REUSED'], ['SESSION_EXPIRED'], ['ROLE_CHANGED'], ['ACCOUNT_SUSPENDED']] as const)(
    'AUTH_REQUIRED with reason %s forces logout everywhere',
    async (reason) => {
      const { transport } = scripted(fail(401, 'AUTH_REQUIRED', reason))
      const tokens = track(make('body', transport))
      const ended: SessionEndedEvent[] = []
      tokens.subscribe((e) => ended.push(e))
      tokens.setSession({ accessToken: 'AT1', refreshToken: 'RT1', role: 'player' })
      await expect(tokens.refresh()).rejects.toMatchObject({ code: 'AUTH_REQUIRED', status: 401, reason })
      expect(tokens.getAccessToken()).toBeNull()
      expect(window.localStorage.getItem(RT_KEY)).toBeNull()
      expect(window.localStorage.getItem(HINT_KEY)).toBeNull()
      expect(ended).toEqual([{ reason }]) // emitted once
    },
  )

  it('reuse in one tab signs out the other tab via broadcast', async () => {
    const channels = hub()
    const mk = (transport: AuthTransport) =>
      track(
        createTokenManager({
          transport,
          mode: 'body',
          lock: createRefreshLock({ locks: fakeLocks() }),
          createChannel: channels.create,
        }),
      )
    const a = mk(scripted(fail(401, 'AUTH_REQUIRED', 'REFRESH_REUSED')).transport)
    const b = mk(scripted().transport)
    const endedB: SessionEndedEvent[] = []
    b.subscribe((e) => endedB.push(e))
    a.setSession({ accessToken: 'A', refreshToken: 'R', role: 'player' })
    b.setSession({ accessToken: 'B', refreshToken: 'R', role: 'player' })
    await expect(a.refresh()).rejects.toBeInstanceOf(TokenError)
    expect(b.getAccessToken()).toBeNull()
    expect(endedB).toEqual([{ reason: 'remote' }])
  })

  it('a refresh that lands after logout does not resurrect the session', async () => {
    let release: (r: AuthResponse) => void = () => undefined
    const transport: AuthTransport = (request) =>
      request.path === '/auth/logout'
        ? Promise.resolve(ok({}))
        : new Promise<AuthResponse>((resolve) => {
            release = resolve
          })
    const tokens = track(make('body', transport))
    tokens.setSession({ accessToken: 'AT1', refreshToken: 'RT1', role: 'player' })
    const pending = tokens.refresh()
    await Promise.resolve()
    await Promise.resolve()
    tokens.clear()
    release(ok({ accessToken: 'AT2', refreshToken: 'RT2' }))
    await expect(pending).rejects.toMatchObject({ code: 'AUTH_REQUIRED' })
    expect(tokens.getAccessToken()).toBeNull()
    expect(window.localStorage.getItem(RT_KEY)).toBeNull()
  })

  it('maps a server 5xx to a TokenError and keeps the session', async () => {
    const tokens = track(make('body', scripted(fail(503, 'SOMETHING_NEW')).transport))
    tokens.setSession({ accessToken: 'AT1', refreshToken: 'RT1', role: 'player' })
    await expect(tokens.refresh()).rejects.toMatchObject({ code: 'HTTP_5XX', status: 503 })
    expect(tokens.getAccessToken()).toBe('AT1')
  })
})

describe('logout and broadcast', () => {
  it('body mode: revokes with the refresh token first, then clears memory, storage, hint and broadcasts', async () => {
    const channels = hub()
    const { transport, calls } = scripted(ok({}))
    const a = track(
      createTokenManager({
        transport,
        mode: 'body',
        lock: createRefreshLock({ locks: fakeLocks() }),
        createChannel: channels.create,
      }),
    )
    const b = track(
      createTokenManager({
        transport: scripted().transport,
        mode: 'body',
        lock: createRefreshLock({ locks: fakeLocks() }),
        createChannel: channels.create,
      }),
    )
    const endedB: SessionEndedEvent[] = []
    b.subscribe((e) => endedB.push(e))
    a.setSession({ accessToken: 'AT1', refreshToken: 'RT1', role: 'player' })
    b.setSession({ accessToken: 'ATB', refreshToken: 'RT1', role: 'player' })
    await a.logout()
    expect(calls).toEqual([
      { method: 'POST', path: '/auth/logout', body: { refreshToken: 'RT1' }, bearer: 'AT1', withCredentials: false },
    ])
    expect(a.getAccessToken()).toBeNull()
    expect(window.localStorage.length).toBe(0)
    expect(channels.names).toEqual([AUTH_CHANNEL, AUTH_CHANNEL])
    expect(b.getAccessToken()).toBeNull()
    expect(endedB).toEqual([{ reason: 'remote' }])
  })

  it('cookie mode: logout sends no body, with credentials and CSRF header', async () => {
    const { transport, calls } = scripted(ok({}))
    const tokens = track(make('cookie', transport))
    tokens.setSession({ accessToken: 'AT1', role: 'player' })
    await tokens.logout()
    expect(calls[0]?.body).toBeUndefined()
    expect(calls[0]?.withCredentials).toBe(true)
    expect(calls[0]?.headers).toEqual({ 'X-CSRF-Token': 'AT1' })
  })

  it('still signs out locally when the revoke call fails (offline)', async () => {
    const tokens = track(make('body', scripted(new Error('offline')).transport))
    tokens.setSession({ accessToken: 'AT1', refreshToken: 'RT1', role: 'player' })
    await expect(tokens.logout()).resolves.toBeUndefined()
    expect(tokens.getAccessToken()).toBeNull()
    expect(window.localStorage.getItem(RT_KEY)).toBeNull()
  })

  it('storage-event fallback: another tab removing pg:auth:v1 signs this tab out without a channel', () => {
    const tokens = track(make('body', scripted().transport))
    const ended: SessionEndedEvent[] = []
    tokens.subscribe((e) => ended.push(e))
    tokens.setSession({ accessToken: 'AT1', refreshToken: 'RT1', role: 'player' })
    window.dispatchEvent(new StorageEvent('storage', { key: RT_KEY, newValue: null, storageArea: window.localStorage }))
    expect(tokens.getAccessToken()).toBeNull()
    expect(ended).toEqual([{ reason: 'remote' }])
  })

  it('clear() with no session is silent', () => {
    const tokens = track(make('body', scripted().transport))
    const listener = vi.fn()
    tokens.subscribe(listener)
    tokens.clear()
    expect(listener).not.toHaveBeenCalled()
  })
})

describe('session hint', () => {
  it('is written at sign-in with the role only, never a token, and cleared on logout', () => {
    const tokens = track(make('body', scripted().transport))
    tokens.setSession({ accessToken: 'AT-SECRET', refreshToken: 'RT-SECRET', role: 'admin' })
    const raw = window.localStorage.getItem(HINT_KEY) ?? ''
    expect(JSON.parse(raw)).toEqual({ role: 'admin' })
    expect(raw).not.toContain('SECRET')
    expect(readSessionHint()).toEqual({ role: 'admin' })
    tokens.clear()
    expect(readSessionHint()).toBeNull()
  })

  it('rejects an invalid hint', () => {
    window.localStorage.setItem(HINT_KEY, '{"role":"superuser"}')
    expect(readSessionHint()).toBeNull()
    expect(window.localStorage.getItem(HINT_KEY)).toBeNull()
  })

  it('updateRole refreshes the hint from the server-authoritative role', () => {
    const tokens = track(make('body', scripted().transport))
    tokens.setSession({ accessToken: 'AT1', refreshToken: 'RT1', role: 'admin' })
    tokens.updateRole('player')
    expect(readSessionHint()).toEqual({ role: 'player' })
  })
})

describe('no token leakage', () => {
  it('thrown errors, their serialisation and console output never contain tokens or server detail', async () => {
    const spies = (['log', 'info', 'warn', 'error', 'debug'] as const).map((m) =>
      vi.spyOn(console, m).mockImplementation(() => undefined),
    )
    const dirty = { ok: false, status: 401, code: 'AUTH_REQUIRED', reason: 'https://x.test/?token=RT-SECRET' } as const
    const cases: AuthTransport[] = [
      () => Promise.resolve(dirty),
      () => Promise.reject(new Error('boom AT-SECRET RT-SECRET')),
      () => Promise.resolve(ok({ accessToken: '' })),
      () => Promise.resolve(fail(500, 'SERVER_DETAIL_RT-SECRET')),
    ]
    for (const transport of cases) {
      const tokens = track(make('body', transport))
      tokens.setSession({ accessToken: 'AT-SECRET', refreshToken: 'RT-SECRET', role: 'player' })
      const error: unknown = await tokens.refresh().catch((e: unknown) => e)
      expect(error).toBeInstanceOf(TokenError)
      const e = error as TokenError
      const text = `${e.message} ${e.name} ${JSON.stringify(e)} ${e.stack ?? ''}`
      expect(text).not.toContain('SECRET')
      expect(text).not.toContain('http')
      tokens.dispose()
    }
    for (const spy of spies) expect(spy).not.toHaveBeenCalled()
  })

  it('exposes no refresh-token getter', () => {
    const tokens = track(make('body', scripted().transport))
    expect(Object.keys(tokens).some((k) => /refresh.?token/i.test(k))).toBe(false)
  })
})
