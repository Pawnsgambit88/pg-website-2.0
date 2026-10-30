import 'server-only'
import { envServer } from '@/lib/env/env.server'

/** Secrets the verifier accepts: the current one, plus the previous one during a rotation (OPS-001 7.3). May be empty. */
export function activeSecrets(): string[] {
  const secrets: string[] = []
  if (envServer.REVALIDATE_SECRET) secrets.push(envServer.REVALIDATE_SECRET)
  if (envServer.REVALIDATE_SECRET_PREVIOUS) secrets.push(envServer.REVALIDATE_SECRET_PREVIOUS)
  return secrets
}
