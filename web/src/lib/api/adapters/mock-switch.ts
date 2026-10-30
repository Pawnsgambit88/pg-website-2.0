// The mock switch (ARCH-001 11.3, SEC-001 F-09): ONE place that decides mock vs real.
//
// `USE_MOCKS` repeats the rule of lib/env/public-schema.ts (only the literal 'true' turns a flag on) but reads
// `process.env.NEXT_PUBLIC_USE_MOCKS` directly: Next inlines that literal at build time, so with mocks off this is the
// constant `false`, the guarded `import()` calls in the entry points are dead code and the mock chunk and fixtures
// never reach production output. (`envPublic.USE_MOCKS` is a runtime object field the bundler cannot fold.)
//
// No module-level mutable state; this file imports nothing from lib/mock.
export const USE_MOCKS = process.env.NEXT_PUBLIC_USE_MOCKS === 'true'

/**
 * Wraps an async loader as a synchronous object of the same shape. Any property path is followed lazily and the call
 * is forwarded once the loader resolves, so an entry point can stay synchronous while the mock loads on demand.
 * Typed through `unknown`: a Proxy cannot be checked against the interface; the loader's result is.
 */
export function lazyApi<T extends object>(load: () => Promise<T>): T {
  const at = (path: readonly string[]): unknown =>
    new Proxy(() => undefined, {
      get: (_target, key) => (typeof key === 'string' ? at([...path, key]) : undefined),
      apply: async (_target, _this, args: unknown[]) => {
        let owner: unknown = await load()
        let fn: unknown = owner
        for (const key of path) {
          owner = fn
          fn = (fn as Record<string, unknown>)[key]
        }
        return (fn as (...a: unknown[]) => unknown).apply(owner, args)
      },
    })
  return at([]) as T
}
