import { describe, expect, it, vi } from 'vitest'
import type { AuthRequest, AuthResponse, AuthTransport } from '@/lib/api/browser/auth-transport'
import { TokenError } from '@/lib/api/browser/auth-transport'
import { createStepUp, isStepUpRequired, STEP_UP_MARGIN_MS, STEP_UP_TTL_MS } from '@/lib/api/browser/step-up'

const ok = (data: unknown): AuthResponse => ({ ok: true, data })
const stepUpRequired = () => new TokenError('STEP_UP_REQUIRED', 401)

function setup(responses: AuthResponse[] = [ok({ accessToken: 'SU1' })], start = 0) {
  const calls: AuthRequest[] = []
  const queue = [...responses]
  const transport: AuthTransport = (request) => {
    calls.push(request)
    return Promise.resolve(queue.shift() ?? ok({ accessToken: 'SU-extra' }))
  }
  const clock = { now: start }
  const stepUp = createStepUp({ transport, getAccessToken: () => 'AT1', now: () => clock.now })
  return { stepUp, calls, clock }
}

describe('authenticate', () => {
  it('posts the password with the current bearer and caches a 5 minute in-memory grant', async () => {
    const { stepUp, calls, clock } = setup()
    const grant = await stepUp.authenticate('hunter2')
    expect(calls).toEqual([
      { method: 'POST', path: '/auth/step-up', body: { password: 'hunter2' }, bearer: 'AT1', withCredentials: false },
    ])
    expect(grant).toEqual({ token: 'SU1', expiresAt: STEP_UP_TTL_MS })
    expect(stepUp.getGrant()?.token).toBe('SU1')
    clock.now = STEP_UP_TTL_MS - STEP_UP_MARGIN_MS
    expect(stepUp.getGrant()).toBeNull() // dropped before it can expire in flight
  })

  it('wrong password: TokenError without the password or server detail', async () => {
    const { stepUp } = setup([{ ok: false, status: 401, code: 'INVALID_CREDENTIALS', reason: 'hunter2' }])
    const error: unknown = await stepUp.authenticate('hunter2').catch((e: unknown) => e)
    expect(error).toMatchObject({ code: 'INVALID_CREDENTIALS', status: 401 })
    const e = error as TokenError
    expect(`${e.message}${JSON.stringify(e)}${e.stack ?? ''}`).not.toContain('hunter2')
    expect(stepUp.getGrant()).toBeNull()
  })

  it('maps a transport failure to NETWORK and a malformed body to BAD_RESPONSE', async () => {
    const down = createStepUp({ transport: () => Promise.reject(new Error('pw=hunter2')), getAccessToken: () => 'AT1' })
    await expect(down.authenticate('hunter2')).rejects.toMatchObject({ code: 'NETWORK' })
    const { stepUp } = setup([ok({ accessToken: 5 })])
    await expect(stepUp.authenticate('x')).rejects.toMatchObject({ code: 'BAD_RESPONSE' })
  })
})

describe('withStepUp', () => {
  it('passes straight through when the action succeeds (no prompt)', async () => {
    const { stepUp, calls } = setup()
    const prompt = vi.fn(() => Promise.resolve('pw'))
    await expect(stepUp.withStepUp(() => Promise.resolve('done'), prompt)).resolves.toBe('done')
    expect(prompt).not.toHaveBeenCalled()
    expect(calls).toHaveLength(0)
  })

  it('on STEP_UP_REQUIRED prompts, authenticates and retries exactly once with the grant', async () => {
    const { stepUp, calls } = setup()
    const action = vi
      .fn<(grant: { token: string } | null) => Promise<string>>()
      .mockRejectedValueOnce(stepUpRequired())
      .mockResolvedValueOnce('refunded')
    const prompt = vi.fn(() => Promise.resolve('pw'))
    await expect(stepUp.withStepUp(action, prompt)).resolves.toBe('refunded')
    expect(action).toHaveBeenCalledTimes(2)
    expect(action.mock.calls[0]?.[0]).toBeNull()
    expect(action.mock.calls[1]?.[0]).toMatchObject({ token: 'SU1' })
    expect(prompt).toHaveBeenCalledTimes(1)
    expect(calls).toHaveLength(1)
  })

  it('does not loop: a second STEP_UP_REQUIRED is rethrown after one retry', async () => {
    const { stepUp } = setup()
    const action = vi.fn(() => Promise.reject(stepUpRequired()))
    await expect(stepUp.withStepUp(action, () => Promise.resolve('pw'))).rejects.toMatchObject({
      code: 'STEP_UP_REQUIRED',
    })
    expect(action).toHaveBeenCalledTimes(2)
  })

  it('a cancelled prompt rethrows the original error without retrying', async () => {
    const { stepUp, calls } = setup()
    const action = vi.fn(() => Promise.reject(stepUpRequired()))
    await expect(stepUp.withStepUp(action, () => Promise.resolve(null))).rejects.toMatchObject({
      code: 'STEP_UP_REQUIRED',
    })
    expect(action).toHaveBeenCalledTimes(1)
    expect(calls).toHaveLength(0)
  })

  it('other errors pass through without prompting', async () => {
    const { stepUp } = setup()
    const prompt = vi.fn(() => Promise.resolve('pw'))
    await expect(
      stepUp.withStepUp(() => Promise.reject(new TokenError('EVENT_NOT_FOUND', 404)), prompt),
    ).rejects.toMatchObject({
      code: 'EVENT_NOT_FOUND',
    })
    expect(prompt).not.toHaveBeenCalled()
  })

  it('uses a still-valid cached grant on the first attempt, then drops it if the server rejects it', async () => {
    const { stepUp } = setup([ok({ accessToken: 'SU1' }), ok({ accessToken: 'SU2' })])
    await stepUp.authenticate('pw')
    const seen: (string | undefined)[] = []
    let first = true
    await stepUp.withStepUp(
      (grant) => {
        seen.push(grant?.token)
        if (first) {
          first = false
          return Promise.reject(stepUpRequired())
        }
        return Promise.resolve('ok')
      },
      () => Promise.resolve('pw'),
    )
    expect(seen).toEqual(['SU1', 'SU2'])
  })

  it('concurrent sensitive actions share one prompt and one step-up call', async () => {
    const { stepUp, calls } = setup()
    const prompt = vi.fn(() => Promise.resolve('pw'))
    const make = () => {
      let first = true
      return () => {
        if (first) {
          first = false
          return Promise.reject(stepUpRequired())
        }
        return Promise.resolve('ok')
      }
    }
    await Promise.all([stepUp.withStepUp(make(), prompt), stepUp.withStepUp(make(), prompt)])
    expect(prompt).toHaveBeenCalledTimes(1)
    expect(calls).toHaveLength(1)
  })

  it('the grant is dropped when the session ends', async () => {
    let end: () => void = () => undefined
    const stepUp = createStepUp({
      transport: () => Promise.resolve(ok({ accessToken: 'SU1' })),
      getAccessToken: () => 'AT1',
      subscribeSessionEnd: (listener) => {
        end = listener
        return () => undefined
      },
    })
    await stepUp.authenticate('pw')
    expect(stepUp.getGrant()).not.toBeNull()
    end()
    expect(stepUp.getGrant()).toBeNull()
  })
})

describe('isStepUpRequired', () => {
  it('recognises any error carrying the code, and nothing else', () => {
    expect(isStepUpRequired(stepUpRequired())).toBe(true)
    expect(isStepUpRequired({ code: 'STEP_UP_REQUIRED' })).toBe(true)
    expect(isStepUpRequired(new Error('STEP_UP_REQUIRED'))).toBe(false)
    expect(isStepUpRequired(null)).toBe(false)
  })
})

describe('single use', () => {
  it('hands a cached grant to one action only', async () => {
    const { stepUp } = setup()
    await stepUp.authenticate('pw')
    const seen: (string | undefined)[] = []
    await stepUp.withStepUp(
      (grant) => Promise.resolve(seen.push(grant?.token)),
      () => Promise.resolve(null),
    )
    await stepUp.withStepUp(
      (grant) => Promise.resolve(seen.push(grant?.token)),
      () => Promise.resolve(null),
    )
    expect(seen).toEqual(['SU1', undefined])
  })
})
