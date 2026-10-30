import { act, render, renderHook, screen } from '@testing-library/react'
import { renderToString } from 'react-dom/server'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { LiveRegion } from '@/components/ui/feedback/LiveRegion'
import { CLEAR_AFTER_MS, REANNOUNCE_DELAY_MS, clearAnnouncement } from '@/lib/hooks/liveAnnouncerStore'
import { useLiveAnnouncer } from '@/lib/hooks/useLiveAnnouncer'
import { expectNoAxeViolations } from '@/test/axe'

beforeEach(() => {
  vi.useFakeTimers()
})
afterEach(() => {
  act(() => clearAnnouncement())
  vi.useRealTimers()
})

const region = () => screen.getByRole('status')

describe('LiveRegion + useLiveAnnouncer', () => {
  it('is a single polite, atomic status region that is present and empty before any announcement', () => {
    render(<LiveRegion />)
    expect(screen.getAllByRole('status')).toHaveLength(1)
    expect(region().getAttribute('aria-live')).toBe('polite')
    expect(region().getAttribute('aria-atomic')).toBe('true')
    expect(region().textContent).toBe('')
    expect(region().className).toContain('sr-only')
  })

  it('announces text after a short delay and clears it later', () => {
    render(<LiveRegion />)
    const { result } = renderHook(() => useLiveAnnouncer())
    act(() => result.current('Saved'))
    expect(region().textContent).toBe('')
    act(() => void vi.advanceTimersByTime(REANNOUNCE_DELAY_MS))
    expect(region().textContent).toBe('Saved')
    act(() => void vi.advanceTimersByTime(CLEAR_AFTER_MS))
    expect(region().textContent).toBe('')
  })

  it('re-announces identical text (region is emptied first)', () => {
    render(<LiveRegion />)
    const { result } = renderHook(() => useLiveAnnouncer())
    act(() => result.current('Payment confirmed'))
    act(() => void vi.advanceTimersByTime(REANNOUNCE_DELAY_MS))
    act(() => result.current('Payment confirmed'))
    expect(region().textContent).toBe('')
    act(() => void vi.advanceTimersByTime(REANNOUNCE_DELAY_MS))
    expect(region().textContent).toBe('Payment confirmed')
  })

  it('lets a newer message replace a pending one', () => {
    render(<LiveRegion />)
    const { result } = renderHook(() => useLiveAnnouncer())
    act(() => {
      result.current('First')
      result.current('Second')
    })
    act(() => void vi.advanceTimersByTime(REANNOUNCE_DELAY_MS))
    expect(region().textContent).toBe('Second')
  })

  it('ignores empty text and keeps the announce function stable', () => {
    render(<LiveRegion />)
    const { result, rerender } = renderHook(() => useLiveAnnouncer())
    const first = result.current
    rerender()
    expect(result.current).toBe(first)
    act(() => result.current('   '))
    act(() => void vi.advanceTimersByTime(REANNOUNCE_DELAY_MS))
    expect(region().textContent).toBe('')
  })

  it('is silent and harmless when no region is mounted', () => {
    const { result } = renderHook(() => useLiveAnnouncer())
    expect(() => {
      act(() => result.current('Nobody listening'))
      act(() => void vi.advanceTimersByTime(CLEAR_AFTER_MS))
    }).not.toThrow()
  })

  it('renders an empty region on the server (no hydration mismatch)', () => {
    expect(renderToString(<LiveRegion />)).toContain('aria-live="polite"')
    expect(renderToString(<LiveRegion />)).not.toContain('Saved')
  })

  it('has no axe violations empty or with a message', async () => {
    vi.useRealTimers()
    const { container } = render(<LiveRegion />)
    await expectNoAxeViolations(container)
    vi.useFakeTimers()
    const { result } = renderHook(() => useLiveAnnouncer())
    act(() => result.current('Registration saved'))
    act(() => void vi.advanceTimersByTime(REANNOUNCE_DELAY_MS))
    vi.useRealTimers()
    expect(region().textContent).toBe('Registration saved')
    await expectNoAxeViolations(container)
  })
})
