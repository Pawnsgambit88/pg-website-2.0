import { describe, expect, it } from 'vitest'
import { createRequester } from '@/lib/api/browser/client'
import { CSRF_BOOTSTRAP_VALUE, type TokenMode } from '@/lib/api/browser/tokens'
import type { FetchLike } from '@/lib/api/http'

function setup(mode: TokenMode | undefined, access: string | null = 'AT1') {
  const seen: { url: string; init: RequestInit }[] = []
  const fetchImpl: FetchLike = (url, init) => {
    seen.push({ url, init })
    return Promise.resolve(
      new Response(JSON.stringify({ success: true, data: null }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }),
    )
  }
  const requester = createRequester({
    tokens: { mode, getAccessToken: () => access, refresh: () => Promise.resolve('AT2') },
    fetchImpl,
    origin: () => 'http://localhost:3000',
    basePath: '/api',
  })
  const headers = (index = 0) => new Headers(seen[index]?.init.headers)
  return { requester, seen, headers }
}

describe('cookie mode CSRF header', () => {
  it('sends X-CSRF-Token (the access token) on unsafe methods and same-origin credentials', async () => {
    const { requester, seen, headers } = setup('cookie')
    await requester.empty({ method: 'POST', path: '/x', body: {}, auth: true })
    expect(headers().get('X-CSRF-Token')).toBe('AT1')
    expect(headers().get('Authorization')).toBe('Bearer AT1')
    expect(seen[0]?.init.credentials).toBe('same-origin')
  })

  it('falls back to the bootstrap marker without an access token and skips GET', async () => {
    const { requester, headers } = setup('cookie', null)
    await requester.empty({ method: 'POST', path: '/auth/login', body: {} })
    await requester.empty({ method: 'GET', path: '/events' })
    expect(headers(0).get('X-CSRF-Token')).toBe(CSRF_BOOTSTRAP_VALUE)
    expect(headers(1).get('X-CSRF-Token')).toBeNull()
  })

  it('sends no CSRF header in body mode', async () => {
    const { requester, headers } = setup('body')
    await requester.empty({ method: 'POST', path: '/x', body: {}, auth: true })
    expect(headers().get('X-CSRF-Token')).toBeNull()
  })
})

describe('step-up header', () => {
  it('sends the grant as X-Step-Up-Token and keeps the access token as Bearer', async () => {
    const { requester, headers } = setup('cookie')
    await requester.empty({ method: 'POST', path: '/admin/x', body: {}, auth: true, stepUpToken: 'SU1' })
    expect(headers().get('X-Step-Up-Token')).toBe('SU1')
    expect(headers().get('Authorization')).toBe('Bearer AT1')
  })
})
