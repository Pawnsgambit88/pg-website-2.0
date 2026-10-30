import { z } from 'zod'
import { formatIssues } from './public-schema.ts'

const optionalSecret = z
  .string()
  .trim()
  .min(32, 'must be at least 32 characters')
  .optional()
  .or(z.literal('').transform(() => undefined))

const serverEnvSchema = z.object({
  /** Railway API origin. Server fetches and the `/api` rewrite destination. */
  API_INTERNAL_URL: z
    .url({ protocol: /^https?$/, message: 'must be an absolute http(s) URL' })
    .transform((value) => value.replace(/\/+$/, ''))
    .optional()
    .or(z.literal('').transform(() => undefined)),
  /** Shared HMAC secret for /api/revalidate. At least 32 characters (ARCH-001 17.2). */
  REVALIDATE_SECRET: optionalSecret,
  /** Accepted alongside REVALIDATE_SECRET during rotation. */
  REVALIDATE_SECRET_PREVIOUS: optionalSecret,
  /** Authenticates the draft-preview token exchange with the backend. */
  PREVIEW_SECRET: optionalSecret,
})

export type ServerEnv = {
  API_INTERNAL_URL: string | undefined
  REVALIDATE_SECRET: string | undefined
  REVALIDATE_SECRET_PREVIOUS: string | undefined
  PREVIEW_SECRET: string | undefined
}

export type ServerEnvSource = Partial<Record<keyof z.input<typeof serverEnvSchema>, string | undefined>>

/**
 * Parses server-only variables. With mocks on, the backend variables are optional.
 * With mocks off, API_INTERNAL_URL and REVALIDATE_SECRET are required (fail fast).
 */
export function parseServerEnv(source: ServerEnvSource, options: { mocks: boolean }): ServerEnv {
  const result = serverEnvSchema.safeParse(source)
  const issues: z.core.$ZodIssue[] = result.success ? [] : [...result.error.issues]

  if (result.success && !options.mocks) {
    for (const name of ['API_INTERNAL_URL', 'REVALIDATE_SECRET'] as const) {
      if (result.data[name] === undefined) {
        issues.push({
          code: 'custom',
          path: [name],
          message: 'is required when NEXT_PUBLIC_USE_MOCKS is not true',
          input: undefined,
        })
      }
    }
  }

  if (issues.length > 0 || !result.success) {
    throw new Error(formatIssues('Invalid server environment', issues))
  }
  const data = result.data
  return {
    API_INTERNAL_URL: data.API_INTERNAL_URL,
    REVALIDATE_SECRET: data.REVALIDATE_SECRET,
    REVALIDATE_SECRET_PREVIOUS: data.REVALIDATE_SECRET_PREVIOUS,
    PREVIEW_SECRET: data.PREVIEW_SECRET,
  }
}
