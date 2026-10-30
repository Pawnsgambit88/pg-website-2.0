// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { clearSessionHint, readSessionHint, subscribeSessionHint, writeSessionHint } from '@/lib/auth/session-hint'

beforeEach(() => {
  window.localStorage.clear()
})

describe('session hint', () => {
  it('stores only the role under pg:session-hint:v1', () => {
    expect(writeSessionHint('player')).toBe(true)
    expect(window.localStorage.getItem('pg:session-hint:v1')).toBe('{"role":"player"}')
    expect(readSessionHint()).toEqual({ role: 'player' })
    expect(clearSessionHint()).toBe(true)
    expect(readSessionHint()).toBeNull()
  })

  it('ignores extra fields and unknown roles', () => {
    window.localStorage.setItem('pg:session-hint:v1', '{"role":"admin","token":"x"}')
    expect(readSessionHint()).toEqual({ role: 'admin' })
    window.localStorage.setItem('pg:session-hint:v1', '{"role":"root"}')
    expect(readSessionHint()).toBeNull()
  })

  it('notifies on cross-tab changes and removals', () => {
    const listener = vi.fn()
    const off = subscribeSessionHint(listener)
    window.dispatchEvent(
      new StorageEvent('storage', {
        key: 'pg:session-hint:v1',
        newValue: '{"role":"admin"}',
        storageArea: window.localStorage,
      }),
    )
    window.dispatchEvent(
      new StorageEvent('storage', { key: 'pg:session-hint:v1', newValue: null, storageArea: window.localStorage }),
    )
    expect(listener).toHaveBeenNthCalledWith(1, { role: 'admin' })
    expect(listener).toHaveBeenNthCalledWith(2, null)
    off()
  })

  it('returns false instead of throwing when storage is blocked', () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('blocked')
    })
    expect(writeSessionHint('player')).toBe(false)
  })
})
