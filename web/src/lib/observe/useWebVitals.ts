'use client'

import { useEffect } from 'react'
import { observeProvider, reportVital } from './observer'
import { collectWebVitals } from './vitals'

/** Fraction of page loads that report vitals. Chosen once per page load; 0 disables, 1 reports every load. */
const DEFAULT_SAMPLE_RATE = 0.1

function sampleRate(): number {
  const raw = Number(process.env.NEXT_PUBLIC_VITALS_SAMPLE_RATE)
  return process.env.NEXT_PUBLIC_VITALS_SAMPLE_RATE !== undefined && Number.isFinite(raw) && raw >= 0 && raw <= 1
    ? raw
    : DEFAULT_SAMPLE_RATE
}

/**
 * Reports LCP, CLS, INP, FCP and TTFB through the observer (ARCH-001 19.2). Mount once, in a client island of a layout
 * (it runs after hydration because it only starts in an effect). With the no-op provider nothing is observed at all, so
 * production costs nothing until a provider is configured. `rate` overrides the sample rate (tests, staging).
 */
export function useWebVitals(rate: number = sampleRate()): void {
  useEffect(() => {
    if (observeProvider === 'noop' || Math.random() >= rate) return undefined
    return collectWebVitals(reportVital, () => window.location.pathname)
  }, [rate])
}
