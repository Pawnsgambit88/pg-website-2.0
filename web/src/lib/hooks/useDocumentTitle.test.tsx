import { renderHook } from '@testing-library/react'
import { beforeEach, describe, expect, it } from 'vitest'
import { useDocumentTitle } from '@/lib/hooks/useDocumentTitle'

beforeEach(() => {
  document.title = 'Pawn’s Gambit'
})

describe('useDocumentTitle', () => {
  it('sets the title and restores the previous one on unmount', () => {
    const { unmount } = renderHook(() => useDocumentTitle('Sign in | Pawn’s Gambit'))
    expect(document.title).toBe('Sign in | Pawn’s Gambit')
    unmount()
    expect(document.title).toBe('Pawn’s Gambit')
  })

  it('updates when the title changes', () => {
    const { rerender } = renderHook(({ title }) => useDocumentTitle(title), { initialProps: { title: 'One' } })
    expect(document.title).toBe('One')
    rerender({ title: 'Two' })
    expect(document.title).toBe('Two')
  })

  it('never blanks the title', () => {
    renderHook(() => useDocumentTitle('   '))
    expect(document.title).toBe('Pawn’s Gambit')
  })

  it('unwinds nested users in order', () => {
    const outer = renderHook(() => useDocumentTitle('Outer'))
    const inner = renderHook(() => useDocumentTitle('Inner'))
    expect(document.title).toBe('Inner')
    inner.unmount()
    expect(document.title).toBe('Outer')
    outer.unmount()
    expect(document.title).toBe('Pawn’s Gambit')
  })
})
