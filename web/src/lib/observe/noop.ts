// Production default until a provider is chosen (ARCH-001 19.2): every call is a no-op. Nothing is logged or sent.
import type { Observer } from './types'

export const noopObserver: Observer = {
  reportError: () => undefined,
  reportVital: () => undefined,
  trackEvent: () => undefined,
}
