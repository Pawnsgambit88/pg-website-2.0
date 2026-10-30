/**
 * Self-test support: asserts that `action` throws and that the message matches. Used to prove a helper fails on a
 * deliberately broken fixture (a helper that can never fail is worthless).
 */
export async function expectToFail(action: () => unknown, message: RegExp | string): Promise<void> {
  let thrown: unknown
  try {
    await action()
  } catch (error) {
    thrown = error
  }
  if (thrown === undefined) throw new Error(`Expected the helper to fail with ${String(message)}, but it passed`)
  const text = thrown instanceof Error ? thrown.message : String(thrown)
  const ok = typeof message === 'string' ? text.includes(message) : message.test(text)
  if (!ok) {
    throw new Error(`Helper failed, but with an unexpected message.\nExpected: ${String(message)}\nActual: ${text}`)
  }
}
