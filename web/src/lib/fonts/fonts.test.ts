import { describe, expect, it, vi } from 'vitest'

// next/font/google is a compile-time transform; in Vitest the real functions are not callable, so stub them to echo the
// options and assert the contract with theme.css (TASK-010): variable names, no cycle, display swap, no italic/600.
vi.mock('next/font/google', () => {
  const make = (family: string) => (opts: { variable: string }) => ({ variable: `cls_${opts.variable}`, family, opts })
  return {
    Newsreader: make('Newsreader'),
    Anek_Latin: make('Anek Latin'),
    Fragment_Mono: make('Fragment Mono'),
  }
})

describe('fonts', () => {
  it('exposes the three CSS variables that theme.css resolves from', async () => {
    const { fontVariables } = await import('./fonts')
    expect(fontVariables).toContain('--font-newsreader')
    expect(fontVariables).toContain('--font-anek-latin')
    expect(fontVariables).toContain('--font-fragment-mono')
  })

  it('never uses the theme token names as font variables (would create a cycle)', async () => {
    const { newsreader, anekLatin, fragmentMono } = await import('./fonts')
    for (const f of [newsreader, anekLatin, fragmentMono]) {
      expect(f.variable).not.toMatch(/--font-(display|ui|mono)\b/)
    }
  })

  it('uses swap, latin preload subset, Fragment Mono 400 only and no italic', async () => {
    const mod = await import('./fonts')
    const opts = [mod.newsreader, mod.anekLatin, mod.fragmentMono].map(
      (f) => (f as unknown as { opts: Record<string, unknown> }).opts,
    )
    for (const o of opts) {
      expect(o.display).toBe('swap')
      expect(o.subsets).toEqual(['latin'])
      expect(o.style).toBe('normal')
    }
    expect(opts[2]?.weight).toBe('400')
    expect(opts[2]?.preload).toBe(false)
  })
})
