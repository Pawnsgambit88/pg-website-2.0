import { safeRedirect } from '@/lib/security/safe-redirect'

/**
 * The return-to intent for `/login?returnTo=`: a same-site page path only, or `undefined` when unsafe. A thin alias of
 * `safeRedirect` in lib/security/safe-redirect.ts (TASK-024), the single open-redirect rule (SEC-001 F-20), kept so
 * existing callers keep working. A local binding, not `export { } from` (M2 bans re-export barrels).
 */
export function safeReturnTo(value: string | undefined): string | undefined {
  return safeRedirect(value)
}
