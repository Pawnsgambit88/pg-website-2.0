/** Deep-freezes seed data so a stray write fails loudly instead of leaking between requests (ARCH-001 11.4). */
export function deepFreeze<T>(value: T): T {
  if (typeof value === 'object' && value !== null && !Object.isFrozen(value)) {
    Object.freeze(value)
    for (const child of Object.values(value)) deepFreeze(child)
  }
  return value
}
