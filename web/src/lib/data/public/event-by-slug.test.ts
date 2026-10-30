import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ApiError } from '@/lib/api/errors'

vi.mock('server-only', () => ({}))
vi.mock('react', async (importOriginal) => ({
  ...(await importOriginal<typeof import('react')>()),
  cache: <T>(fn: T) => fn,
}))

const getEventBySlugApi = vi.fn()
const publicReadOpts = vi.fn()
vi.mock('@/lib/api/adapters/getPublicApi.server', () => ({ getPublicApi: () => ({ getEventBySlug: getEventBySlugApi }) }))
vi.mock('@/lib/preview/server', () => ({ publicReadOpts: (tags: string[]) => publicReadOpts(tags) }))

const { getEventBySlug, INCOMPLETE_DRAFT } = await import('@/lib/data/public/event-by-slug')

const badResponse = () => new ApiError('BAD_RESPONSE', { status: 200 })

describe('getEventBySlug draft handling', () => {
  beforeEach(() => {
    getEventBySlugApi.mockReset()
    publicReadOpts.mockReset()
  })

  it('returns the incomplete-draft state in draft mode when the draft fails the schema', async () => {
    publicReadOpts.mockResolvedValue({ previewKey: 'a'.repeat(32) })
    getEventBySlugApi.mockRejectedValue(badResponse())
    await expect(getEventBySlug('spring-open')).resolves.toBe(INCOMPLETE_DRAFT)
  })

  it('keeps published reads strict: BAD_RESPONSE still throws', async () => {
    publicReadOpts.mockResolvedValue({ tags: ['events'], revalidate: 900 })
    getEventBySlugApi.mockRejectedValue(badResponse())
    await expect(getEventBySlug('spring-open')).rejects.toBeInstanceOf(ApiError)
  })

  it('does not hide other failures in draft mode', async () => {
    publicReadOpts.mockResolvedValue({ previewKey: 'a'.repeat(32) })
    getEventBySlugApi.mockRejectedValue(new ApiError('NETWORK', { status: 503 }))
    await expect(getEventBySlug('spring-open')).rejects.toBeInstanceOf(ApiError)
  })
})
