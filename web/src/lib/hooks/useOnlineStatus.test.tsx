import { act, renderHook } from '@testing-library/react'
import { renderToString } from 'react-dom/server'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { useOnlineStatus } from '@/lib/hooks/useOnlineStatus'

function setOnline(value: boolean) {
  vi.spyOn(window.navigator, 'onLine', 'get').mockReturnValue(value)
}
afterEach(() => {
  vi.restoreAllMocks()
})

describe('useOnlineStatus', () => {
  it('reports navigator.onLine and follows online/offline events', () => {
    setOnline(true)
    const { result } = renderHook(() => useOnlineStatus())
    expect(result.current).toBe(true)
    act(() => {
      setOnline(false)
      window.dispatchEvent(new Event('offline'))
    })
    expect(result.current).toBe(false)
    act(() => {
      setOnline(true)
      window.dispatchEvent(new Event('online'))
    })
    expect(result.current).toBe(true)
  })

  it('starts offline when the browser is already offline', () => {
    setOnline(false)
    const { result } = renderHook(() => useOnlineStatus())
    expect(result.current).toBe(false)
  })

  it('assumes online on the server', () => {
    function Probe() {
      return <span>{String(useOnlineStatus())}</span>
    }
    setOnline(false)
    expect(renderToString(<Probe />)).toContain('true')
  })

  it('shares one listener pair and removes it on the last unmount', () => {
    setOnline(true)
    const add = vi.spyOn(window, 'addEventListener')
    const remove = vi.spyOn(window, 'removeEventListener')
    const count = (spy: typeof add, type: string) => spy.mock.calls.filter(([name]) => name === type).length
    const a = renderHook(() => useOnlineStatus())
    const b = renderHook(() => useOnlineStatus())
    expect(count(add, 'online')).toBe(1)
    expect(count(add, 'offline')).toBe(1)
    a.unmount()
    expect(count(remove, 'online')).toBe(0)
    b.unmount()
    expect(count(remove, 'online')).toBe(1)
    expect(count(remove, 'offline')).toBe(1)
  })
})
