import { describe, expect, it } from 'vitest'
import { parseServerEnv } from './server-schema.ts'

const secret = 'x'.repeat(32)

describe('parseServerEnv', () => {
  it('allows an empty environment when mocks are on', () => {
    const env = parseServerEnv({}, { mocks: true })
    expect(env.API_INTERNAL_URL).toBeUndefined()
    expect(env.REVALIDATE_SECRET).toBeUndefined()
  })

  it('fails fast when mocks are off and required variables are missing', () => {
    expect(() => parseServerEnv({}, { mocks: false })).toThrow(
      /API_INTERNAL_URL[\s\S]*REVALIDATE_SECRET|REVALIDATE_SECRET[\s\S]*API_INTERNAL_URL/,
    )
  })

  it('accepts a complete real-backend environment and strips trailing slashes', () => {
    const env = parseServerEnv(
      { API_INTERNAL_URL: 'https://api.example.com/', REVALIDATE_SECRET: secret },
      { mocks: false },
    )
    expect(env.API_INTERNAL_URL).toBe('https://api.example.com')
    expect(env.REVALIDATE_SECRET).toBe(secret)
  })

  it('rejects a short secret', () => {
    expect(() => parseServerEnv({ REVALIDATE_SECRET: 'short' }, { mocks: true })).toThrow(/REVALIDATE_SECRET/)
  })

  it('rejects a non-http API URL', () => {
    expect(() => parseServerEnv({ API_INTERNAL_URL: 'ftp://x' }, { mocks: true })).toThrow(/API_INTERNAL_URL/)
  })

  it('treats empty strings as unset', () => {
    const env = parseServerEnv({ API_INTERNAL_URL: '', REVALIDATE_SECRET: '' }, { mocks: true })
    expect(env.API_INTERNAL_URL).toBeUndefined()
    expect(env.REVALIDATE_SECRET).toBeUndefined()
  })
})
