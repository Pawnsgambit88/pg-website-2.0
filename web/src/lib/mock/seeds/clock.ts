// Fixed mock clock (ARCH-001 11.4): seeds never read Date.now(), so server renders are deterministic.
// Friday 23 Oct 2026, 09:00 IST. Upcoming events fall after it, past events before it.
export const MOCK_NOW = '2026-10-23T09:00:00+05:30'

/**
 * ISO instant in IST (+05:30) for wall-clock `time` ("HH:MM") on the day `days` after MOCK_NOW's calendar date.
 * Pure: derived from the MOCK_NOW literal only, so moving MOCK_NOW moves every relative seed date with it.
 */
export function mockIstAt(days: number, time: string): string {
  const [year = 0, month = 1, day = 1] = MOCK_NOW.slice(0, 10).split('-').map(Number)
  const date = new Date(Date.UTC(year, month - 1, day + days)).toISOString().slice(0, 10)
  return `${date}T${time}:00+05:30`
}
