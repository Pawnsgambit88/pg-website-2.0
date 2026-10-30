// Mock mode (ARCH-001 11.4): the explicit argument that public reads are pure functions of. Never a global flag.
//   default  normal seed data
//   slow     every read is delayed (SLOW_MS)
//   error    every read fails with a 503 ApiError (HTTP_5XX)
//   empty    lists are empty, slug reads resolve null
export const MOCK_MODES = ['default', 'slow', 'error', 'empty'] as const
export type MockMode = (typeof MOCK_MODES)[number]

export const SLOW_MS = 1500

export function parseMockMode(value: unknown): MockMode | null {
  if (typeof value !== 'string') return null
  // `?mock=slow,room:live`: the mode is the first token that names one; scenario tokens (scenario.ts) are ignored here.
  const tokens = value.split(',').map((token) => token.trim())
  return MOCK_MODES.find((mode) => tokens.includes(mode)) ?? null
}
