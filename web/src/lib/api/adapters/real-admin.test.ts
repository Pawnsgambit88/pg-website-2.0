import { describe, expect, it, vi } from 'vitest'
import { createRealAdminApi, type RealAdminHooks } from '@/lib/api/adapters/real-admin'
import type { ApiRequester, RequestSpec } from '@/lib/api/requester'

function setup() {
  const calls: RequestSpec[] = []
  const http = {
    json: vi.fn((spec: RequestSpec) => {
      calls.push(spec)
      return Promise.resolve({})
    }),
    empty: vi.fn((spec: RequestSpec) => {
      calls.push(spec)
      return Promise.resolve()
    }),
  } as unknown as ApiRequester
  const withConditionalStepUp = vi.fn()
  const hooks: RealAdminHooks = {
    withConditionalStepUp: <T>(run: (token: string | undefined) => Promise<T>) => {
      withConditionalStepUp()
      return run('grant')
    },
  }
  return { api: createRealAdminApi(http, hooks), calls, withConditionalStepUp }
}

describe('createRealAdminApi', () => {
  it('sends authenticated, paged list calls', async () => {
    const { api, calls } = setup()
    await api.events.listEvents({ page: 2 })
    expect(calls[0]).toMatchObject({
      method: 'GET',
      path: '/admin/events',
      auth: true,
      legacyPage: { page: 2, pageSize: 20 },
    })
  })

  it('sends the idempotency key on publish and the step-up token on refund', async () => {
    const { api, calls } = setup()
    const key = '5f1d2c1e-3b6a-4c57-9a5e-0d9d2a1f7b11' as never
    await api.events.publishEvent('e1' as never, key)
    await api.payments.refund('p1' as never, {} as never, key, { stepUp: 'tok' as never })
    expect(calls[0]).toMatchObject({ method: 'POST', path: '/admin/events/e1/publish', idempotencyKey: key })
    expect(calls[1]).toMatchObject({ path: '/admin/payments/p1/refund', stepUpToken: 'tok', idempotencyKey: key })
  })

  it('routes conditional step-up calls through the hook', async () => {
    const { api, calls, withConditionalStepUp } = setup()
    await api.events.updateEvent('e1' as never, {} as never)
    expect(withConditionalStepUp).toHaveBeenCalledOnce()
    expect(calls[0]).toMatchObject({ method: 'PATCH', stepUpToken: 'grant' })
  })

  it('saves a CMS draft as { version, content } on the key path', async () => {
    const { api, calls } = setup()
    await api.cms.saveSectionDraft({ key: 'home', version: 3, content: { a: 1 } } as never)
    expect(calls[0]).toMatchObject({
      method: 'PUT',
      path: '/admin/cms/sections/home/draft',
      body: { version: 3, content: { a: 1 } },
    })
  })
})
