/** A class-name part: a string, or a falsy value that is skipped (so `cond && 'x'` and `cond ? 'x' : undefined` work). */
export type ClassPart = string | false | null | undefined

/**
 * Joins class names, skipping falsy parts. No conflict resolution (no tailwind-merge): components expose closed variant
 * props instead of letting callers override utilities, so `className` is for layout additions (margins, spans) only.
 * Prettier sorts the classes inside `cn(...)` calls (`tailwindFunctions`).
 */
export function cn(...parts: ClassPart[]): string {
  let out = ''
  for (const part of parts) {
    if (part) out = out === '' ? part : `${out} ${part}`
  }
  return out
}
