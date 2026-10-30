import { afterEach, describe, expect, it, vi } from 'vitest'
import { previewLinkSchema } from '@/lib/api/types/admin/preview'
import { backendUrlSchema } from '@/lib/api/types/primitives'

const LOCAL_PREVIEW = { url: 'http://localhost:3000/api/draft?token=abc', expiresAt: '2030-01-01T00:00:00.000Z' }
const HTTPS_PREVIEW = { url: 'https://pawnsgambit.in/api/draft?token=abc', expiresAt: '2030-01-01T00:00:00.000Z' }

afterEach(() => {
  vi.unstubAllEnvs()
})

describe('backendUrlSchema', () => {
  it('accepts http outside production', () => {
    vi.stubEnv('NODE_ENV', 'development')
    expect(backendUrlSchema.safeParse('http://localhost:54321/storage/v1/upload').success).toBe(true)
    expect(previewLinkSchema.safeParse(LOCAL_PREVIEW).success).toBe(true)
  })

  it('stays https-only in production', () => {
    vi.stubEnv('NODE_ENV', 'production')
    expect(backendUrlSchema.safeParse('http://localhost:54321/storage/v1/upload').success).toBe(false)
    expect(backendUrlSchema.safeParse('https://example.supabase.co/upload').success).toBe(true)
    expect(previewLinkSchema.safeParse(LOCAL_PREVIEW).success).toBe(false)
    expect(previewLinkSchema.safeParse(HTTPS_PREVIEW).success).toBe(true)
  })

  it('still rejects other schemes and credentials', () => {
    vi.stubEnv('NODE_ENV', 'development')
    expect(backendUrlSchema.safeParse('javascript:alert(1)').success).toBe(false)
    expect(backendUrlSchema.safeParse('http://user:pw@localhost/x').success).toBe(false)
  })
})
