import { afterEach, describe, expect, it } from 'vitest'
import { formatEventDate, formatEventDateTime, formatTimeRange } from '@/lib/format/date'
import { parseInstant, toIstParts } from '@/lib/format/instant'

// 2026-10-24 is a Saturday. 17:00 IST is 11:30 UTC.
const SAT_5PM_IST = '2026-10-24T17:00:00+05:30'
const SAT_830PM_IST = '2026-10-24T20:30:00+05:30'

describe('formatEventDate', () => {
  it('formats on the IST calendar', () => {
    expect(formatEventDate(SAT_5PM_IST)).toBe('Sat, 24 Oct 2026')
    expect(formatEventDate(SAT_5PM_IST, { weekday: 'long' })).toBe('Saturday, 24 Oct 2026')
    expect(formatEventDate(SAT_5PM_IST, { weekday: 'none' })).toBe('24 Oct 2026')
    expect(formatEventDate(SAT_5PM_IST, { weekday: 'none', year: false })).toBe('24 Oct')
    expect(formatEventDate(SAT_5PM_IST, { year: false })).toBe('Sat, 24 Oct')
  })

  it('accepts a Date, epoch milliseconds and Z or offset strings for the same instant', () => {
    const expected = 'Sat, 24 Oct 2026'
    expect(formatEventDate(new Date('2026-10-24T11:30:00Z'))).toBe(expected)
    expect(formatEventDate(Date.UTC(2026, 9, 24, 11, 30))).toBe(expected)
    expect(formatEventDate('2026-10-24T11:30:00Z')).toBe(expected)
    expect(formatEventDate('2026-10-24T11:30:00.000z')).toBe(expected)
    expect(formatEventDate('2026-10-24T06:30:00-05:00')).toBe(expected)
  })

  it('rolls the IST date at midnight IST (18:30 UTC), not at UTC midnight', () => {
    expect(formatEventDate('2026-10-24T18:29:59Z')).toBe('Sat, 24 Oct 2026')
    expect(formatEventDate('2026-10-24T18:30:00Z')).toBe('Sun, 25 Oct 2026')
    // 00:00 UTC is already 05:30 IST the same date; 23:59 UTC is the next IST day.
    expect(formatEventDate('2026-10-24T00:00:00Z')).toBe('Sat, 24 Oct 2026')
    expect(formatEventDate('2026-10-24T23:59:00Z')).toBe('Sun, 25 Oct 2026')
  })

  it('handles month, year and leap-day boundaries in IST', () => {
    expect(formatEventDate('2026-10-31T18:30:00Z')).toBe('Sun, 1 Nov 2026')
    expect(formatEventDate('2026-12-31T18:30:00Z')).toBe('Fri, 1 Jan 2027')
    expect(formatEventDate('2028-02-28T18:30:00Z')).toBe('Tue, 29 Feb 2028')
    expect(formatEventDate('2027-02-28T18:30:00Z')).toBe('Mon, 1 Mar 2027')
  })

  it('gives an em dash for invalid input and never throws', () => {
    for (const bad of [
      'not a date',
      '',
      '2026-10-24',
      '2026-10-24T17:00:00', // no offset: would depend on the system time zone
      '2026-02-30T00:00:00Z',
      '2026-13-01T00:00:00Z',
      '2026-10-24T24:00:00Z',
      '2026-10-24T17:60:00Z',
      '2026-10-24T17:00:00+25:00',
      Number.NaN,
      Infinity,
      8.64e15 + 1,
      new Date(Number.NaN),
    ]) {
      expect(formatEventDate(bad)).toBe('—')
      expect(formatEventDateTime(bad)).toBe('—')
      expect(formatTimeRange(bad)).toBe('—')
    }
    expect(formatEventDate(null as unknown as string)).toBe('—')
    expect(formatEventDate(undefined as unknown as string)).toBe('—')
  })
})

describe('formatEventDateTime', () => {
  it('names IST explicitly', () => {
    expect(formatEventDateTime(SAT_5PM_IST)).toBe('Sat, 24 Oct 2026, 5:00 PM IST')
    expect(formatEventDateTime(SAT_5PM_IST, { weekday: 'long', year: false })).toBe('Saturday, 24 Oct, 5:00 PM IST')
  })
})

describe('formatTimeRange', () => {
  it('shows a single time with IST', () => {
    expect(formatTimeRange(SAT_5PM_IST)).toBe('5:00 PM IST')
    expect(formatTimeRange(SAT_5PM_IST, null)).toBe('5:00 PM IST')
    expect(formatTimeRange(SAT_5PM_IST, undefined)).toBe('5:00 PM IST')
  })

  it('shows a range with IST named once, using the 12-hour clock', () => {
    expect(formatTimeRange(SAT_5PM_IST, SAT_830PM_IST)).toBe('5:00 PM – 8:30 PM IST')
    expect(formatTimeRange('2026-10-25T11:00:00+05:30', '2026-10-25T14:00:00+05:30')).toBe('11:00 AM – 2:00 PM IST')
  })

  it('renders noon and midnight as 12 PM and 12 AM', () => {
    expect(formatTimeRange('2026-10-24T12:00:00+05:30')).toBe('12:00 PM IST')
    expect(formatTimeRange('2026-10-24T00:00:00+05:30')).toBe('12:00 AM IST')
    expect(formatTimeRange('2026-10-24T00:05:00+05:30')).toBe('12:05 AM IST')
    expect(formatTimeRange('2026-10-24T23:59:00+05:30')).toBe('11:59 PM IST')
    expect(formatTimeRange('2026-10-24T18:29:59Z')).toBe('11:59 PM IST')
    expect(formatTimeRange('2026-10-24T18:30:00Z')).toBe('12:00 AM IST')
  })

  it('marks an end on the next IST day', () => {
    expect(formatTimeRange('2026-10-24T23:00:00+05:30', '2026-10-25T01:00:00+05:30')).toBe(
      '11:00 PM – 1:00 AM IST (+1 day)',
    )
    expect(formatTimeRange('2026-10-24T10:00:00+05:30', '2026-10-26T10:00:00+05:30')).toBe(
      '10:00 AM – 10:00 AM IST (+2 days)',
    )
  })

  it('decides "next day" on the IST calendar, not the UTC one', () => {
    // 18:00Z and 19:00Z are the same UTC day, but IST midnight (18:30Z) sits between them.
    expect(formatTimeRange('2026-10-24T18:00:00Z', '2026-10-24T19:00:00Z')).toBe('11:30 PM – 12:30 AM IST (+1 day)')
    // Both before IST midnight.
    expect(formatTimeRange('2026-10-24T01:00:00Z', '2026-10-24T18:00:00Z')).toBe('6:30 AM – 11:30 PM IST')
  })

  it('falls back to the start when the end is invalid or not after the start', () => {
    expect(formatTimeRange(SAT_5PM_IST, 'bad')).toBe('5:00 PM IST')
    expect(formatTimeRange(SAT_5PM_IST, SAT_5PM_IST)).toBe('5:00 PM IST')
    expect(formatTimeRange(SAT_830PM_IST, SAT_5PM_IST)).toBe('8:30 PM IST')
  })
})

describe('determinism (AC-114)', () => {
  const originalTz = process.env.TZ
  afterEach(() => {
    if (originalTz === undefined) delete process.env.TZ
    else process.env.TZ = originalTz
  })

  const run = () => [
    formatEventDate(SAT_5PM_IST),
    formatEventDateTime('2026-10-24T18:30:00Z'),
    formatTimeRange('2026-10-24T18:00:00Z', '2026-10-24T19:00:00Z'),
    formatEventDate(new Date(2026, 9, 24, 17, 0)), // wall-clock constructor: only the epoch instant matters
  ]

  it('gives identical text under UTC, America/New_York, Asia/Kolkata and Pacific/Auckland', () => {
    const results = new Map<string, string[]>()
    for (const tz of ['UTC', 'America/New_York', 'Asia/Kolkata', 'Pacific/Auckland']) {
      process.env.TZ = tz
      results.set(tz, run().slice(0, 3))
    }
    const [first, ...rest] = [...results.values()]
    for (const other of rest) expect(other).toEqual(first)
    expect(first).toEqual(['Sat, 24 Oct 2026', 'Sun, 25 Oct 2026, 12:00 AM IST', '11:30 PM – 12:30 AM IST (+1 day)'])
  })

  it('is unaffected by US or NZ daylight saving transitions', () => {
    for (const tz of ['America/New_York', 'Pacific/Auckland']) {
      process.env.TZ = tz
      // US DST ends 2026-11-01; NZ DST starts 2026-09-27. India stays +05:30 throughout.
      expect(formatTimeRange('2026-11-01T06:30:00Z')).toBe('12:00 PM IST')
      expect(formatTimeRange('2026-09-26T14:30:00Z')).toBe('8:00 PM IST')
    }
  })
})

describe('instant helpers', () => {
  it('parseInstant is strict about offsets and ranges', () => {
    expect(parseInstant('2026-10-24T11:30:00Z')).toBe(Date.UTC(2026, 9, 24, 11, 30))
    expect(parseInstant('2026-10-24T17:00+05:30')).toBe(Date.UTC(2026, 9, 24, 11, 30))
    expect(parseInstant('2026-10-24T17:00:00.5+05:30')).toBe(Date.UTC(2026, 9, 24, 11, 30, 0, 500))
    expect(parseInstant(0)).toBe(0)
    expect(parseInstant('2026-10-24T17:00:00')).toBeNull()
  })

  it('toIstParts exposes the IST wall clock and day number', () => {
    const parts = toIstParts(Date.UTC(2026, 9, 24, 18, 30))
    expect(parts).toMatchObject({ year: 2026, month: 10, day: 25, weekday: 0, hour: 0, minute: 0 })
    expect(parts.dayNumber).toBe(toIstParts(Date.UTC(2026, 9, 24, 18, 29)).dayNumber + 1)
  })
})
