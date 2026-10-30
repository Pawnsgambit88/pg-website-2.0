import { describe, expect, it } from 'vitest'
import { parsePublicEnv } from './public-schema.ts'

describe('parsePublicEnv', () => {
  it('applies safe defaults for an empty environment', () => {
    const env = parsePublicEnv({})
    expect(env.USE_MOCKS).toBe(false)
    expect(env.API_BASE_URL).toBe('/api')
    expect(env.SITE_URL).toBe('http://localhost:3000')
    expect(env.GOOGLE_AUTH).toBe(false)
    expect(env.RAZORPAY_ENABLED).toBe(false)
    expect(env.CONTACT_MODE).toBe('form')
    expect(env.SUPABASE_STORAGE_HOST).toBeUndefined()
  })

  it('enables a flag only for the literal string "true"', () => {
    expect(parsePublicEnv({ NEXT_PUBLIC_USE_MOCKS: 'true' }).USE_MOCKS).toBe(true)
    expect(parsePublicEnv({ NEXT_PUBLIC_USE_MOCKS: 'false' }).USE_MOCKS).toBe(false)
  })

  it('rejects a flag with any other value', () => {
    expect(() => parsePublicEnv({ NEXT_PUBLIC_USE_MOCKS: '1' })).toThrow(/NEXT_PUBLIC_USE_MOCKS/)
    expect(() => parsePublicEnv({ NEXT_PUBLIC_GOOGLE_AUTH: 'yes' })).toThrow(/NEXT_PUBLIC_GOOGLE_AUTH/)
  })

  it('requires an absolute http(s) site URL and strips trailing slashes', () => {
    expect(parsePublicEnv({ NEXT_PUBLIC_SITE_URL: 'https://example.com/' }).SITE_URL).toBe('https://example.com')
    expect(() => parsePublicEnv({ NEXT_PUBLIC_SITE_URL: 'example.com' })).toThrow(/NEXT_PUBLIC_SITE_URL/)
    expect(() => parsePublicEnv({ NEXT_PUBLIC_SITE_URL: 'javascript:alert(1)' })).toThrow(/NEXT_PUBLIC_SITE_URL/)
  })

  it('requires a relative API base path', () => {
    expect(parsePublicEnv({ NEXT_PUBLIC_API_BASE_URL: '/api' }).API_BASE_URL).toBe('/api')
    expect(() => parsePublicEnv({ NEXT_PUBLIC_API_BASE_URL: 'https://evil.example/api' })).toThrow(
      /NEXT_PUBLIC_API_BASE_URL/,
    )
  })

  it('treats empty optional strings as undefined', () => {
    expect(parsePublicEnv({ NEXT_PUBLIC_MEDIA_BUCKET: '' }).MEDIA_BUCKET).toBeUndefined()
  })

  it('reports every invalid variable in one error', () => {
    expect(() =>
      parsePublicEnv({ NEXT_PUBLIC_USE_MOCKS: 'maybe', NEXT_PUBLIC_CONTACT_MODE: 'carrier-pigeon' }),
    ).toThrow(/NEXT_PUBLIC_USE_MOCKS[\s\S]*NEXT_PUBLIC_CONTACT_MODE/)
  })
})
