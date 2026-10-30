import 'server-only'
import { envPublic } from './env.public.ts'
import { parseServerEnv } from './server-schema.ts'

// Importing this module from a Client Component is a build error (`server-only`).
export const envServer = parseServerEnv(
  {
    API_INTERNAL_URL: process.env.API_INTERNAL_URL,
    REVALIDATE_SECRET: process.env.REVALIDATE_SECRET,
    REVALIDATE_SECRET_PREVIOUS: process.env.REVALIDATE_SECRET_PREVIOUS,
    PREVIEW_SECRET: process.env.PREVIEW_SECRET,
  },
  { mocks: envPublic.USE_MOCKS },
)
