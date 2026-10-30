import { describe, expect, it, vi } from 'vitest'
import { exchangePreviewToken } from './exchange.ts'

const TOKEN = 'T'.repeat(43)
const KEY = 'K'.repeat(43)
const SECRET = 'unit-test-preview-secret-0123456789'
const ok = (data: unknown): Response =>
  new Response(JSON.stringify(data), { status: 200, headers: { 'Content-Type': 'application/json' } })

describe('exchangePreviewToken', () => {
  it('posts the token with a bearer secret and returns the validated grant', async () => {
    const fetchImpl = vi.fn(() =>
      Promise.resolve(ok({ path: '/events/spring-open', previewKey: KEY, expiresAt: '2030-01-01T00:00:00+00:00' })),
    )
    const grant = await exchangePreviewToken(TOKEN, { origin: 'http://127.0.0.1:9', secret: SECRET, fetchImpl })
    expect(grant).toMatchObject({ path: '/events/spring-open', previewKey: KEY })
    const [url, init] = fetchImpl.mock.calls[0] as unknown as [string, RequestInit]
    expect(url).toBe('http://127.0.0.1:9/api/preview/exchange')
    expect(init.method).toBe('POST')
    expect((init.headers as Record<string, string>).Authorization).toBe(`Bearer ${SECRET}`)
    expect(init.body).toBe(JSON.stringify({ token: TOKEN }))
    expect(init.cache).toBe('no-store')
  })

  it('rejects a returned path outside the allow-list', async () => {
    for (const path of ['//evil.example', 'https://evil.example', '/admin', '/events/x?y=1']) {
      const fetchImpl = vi.fn(() => Promise.resolve(ok({ path, previewKey: KEY, expiresAt: '2030-01-01T00:00:00Z' })))
      expect(await exchangePreviewToken(TOKEN, { origin: 'http://127.0.0.1:9', secret: SECRET, fetchImpl })).toBeNull()
    }
  })

  it('returns null for a malformed token without calling the backend', async () => {
    const fetchImpl = vi.fn()
    expect(
      await exchangePreviewToken('bad token', { origin: 'http://127.0.0.1:9', secret: SECRET, fetchImpl }),
    ).toBeNull()
    expect(fetchImpl).not.toHaveBeenCalled()
  })

  it('returns null on backend errors and network failures', async () => {
    const reject = vi.fn(() => Promise.resolve(new Response('{}', { status: 422 })))
    expect(
      await exchangePreviewToken(TOKEN, { origin: 'http://127.0.0.1:9', secret: SECRET, fetchImpl: reject }),
    ).toBeNull()
    const boom = vi.fn(() => Promise.reject(new Error('down')))
    expect(
      await exchangePreviewToken(TOKEN, { origin: 'http://127.0.0.1:9', secret: SECRET, fetchImpl: boom }),
    ).toBeNull()
  })
})
