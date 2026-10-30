import { describe, expect, it, vi } from 'vitest'
import type { ApiRequester, RequestSpec } from '@/lib/api/requester'
import { parseSlug } from '@/lib/api/types/primitives'
import { createRealPublicApi } from './real.ts'

const slug = parseSlug('spring-open')
const KEY = 'K'.repeat(43)

function recorder(): { http: ApiRequester; specs: RequestSpec[] } {
  const specs: RequestSpec[] = []
  const http: ApiRequester = {
    json: vi.fn((spec: RequestSpec) => {
      specs.push(spec)
      return Promise.reject(new Error('stop'))
    }) as unknown as ApiRequester['json'],
    empty: vi.fn(),
  }
  return { http, specs }
}

describe('public reads with a preview key', () => {
  it('send X-Preview-Key only when a key is given', async () => {
    if (slug === null) throw new Error('slug')
    const { http, specs } = recorder()
    const api = createRealPublicApi(http)
    await api.getEventBySlug(slug, { tags: ['events'], revalidate: 900 }).catch(() => undefined)
    await api.getEventBySlug(slug, { previewKey: KEY }).catch(() => undefined)
    expect(specs[0]?.headers).toBeUndefined()
    expect(specs[0]?.tags).toEqual(['events'])
    expect(specs[1]?.headers).toEqual({ 'X-Preview-Key': KEY })
  })
})
