import { act, renderHook } from '@testing-library/react'
import { renderToString } from 'react-dom/server'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useMediaQuery } from '@/lib/hooks/useMediaQuery'
import { useReducedMotion } from '@/lib/hooks/useReducedMotion'

// A controllable matchMedia: one MediaQueryList per query string, so tests can flip it and count listeners.
interface FakeList {
  matches: boolean
  listeners: Set<() => void>
  addEventListener: (type: string, listener: () => void) => void
  removeEventListener: (type: string, listener: () => void) => void
}
const lists = new Map<string, FakeList>()
let matchMediaCalls = 0

function fakeList(query: string): FakeList {
  let list = lists.get(query)
  if (list === undefined) {
    const listeners = new Set<() => void>()
    list = {
      matches: false,
      listeners,
      addEventListener: (_type, listener) => listeners.add(listener),
      removeEventListener: (_type, listener) => listeners.delete(listener),
    }
    lists.set(query, list)
  }
  return list
}

function setMatches(query: string, matches: boolean) {
  const list = fakeList(query)
  list.matches = matches
  act(() => {
    for (const listener of [...list.listeners]) listener()
  })
}

beforeEach(() => {
  lists.clear()
  matchMediaCalls = 0
  vi.stubGlobal(
    'matchMedia',
    vi.fn((query: string) => {
      matchMediaCalls += 1
      return fakeList(query)
    }),
  )
})
afterEach(() => {
  vi.unstubAllGlobals()
})

describe('useMediaQuery', () => {
  it('returns the current match and follows changes', () => {
    fakeList('(min-width: 720px)').matches = true
    const { result } = renderHook(() => useMediaQuery('(min-width: 720px)'))
    expect(result.current).toBe(true)
    setMatches('(min-width: 720px)', false)
    expect(result.current).toBe(false)
    setMatches('(min-width: 720px)', true)
    expect(result.current).toBe(true)
  })

  it('renders the server value on the server, so server and first client render agree', () => {
    function Probe({ serverValue }: { serverValue?: boolean }) {
      return <span>{String(useMediaQuery('(min-width: 720px)', serverValue))}</span>
    }
    fakeList('(min-width: 720px)').matches = true
    expect(renderToString(<Probe />)).toContain('false')
    expect(renderToString(<Probe serverValue />)).toContain('true')
  })

  it('shares one listener per query and removes it when the last user unmounts', () => {
    const query = '(min-width: 960px)'
    const a = renderHook(() => useMediaQuery(query))
    const b = renderHook(() => useMediaQuery(query))
    expect(fakeList(query).listeners.size).toBe(1)
    expect(matchMediaCalls).toBeGreaterThan(0)
    a.unmount()
    expect(fakeList(query).listeners.size).toBe(1)
    b.unmount()
    expect(fakeList(query).listeners.size).toBe(0)
  })

  it('switches subscription when the query changes', () => {
    fakeList('(min-width: 480px)').matches = true
    const { result, rerender } = renderHook(({ query }) => useMediaQuery(query), {
      initialProps: { query: '(min-width: 480px)' },
    })
    expect(result.current).toBe(true)
    rerender({ query: '(min-width: 1200px)' })
    expect(result.current).toBe(false)
    expect(fakeList('(min-width: 480px)').listeners.size).toBe(0)
    expect(fakeList('(min-width: 1200px)').listeners.size).toBe(1)
  })

  it('falls back to the server value when matchMedia is missing', () => {
    vi.stubGlobal('matchMedia', undefined)
    const { result } = renderHook(() => useMediaQuery('(min-width: 720px)', true))
    expect(result.current).toBe(true)
  })
})

describe('useReducedMotion', () => {
  it('tracks prefers-reduced-motion: reduce', () => {
    const query = '(prefers-reduced-motion: reduce)'
    const { result } = renderHook(() => useReducedMotion())
    expect(result.current).toBe(false)
    setMatches(query, true)
    expect(result.current).toBe(true)
  })

  it('is true immediately when the user already prefers reduced motion', () => {
    fakeList('(prefers-reduced-motion: reduce)').matches = true
    const { result } = renderHook(() => useReducedMotion())
    expect(result.current).toBe(true)
  })

  it('renders "motion allowed" on the server', () => {
    function Probe() {
      return <span>{String(useReducedMotion())}</span>
    }
    fakeList('(prefers-reduced-motion: reduce)').matches = true
    expect(renderToString(<Probe />)).toContain('false')
  })
})
