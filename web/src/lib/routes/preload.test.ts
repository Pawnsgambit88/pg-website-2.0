import { afterEach, describe, expect, it, vi } from 'vitest'
import { createPreload } from './preload.ts'

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('createPreload', () => {
  it('does nothing on the server (no window)', () => {
    const load = vi.fn(() => Promise.resolve())
    createPreload(load)()
    expect(load).not.toHaveBeenCalled()
  })

  it('loads once however many times intent fires', () => {
    vi.stubGlobal('window', {})
    const load = vi.fn(() => Promise.resolve())
    const preload = createPreload(load)
    preload()
    preload()
    preload()
    expect(load).toHaveBeenCalledTimes(1)
  })

  it('forgets a failed load so the next intent retries, and never throws', async () => {
    vi.stubGlobal('window', {})
    const load = vi.fn(() => Promise.reject(new Error('chunk failed')))
    const preload = createPreload(load)
    preload()
    await Promise.resolve()
    await Promise.resolve()
    preload()
    expect(load).toHaveBeenCalledTimes(2)
  })
})
