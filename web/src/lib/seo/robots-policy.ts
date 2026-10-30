// robots.txt policy (TASK-112, ARCH-001 8.3, 17.4, 18.1). Pure: takes the environment as an argument so it can be
// unit tested; app/robots.ts passes process.env at build time.
//
// Production target (VERCEL_TARGET_ENV / VERCEL_ENV === 'production', the same test as the security headers): allow
// the public site, disallow the non-public groups and /api, reference the sitemap. Any other deployment (preview,
// staging, local, unknown) and any mock build: disallow everything. This matches next.config's X-Robots-Tag noindex on
// non-production hosts. Disallow is hygiene only; the authoritative control is the noindex metadata and header.
import type { MetadataRoute } from 'next'
import { detectTarget, type GuardEnv } from '@/lib/env/guard'

/** Non-public prefixes, from the route registry groups (auth, app, admin, handoff) plus route handlers. */
export const DISALLOWED_PATHS = [
  '/app/',
  '/admin/',
  '/handoff/',
  '/api/',
  '/login',
  '/auth/',
  '/reset-password',
  '/welcome',
  // (auth) registration lives under the public event path: /events/{slug}/register.
  '/events/*/register',
] as const

export interface RobotsPolicyInput {
  env: GuardEnv
  /** Absolute site origin (NEXT_PUBLIC_SITE_URL). */
  origin: string
  /** Mock builds are never indexable, whatever the target says. */
  mocks: boolean
}

export function robotsPolicy({ env, origin, mocks }: RobotsPolicyInput): MetadataRoute.Robots {
  const production = detectTarget(env) === 'production' && !mocks
  if (!production) {
    return { rules: { userAgent: '*', disallow: '/' } }
  }
  return {
    rules: { userAgent: '*', allow: '/', disallow: [...DISALLOWED_PATHS] },
    sitemap: `${origin}/sitemap.xml`,
    host: origin,
  }
}
