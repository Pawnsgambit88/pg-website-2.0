import { z } from 'zod'

// Boolean flags arrive as strings. Only the literal 'true' enables a flag; anything else is off.
const flag = z
  .enum(['true', 'false'])
  .optional()
  .transform((value) => value === 'true')

const optionalText = z
  .string()
  .trim()
  .optional()
  .transform((value) => (value === undefined || value === '' ? undefined : value))

export const publicEnvSchema = z.object({
  /** Build-time constant. True only locally and on explicit preview opt-in (see guard.ts). */
  NEXT_PUBLIC_USE_MOCKS: flag,
  /** Same-origin API prefix. Relative by design (ARCH-001 12.7). */
  NEXT_PUBLIC_API_BASE_URL: z
    .string()
    .trim()
    .regex(/^\/[A-Za-z0-9/_-]*$/, 'must be a relative path such as /api')
    .default('/api'),
  /** Absolute site origin: canonical, sitemap, Open Graph. */
  NEXT_PUBLIC_SITE_URL: z
    .url({ protocol: /^https?$/, message: 'must be an absolute http(s) URL' })
    .default('http://localhost:3000')
    .transform((value) => value.replace(/\/+$/, '')),
  /** Session transport against a real backend: must match the backend AUTH_TOKEN_MODE. Default cookie; mocks force body. */
  NEXT_PUBLIC_AUTH_MODE: z.enum(['body', 'cookie']).default('cookie'),
  NEXT_PUBLIC_GOOGLE_AUTH: flag,
  NEXT_PUBLIC_RAZORPAY_ENABLED: flag,
  /** ASSUMPTION (not specified in ARCH-001): 'form' posts to the contract endpoint, 'off' hides the form. */
  NEXT_PUBLIC_CONTACT_MODE: z.enum(['form', 'off']).default('form'),
  NEXT_PUBLIC_SUPABASE_STORAGE_HOST: optionalText,
  NEXT_PUBLIC_MEDIA_BASE_URL: optionalText,
  NEXT_PUBLIC_MEDIA_BUCKET: optionalText,
})

export type PublicEnv = {
  USE_MOCKS: boolean
  API_BASE_URL: string
  SITE_URL: string
  AUTH_MODE: 'body' | 'cookie'
  GOOGLE_AUTH: boolean
  RAZORPAY_ENABLED: boolean
  CONTACT_MODE: 'form' | 'off'
  SUPABASE_STORAGE_HOST: string | undefined
  MEDIA_BASE_URL: string | undefined
  MEDIA_BUCKET: string | undefined
}

export type PublicEnvSource = Partial<Record<keyof z.input<typeof publicEnvSchema>, string | undefined>>

/** Parses the public variables. Throws one readable error listing every invalid variable. */
export function parsePublicEnv(source: PublicEnvSource): PublicEnv {
  const result = publicEnvSchema.safeParse(source)
  if (!result.success) {
    throw new Error(formatIssues('Invalid public environment', result.error.issues))
  }
  const data = result.data
  return {
    USE_MOCKS: data.NEXT_PUBLIC_USE_MOCKS,
    API_BASE_URL: data.NEXT_PUBLIC_API_BASE_URL,
    SITE_URL: data.NEXT_PUBLIC_SITE_URL,
    AUTH_MODE: data.NEXT_PUBLIC_AUTH_MODE,
    GOOGLE_AUTH: data.NEXT_PUBLIC_GOOGLE_AUTH,
    RAZORPAY_ENABLED: data.NEXT_PUBLIC_RAZORPAY_ENABLED,
    CONTACT_MODE: data.NEXT_PUBLIC_CONTACT_MODE,
    SUPABASE_STORAGE_HOST: data.NEXT_PUBLIC_SUPABASE_STORAGE_HOST,
    MEDIA_BASE_URL: data.NEXT_PUBLIC_MEDIA_BASE_URL,
    MEDIA_BUCKET: data.NEXT_PUBLIC_MEDIA_BUCKET,
  }
}

export function formatIssues(title: string, issues: readonly z.core.$ZodIssue[]): string {
  const lines = issues.map((issue) => `  - ${issue.path.join('.') || '(root)'}: ${issue.message}`)
  return `${title}:\n${lines.join('\n')}`
}
