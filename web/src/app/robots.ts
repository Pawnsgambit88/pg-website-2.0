import type { MetadataRoute } from 'next'
import { envPublic } from '@/lib/env/env.public'
import { robotsPolicy } from '@/lib/seo/robots-policy'

// /robots.txt (TASK-112, ARCH-001 8.3). Built statically at `next build`: the deployment target is read from the build
// environment (VERCEL_TARGET_ENV / VERCEL_ENV), so a preview or staging build serves "Disallow: /" and only a
// production build allows crawling. Rules live in lib/seo/robots-policy.ts.
export default function robots(): MetadataRoute.Robots {
  return robotsPolicy({
    env: { VERCEL_ENV: process.env.VERCEL_ENV, VERCEL_TARGET_ENV: process.env.VERCEL_TARGET_ENV },
    origin: envPublic.SITE_URL,
    mocks: envPublic.USE_MOCKS,
  })
}
