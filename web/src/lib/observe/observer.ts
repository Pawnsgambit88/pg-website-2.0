// The single place a provider is chosen (ARCH-001 19.2, TASK-122). Swap the provider here and nowhere else; a real
// provider needs a CSP change and a security review first, and should be loaded lazily (RBP bundle-defer-third-party).
//
// Selection: NEXT_PUBLIC_OBSERVE_PROVIDER = `console` | `noop`. Unset: console in development, no-op everywhere else.
// The variable is read as a literal so Next can inline it. It is not part of lib/env yet (outside TASK-122 ownership).
import { consoleObserver } from './console'
import { noopObserver } from './noop'
import { scrubString, scrubUrl } from './scrub'
import type { AnalyticsEvent, ErrorContext, Observer, VitalReport } from './types'

export type ObserveProviderName = 'console' | 'noop'

function chooseProvider(): ObserveProviderName {
  const configured = process.env.NEXT_PUBLIC_OBSERVE_PROVIDER
  if (configured === 'console' || configured === 'noop') return configured
  return process.env.NODE_ENV === 'development' ? 'console' : 'noop'
}

export const observeProvider: ObserveProviderName = chooseProvider()

const active: Observer = observeProvider === 'console' ? consoleObserver : noopObserver

/** Reports a caught error. Only labels and opaque ids leave this call; message and stack are scrubbed by the sink. */
export function reportError(error: unknown, ctx: ErrorContext): void {
  try {
    active.reportError(error, ctx)
  } catch {
    // Observability must never break the app.
  }
}

export function reportVital(vital: VitalReport): void {
  try {
    active.reportVital({ ...vital, route: scrubUrl(vital.route) })
  } catch {
    // see above
  }
}

export function trackEvent(event: AnalyticsEvent): void {
  try {
    active.trackEvent({ ...event, name: scrubString(event.name, 60) })
  } catch {
    // see above
  }
}
