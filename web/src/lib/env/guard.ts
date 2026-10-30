// Pure, dependency-free build guard shared by scripts/guard-env.ts and next.config.ts.
// Mocks must never reach the production domain (ARCH-001 11.3, 17.2; SEC-001 F-09).

export type GuardEnv = Readonly<Record<string, string | undefined>>

const SENSITIVE_PUBLIC_NAME = /SECRET|TOKEN|KEY|PASSWORD/i

/** Hosting environments where mock data may be built. Anything else (production, staging, unknown) is refused. */
const MOCK_ALLOWED_TARGETS = new Set(['development', 'preview'])

export function detectTarget(env: GuardEnv): string | undefined {
  return env.VERCEL_TARGET_ENV ?? env.VERCEL_ENV
}

/**
 * Returns a list of problems; an empty list means the build may proceed.
 * - Mocks on in production (or any Vercel target other than preview/development): refused.
 * - Mocks on in a preview build: allowed only because NEXT_PUBLIC_USE_MOCKS=true was set explicitly.
 * - A NEXT_PUBLIC_* variable whose name suggests a secret: refused (it would ship to browsers).
 */
export function checkBuildEnv(env: GuardEnv): string[] {
  const problems: string[] = []
  const target = detectTarget(env)
  const mocksOn = env.NEXT_PUBLIC_USE_MOCKS === 'true'

  if (mocksOn && target !== undefined && !MOCK_ALLOWED_TARGETS.has(target)) {
    problems.push(
      `NEXT_PUBLIC_USE_MOCKS=true is not allowed for a "${target}" build. Mocks are limited to local and explicit preview builds.`,
    )
  }

  for (const name of Object.keys(env)) {
    if (name.startsWith('NEXT_PUBLIC_') && SENSITIVE_PUBLIC_NAME.test(name)) {
      problems.push(
        `${name} is exposed to browsers by its NEXT_PUBLIC_ prefix but its name suggests a secret. Rename it or move it server-side.`,
      )
    }
  }

  return problems
}

export function assertBuildEnv(env: GuardEnv): void {
  const problems = checkBuildEnv(env)
  if (problems.length > 0) {
    throw new Error(`Build environment guard failed:\n${problems.map((p) => `  - ${p}`).join('\n')}`)
  }
}
