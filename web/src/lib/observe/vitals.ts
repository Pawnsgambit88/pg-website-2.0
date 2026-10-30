// Web-vitals collection with the PerformanceObserver API only (the `web-vitals` package is not a dependency).
// Browser-only; call from an effect. Returns a cleanup. LCP, CLS and INP are final only when the page is hidden, so they
// are sent once at `visibilitychange: hidden` / `pagehide`; FCP and TTFB are sent as soon as they are known.
import type { VitalName, VitalRating, VitalReport } from './types'

/** [good upper bound, poor lower bound] from the public Core Web Vitals thresholds. */
const THRESHOLDS: Readonly<Record<VitalName, readonly [number, number]>> = {
  LCP: [2500, 4000],
  CLS: [0.1, 0.25],
  INP: [200, 500],
  FCP: [1800, 3000],
  TTFB: [800, 1800],
}

export function rate(name: VitalName, value: number): VitalRating {
  const [good, poor] = THRESHOLDS[name]
  return value <= good ? 'good' : value > poor ? 'poor' : 'needs-improvement'
}

type Emit = (vital: VitalReport) => void

interface LayoutShiftEntry extends PerformanceEntry {
  readonly value: number
  readonly hadRecentInput: boolean
}

interface EventTimingEntry extends PerformanceEntry {
  readonly interactionId?: number
}

/** `durationThreshold` is part of Event Timing but missing from the DOM lib typings. */
interface ObserveOptions {
  readonly durationThreshold?: number
}

function observe(type: string, onEntries: (entries: PerformanceEntry[]) => void, options: ObserveOptions = {}) {
  try {
    if (!PerformanceObserver.supportedEntryTypes.includes(type)) return undefined
    const observer = new PerformanceObserver((list) => onEntries(list.getEntries()))
    observer.observe({ type, buffered: true, ...options } as PerformanceObserverInit)
    return observer
  } catch {
    return undefined
  }
}

/**
 * Starts all five observers. `route` is read when each vital is sent, so it reflects the page the user left from.
 * Each vital is emitted at most once per call.
 */
export function collectWebVitals(emit: Emit, getRoute: () => string): () => void {
  const sent = new Set<VitalName>()
  const send = (name: VitalName, value: number) => {
    if (sent.has(name)) return
    sent.add(name)
    emit({ name, value, route: getRoute(), rating: rate(name, value) })
  }

  const observers: PerformanceObserver[] = []
  const add = (observer: PerformanceObserver | undefined) => {
    if (observer !== undefined) observers.push(observer)
  }

  let lcp: number | undefined
  let cls = 0
  let sessionValue = 0
  let sessionStart = 0
  let sessionLast = 0
  let inp: number | undefined

  add(
    observe('paint', (entries) => {
      const fcp = entries.find((entry) => entry.name === 'first-contentful-paint')
      if (fcp !== undefined) send('FCP', fcp.startTime)
    }),
  )
  add(
    observe('navigation', (entries) => {
      const nav = entries[0] as PerformanceNavigationTiming | undefined
      if (nav !== undefined) send('TTFB', nav.responseStart)
    }),
  )
  add(
    observe('largest-contentful-paint', (entries) => {
      const last = entries[entries.length - 1]
      if (last !== undefined) lcp = last.startTime
    }),
  )
  add(
    observe('layout-shift', (entries) => {
      // Largest burst: shifts less than 1 s apart, window at most 5 s.
      for (const entry of entries as LayoutShiftEntry[]) {
        if (entry.hadRecentInput) continue
        if (sessionValue > 0 && entry.startTime - sessionLast < 1000 && entry.startTime - sessionStart < 5000) {
          sessionValue += entry.value
        } else {
          sessionValue = entry.value
          sessionStart = entry.startTime
        }
        sessionLast = entry.startTime
        cls = Math.max(cls, sessionValue)
      }
    }),
  )
  // Event timing (INP): the worst interaction latency seen. Unsupported browsers simply never report INP.
  add(
    observe(
      'event',
      (entries) => {
        for (const entry of entries as EventTimingEntry[]) {
          if (entry.interactionId === undefined || entry.interactionId === 0) continue
          inp = Math.max(inp ?? 0, entry.duration)
        }
      },
      { durationThreshold: 40 },
    ),
  )

  const flush = () => {
    if (lcp !== undefined) send('LCP', lcp)
    send('CLS', cls)
    if (inp !== undefined) send('INP', inp)
  }
  const onVisibility = () => {
    if (document.visibilityState === 'hidden') flush()
  }
  document.addEventListener('visibilitychange', onVisibility, { passive: true })
  addEventListener('pagehide', flush, { passive: true })

  return () => {
    for (const observer of observers) observer.disconnect()
    document.removeEventListener('visibilitychange', onVisibility)
    removeEventListener('pagehide', flush)
  }
}
