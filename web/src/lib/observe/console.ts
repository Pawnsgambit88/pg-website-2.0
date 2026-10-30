// Development sink: one JSON line per record through console, scrubbed first. Also the explicit `console` provider,
// which is how the csp-report intake keeps its structured line when the owner asks for logs in production.
import { normalizeContext, normalizeError } from './normalize'
import { scrubContext, scrubString } from './scrub'
import type { Observer } from './types'

export const consoleObserver: Observer = {
  reportError(error, ctx) {
    try {
      console.error(JSON.stringify({ event: 'error', ...normalizeContext(ctx), error: normalizeError(error) }))
    } catch {
      // Logging must never throw into the caller.
    }
  },
  reportVital(vital) {
    try {
      console.info(
        JSON.stringify({
          event: 'vital',
          name: vital.name,
          value: Math.round(vital.value * 1000) / 1000,
          rating: vital.rating,
          route: scrubString(vital.route, 200),
        }),
      )
    } catch {
      // see above
    }
  },
  trackEvent(event) {
    try {
      console.info(
        JSON.stringify({ event: 'track', name: scrubString(event.name, 60), props: scrubContext(event.props ?? {}) }),
      )
    } catch {
      // see above
    }
  },
}
