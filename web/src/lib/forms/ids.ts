/**
 * Deterministic control id for a react-hook-form field name (`address.city` becomes `field-address-city`). `FormField`
 * and `FormErrorSummary` both use it, so a summary link always lands on the control without sharing React state.
 */
export function controlIdFor(name: string, prefix = 'field'): string {
  return `${prefix}-${name.replace(/[^a-zA-Z0-9_-]+/g, '-')}`
}
