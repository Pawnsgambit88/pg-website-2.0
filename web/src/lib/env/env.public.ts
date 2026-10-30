import { parsePublicEnv } from './public-schema.ts'

// Next inlines NEXT_PUBLIC_* only for literal `process.env.NEXT_PUBLIC_X` reads, so every
// variable is referenced explicitly. Do not replace this with `process.env` spreading.
export const envPublic = parsePublicEnv({
  NEXT_PUBLIC_USE_MOCKS: process.env.NEXT_PUBLIC_USE_MOCKS,
  NEXT_PUBLIC_API_BASE_URL: process.env.NEXT_PUBLIC_API_BASE_URL,
  NEXT_PUBLIC_SITE_URL: process.env.NEXT_PUBLIC_SITE_URL,
  NEXT_PUBLIC_AUTH_MODE: process.env.NEXT_PUBLIC_AUTH_MODE,
  NEXT_PUBLIC_GOOGLE_AUTH: process.env.NEXT_PUBLIC_GOOGLE_AUTH,
  NEXT_PUBLIC_RAZORPAY_ENABLED: process.env.NEXT_PUBLIC_RAZORPAY_ENABLED,
  NEXT_PUBLIC_CONTACT_MODE: process.env.NEXT_PUBLIC_CONTACT_MODE,
  NEXT_PUBLIC_SUPABASE_STORAGE_HOST: process.env.NEXT_PUBLIC_SUPABASE_STORAGE_HOST,
  NEXT_PUBLIC_MEDIA_BASE_URL: process.env.NEXT_PUBLIC_MEDIA_BASE_URL,
  NEXT_PUBLIC_MEDIA_BUCKET: process.env.NEXT_PUBLIC_MEDIA_BUCKET,
})
