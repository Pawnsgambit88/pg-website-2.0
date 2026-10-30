import { describe, expect, it } from 'vitest'
import { createOrderInput, describePaidFailure } from '@/features/registration/paid-registration'
import { ApiError } from '@/lib/api/errors'
import { createOrderInputSchema } from '@/lib/api/types/payment'

const err = (code: ConstructorParameters<typeof ApiError>[0]) => new ApiError(code, { status: 400 })

const REGISTRATION_ID = '550e8400-e29b-41d4-a716-446655440000'

describe('createOrderInput', () => {
  it('sends the registration id only (no price, no amount, no currency)', () => {
    const input = createOrderInput(REGISTRATION_ID)
    expect(input).toEqual({ registrationId: REGISTRATION_ID })
    expect(createOrderInputSchema.safeParse(input).success).toBe(true)
  })
  it('never includes price, amount or currency', () => {
    const input = createOrderInput(REGISTRATION_ID)
    expect(input).not.toHaveProperty('price')
    expect(input).not.toHaveProperty('amount')
    expect(input).not.toHaveProperty('currency')
    expect(input).not.toHaveProperty('pricePaise')
  })
})

describe('describePaidFailure', () => {
  it('maps HOLD_EXPIRED to hold_expired so the player starts again', () => {
    const failure = describePaidFailure(err('HOLD_EXPIRED'))
    expect(failure.kind).toBe('hold_expired')
    expect(failure.title.length).toBeGreaterThan(0)
    expect(failure.body.length).toBeGreaterThan(0)
  })

  it('maps INVALID_SIGNATURE to mismatch (no double-charge worry)', () => {
    const failure = describePaidFailure(err('INVALID_SIGNATURE'))
    expect(failure.kind).toBe('mismatch')
  })

  it('maps PAYMENT_MISMATCH to mismatch', () => {
    const failure = describePaidFailure(err('PAYMENT_MISMATCH'))
    expect(failure.kind).toBe('mismatch')
  })

  it('maps PAYMENT_UNAVAILABLE to unavailable (retry later)', () => {
    const failure = describePaidFailure(err('PAYMENT_UNAVAILABLE'))
    expect(failure.kind).toBe('unavailable')
  })

  it('maps ALREADY_REGISTERED to retry with a calm message', () => {
    const failure = describePaidFailure(err('ALREADY_REGISTERED'))
    expect(failure.kind).toBe('retry')
    expect(failure.title).toContain('registered')
  })

  it('falls back to retry for network and server failures', () => {
    expect(describePaidFailure(err('NETWORK')).kind).toBe('retry')
    expect(describePaidFailure(err('HTTP_5XX')).kind).toBe('retry')
  })

  it('never shows raw server error detail (security)', () => {
    const error = new ApiError('HOLD_EXPIRED', { status: 409, detail: 'secret internal text' })
    const failure = describePaidFailure(error)
    expect(`${failure.title} ${failure.body}`).not.toContain('secret')
  })
})
