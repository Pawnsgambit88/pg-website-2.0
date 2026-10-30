// Provider-agnostic observability contract (ARCH-001 19.2, TASK-122). Types only: no runtime code, no provider.

/** Where in the app something happened: route group or feature area, never a URL. */
export interface ErrorContext {
  /** Route group or feature area, for example `public`, `app`, `csp`. */
  readonly area: string
  /** Action name for debugging, for example `render`, `submit-registration`. */
  readonly action?: string
  /** `meta.request_id` / `X-Request-ID`: the join key to backend logs. */
  readonly requestId?: string
  /** Extra small fields. Always run through the scrubber before reaching a sink. */
  readonly extra?: Readonly<Record<string, unknown>>
}

export type VitalName = 'LCP' | 'CLS' | 'INP' | 'TTFB' | 'FCP'
export type VitalRating = 'good' | 'needs-improvement' | 'poor'

export interface VitalReport {
  readonly name: VitalName
  /** Milliseconds, except CLS which is unitless. */
  readonly value: number
  /** Route pattern or path without query or fragment. */
  readonly route: string
  readonly rating: VitalRating
}

/** Typed analytics events. Empty-ish on purpose: analytics is not delivered in FEAT-001 (NG-12). */
export interface AnalyticsEvent {
  readonly name: string
  readonly props?: Readonly<Record<string, string | number | boolean>>
}

/** The single interface a provider implements. Every method must be safe to call anywhere and must never throw. */
export interface Observer {
  reportError(error: unknown, ctx: ErrorContext): void
  reportVital(vital: VitalReport): void
  trackEvent(event: AnalyticsEvent): void
}

/** What a sink receives: already scrubbed, JSON-safe. */
export interface ScrubbedError {
  readonly name: string
  readonly message: string
  readonly stack: string | undefined
  readonly digest: string | undefined
}
