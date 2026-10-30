import { describe, expect, it } from 'vitest'
import { assertBuildEnv, checkBuildEnv } from './guard.ts'

describe('checkBuildEnv (build guard)', () => {
  it('rejects mocks on a production build', () => {
    const problems = checkBuildEnv({ VERCEL_ENV: 'production', NEXT_PUBLIC_USE_MOCKS: 'true' })
    expect(problems).toHaveLength(1)
    expect(problems[0]).toMatch(/NEXT_PUBLIC_USE_MOCKS/)
  })

  it('rejects mocks on staging or any unknown hosted target (allow-list)', () => {
    expect(checkBuildEnv({ VERCEL_ENV: 'staging', NEXT_PUBLIC_USE_MOCKS: 'true' })).toHaveLength(1)
    expect(checkBuildEnv({ VERCEL_ENV: 'whatever', NEXT_PUBLIC_USE_MOCKS: 'true' })).toHaveLength(1)
  })

  it('VERCEL_TARGET_ENV wins over VERCEL_ENV (custom environments)', () => {
    expect(
      checkBuildEnv({ VERCEL_ENV: 'preview', VERCEL_TARGET_ENV: 'staging', NEXT_PUBLIC_USE_MOCKS: 'true' }),
    ).toHaveLength(1)
  })

  it('allows mocks on an explicit preview opt-in and locally', () => {
    expect(checkBuildEnv({ VERCEL_ENV: 'preview', NEXT_PUBLIC_USE_MOCKS: 'true' })).toEqual([])
    expect(checkBuildEnv({ NEXT_PUBLIC_USE_MOCKS: 'true' })).toEqual([])
  })

  it('allows a production build with mocks off or unset', () => {
    expect(checkBuildEnv({ VERCEL_ENV: 'production' })).toEqual([])
    expect(checkBuildEnv({ VERCEL_ENV: 'production', NEXT_PUBLIC_USE_MOCKS: 'false' })).toEqual([])
  })

  it('rejects NEXT_PUBLIC variables whose names suggest secrets', () => {
    for (const name of [
      'NEXT_PUBLIC_API_SECRET',
      'NEXT_PUBLIC_AUTH_TOKEN',
      'NEXT_PUBLIC_STRIPE_KEY',
      'NEXT_PUBLIC_db_password',
    ]) {
      expect(checkBuildEnv({ [name]: 'x' }), name).toHaveLength(1)
    }
  })

  it('does not flag server-only variables or ordinary public names', () => {
    expect(checkBuildEnv({ REVALIDATE_SECRET: 'x', NEXT_PUBLIC_SITE_URL: 'https://a.b' })).toEqual([])
  })

  it('assertBuildEnv throws with the problem list', () => {
    expect(() => assertBuildEnv({ VERCEL_ENV: 'production', NEXT_PUBLIC_USE_MOCKS: 'true' })).toThrow(
      /Build environment guard failed/,
    )
  })
})
