// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { defineStore, isStorageAvailable } from '@/lib/storage/versioned'

interface Auth {
  v: 1
  rt: string
}

function parseAuth(value: unknown): Auth | null {
  if (typeof value !== 'object' || value === null) return null
  const record = value as Record<string, unknown>
  return record.v === 1 && typeof record.rt === 'string' ? { v: 1, rt: record.rt } : null
}

const auth = () => defineStore<Auth>({ area: 'local', name: 'auth', version: 1, parse: parseAuth })

beforeEach(() => {
  window.localStorage.clear()
  window.sessionStorage.clear()
})
afterEach(() => {
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
})

describe('keys', () => {
  it('builds pg:<name>:v<N> and supports a per-id suffix', () => {
    expect(auth().key).toBe('pg:auth:v1')
    expect(defineStore({ area: 'session', name: 'builder-draft', version: 3, parse: () => null }).key).toBe(
      'pg:builder-draft:v3',
    )
    expect(defineStore({ area: 'local', name: 'auth:lock', version: 1, parse: () => null }).key).toBe('pg:auth:lock:v1')
    expect(auth().keyFor('evt_42')).toBe('pg:auth:v1:evt_42')
  })

  it('rejects malformed definitions at startup and unsafe suffixes at runtime', () => {
    expect(() => defineStore({ area: 'local', name: 'Auth', version: 1, parse: () => null })).toThrow()
    expect(() => defineStore({ area: 'local', name: 'a b', version: 1, parse: () => null })).toThrow()
    expect(() => defineStore({ area: 'local', name: 'auth', version: 0, parse: () => null })).toThrow()
    expect(() => defineStore({ area: 'local', name: 'auth', version: 1.5, parse: () => null })).toThrow()
    const store = auth()
    expect(store.keyFor('../x')).toBeNull()
    expect(store.keyFor('')).toBeNull()
    expect(store.write({ v: 1, rt: 'x' }, 'a b')).toBe(false)
    expect(store.read('a b')).toBeNull()
    expect(store.remove('a b')).toBe(false)
  })
})

describe('read / write / remove', () => {
  it('round-trips a validated value in the chosen area only', () => {
    const store = auth()
    expect(store.write({ v: 1, rt: 'abc' })).toBe(true)
    expect(window.localStorage.getItem('pg:auth:v1')).toBe('{"v":1,"rt":"abc"}')
    expect(window.sessionStorage.getItem('pg:auth:v1')).toBeNull()
    expect(store.read()).toEqual({ v: 1, rt: 'abc' })
    expect(store.remove()).toBe(true)
    expect(store.read()).toBeNull()
  })

  it('uses sessionStorage for the session area and keeps per-id values apart', () => {
    const drafts = defineStore<{ title: string }>({
      area: 'session',
      name: 'builder-draft',
      version: 1,
      parse: (value) =>
        typeof value === 'object' && value !== null && typeof (value as { title?: unknown }).title === 'string'
          ? (value as { title: string })
          : null,
    })
    drafts.write({ title: 'one' }, 'e1')
    drafts.write({ title: 'two' }, 'e2')
    expect(window.sessionStorage.getItem('pg:builder-draft:v1:e1')).toBe('{"title":"one"}')
    expect(drafts.read('e1')).toEqual({ title: 'one' })
    expect(drafts.read('e2')).toEqual({ title: 'two' })
    expect(drafts.read()).toBeNull()
  })

  it('ignores a value stored under another version (no migration)', () => {
    window.localStorage.setItem('pg:auth:v0', '{"v":1,"rt":"old"}')
    expect(auth().read()).toBeNull()
  })

  it.each([
    ['invalid JSON', '{not json'],
    ['wrong shape', '{"v":2,"rt":"x"}'],
    ['a primitive', '42'],
    ['null literal', 'null'],
  ])('returns null and removes the entry for %s', (_label, raw) => {
    window.localStorage.setItem('pg:auth:v1', raw)
    expect(auth().read()).toBeNull()
    expect(window.localStorage.getItem('pg:auth:v1')).toBeNull()
  })

  it('treats a throwing validator as invalid', () => {
    const store = defineStore<string>({
      area: 'local',
      name: 'x',
      version: 1,
      parse: () => {
        throw new Error('boom')
      },
    })
    window.localStorage.setItem('pg:x:v1', '"a"')
    expect(store.read()).toBeNull()
  })

  it('reports false for values JSON cannot represent', () => {
    const store = defineStore<unknown>({ area: 'local', name: 'x', version: 1, parse: (value) => value })
    expect(store.write(undefined)).toBe(false)
    const circular: Record<string, unknown> = {}
    circular.self = circular
    expect(store.write(circular)).toBe(false)
    expect(store.write(1n)).toBe(false)
  })
})

describe('never throws', () => {
  it('survives quota errors on write', () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new DOMException('full', 'QuotaExceededError')
    })
    expect(auth().write({ v: 1, rt: 'abc' })).toBe(false)
    expect(isStorageAvailable('local')).toBe(false)
  })

  it('survives getItem and removeItem errors', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new DOMException('denied', 'SecurityError')
    })
    vi.spyOn(Storage.prototype, 'removeItem').mockImplementation(() => {
      throw new DOMException('denied', 'SecurityError')
    })
    expect(auth().read()).toBeNull()
    expect(auth().remove()).toBe(false)
  })

  it('survives a browser that throws on access to window.localStorage (blocked storage)', () => {
    vi.spyOn(window, 'localStorage', 'get').mockImplementation(() => {
      throw new DOMException('blocked', 'SecurityError')
    })
    const store = auth()
    expect(store.read()).toBeNull()
    expect(store.write({ v: 1, rt: 'a' })).toBe(false)
    expect(store.remove()).toBe(false)
    expect(isStorageAvailable('local')).toBe(false)
    const unsubscribe = store.subscribe(() => undefined)
    expect(unsubscribe).toBeTypeOf('function')
    unsubscribe()
  })

  it('is a quiet no-op without a window (server render)', () => {
    vi.stubGlobal('window', undefined)
    const store = auth()
    expect(store.read()).toBeNull()
    expect(store.write({ v: 1, rt: 'a' })).toBe(false)
    expect(store.remove()).toBe(false)
    expect(isStorageAvailable('session')).toBe(false)
    const unsubscribe = store.subscribe(() => undefined)
    expect(() => unsubscribe()).not.toThrow()
  })
})

describe('isStorageAvailable', () => {
  it('is true when storage works and leaves nothing behind', () => {
    expect(isStorageAvailable('local')).toBe(true)
    expect(isStorageAvailable('session')).toBe(true)
    expect(window.localStorage.length).toBe(0)
  })
})

describe('subscribe (cross-tab storage event)', () => {
  function fire(init: StorageEventInit) {
    window.dispatchEvent(new StorageEvent('storage', { storageArea: window.localStorage, ...init }))
  }

  it('delivers validated values, removals and invalid data as null, for the watched key only', () => {
    const listener = vi.fn()
    const unsubscribe = auth().subscribe(listener)

    fire({ key: 'pg:auth:v1', newValue: '{"v":1,"rt":"new"}' })
    fire({ key: 'pg:auth:v1', newValue: null })
    fire({ key: 'pg:auth:v1', newValue: '{"v":9}' })
    fire({ key: 'pg:other:v1', newValue: '{"v":1,"rt":"x"}' })
    fire({ key: 'pg:auth:v1', newValue: '{"v":1,"rt":"s"}', storageArea: window.sessionStorage })

    expect(listener.mock.calls).toEqual([
      [{ v: 1, rt: 'new' }, undefined],
      [null, undefined],
      [null, undefined],
    ])
    unsubscribe()
  })

  it('treats a cleared area (key null) as removal', () => {
    const listener = vi.fn()
    const unsubscribe = auth().subscribe(listener)
    fire({ key: null, newValue: null })
    expect(listener).toHaveBeenCalledWith(null, undefined)
    unsubscribe()
  })

  it('watches a per-id key and reports the suffix', () => {
    const listener = vi.fn()
    const unsubscribe = auth().subscribe(listener, 'e1')
    fire({ key: 'pg:auth:v1', newValue: '{"v":1,"rt":"x"}' })
    fire({ key: 'pg:auth:v1:e1', newValue: '{"v":1,"rt":"y"}' })
    expect(listener).toHaveBeenCalledTimes(1)
    expect(listener).toHaveBeenCalledWith({ v: 1, rt: 'y' }, 'e1')
    unsubscribe()
  })

  it('shares one window listener and removes it with the last unsubscribe', () => {
    const add = vi.spyOn(window, 'addEventListener')
    const remove = vi.spyOn(window, 'removeEventListener')
    const storageCalls = (spy: typeof add) => spy.mock.calls.filter(([type]) => type === 'storage').length

    const a = auth().subscribe(() => undefined)
    const b = defineStore({ area: 'local', name: 'session-hint', version: 1, parse: () => null }).subscribe(
      () => undefined,
    )
    expect(storageCalls(add)).toBe(1)
    a()
    expect(storageCalls(remove)).toBe(0)
    b()
    expect(storageCalls(remove)).toBe(1)
    a() // double unsubscribe is harmless
    expect(storageCalls(remove)).toBe(1)
  })

  it('stops delivering after unsubscribe', () => {
    const listener = vi.fn()
    auth().subscribe(listener)()
    fire({ key: 'pg:auth:v1', newValue: null })
    expect(listener).not.toHaveBeenCalled()
  })
})
