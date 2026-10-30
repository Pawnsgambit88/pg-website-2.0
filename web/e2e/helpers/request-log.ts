import { expect, type Page, type Request } from '@playwright/test'

export type LoggedRequest = { url: string; host: string; method: string; resourceType: string }

/**
 * Hosts the product must never contact (ARCH-001 10.3 "never present"; fonts are self-hosted, no stock photos).
 * A host matches itself and any subdomain.
 */
export const FORBIDDEN_HOSTS: readonly string[] = [
  'fonts.googleapis.com',
  'fonts.gstatic.com',
  'unsplash.com',
  'images.unsplash.com',
  'plus.unsplash.com',
]

/** Razorpay: allowed only after the paid-registration panel opens. Pass as `extra` to assert absence elsewhere. */
export const RAZORPAY_HOSTS: readonly string[] = ['razorpay.com']

export type Matcher = string | RegExp | ((entry: LoggedRequest) => boolean)

function hostMatches(host: string, forbidden: string): boolean {
  const name = host.replace(/:\d+$/, '')
  return name === forbidden || name.endsWith(`.${forbidden}`)
}

function matches(entry: LoggedRequest, matcher: Matcher): boolean {
  if (typeof matcher === 'function') return matcher(entry)
  if (typeof matcher === 'string') return entry.url.includes(matcher)
  return matcher.test(entry.url)
}

export type RequestLog = {
  readonly entries: readonly LoggedRequest[]
  /** Clears the log (e.g. between "page load" and "after interaction" phases). */
  reset(): void
  find(matcher: Matcher): LoggedRequest[]
  count(matcher: Matcher): number
  expectCount(matcher: Matcher, expected: number, label?: string): void
  /** None of the forbidden hosts (plus any extra) were contacted. */
  expectNoForbiddenHosts(extra?: readonly string[]): void
  /** Every request went to `origin` (host:port), apart from data:, blob: and about: URLs. */
  expectSameOriginOnly(origin: string): void
}

/** Starts recording every request the page makes (ARCH-001 16.2 `requestLog()`). Call before `page.goto`. */
export function requestLog(page: Page): RequestLog {
  let entries: LoggedRequest[] = []

  page.on('request', (request: Request) => {
    const url = request.url()
    let host = ''
    try {
      host = new URL(url).host
    } catch {
      // keep an empty host for unparsable URLs
    }
    entries.push({ url, host, method: request.method(), resourceType: request.resourceType() })
  })

  return {
    get entries() {
      return entries
    },
    reset() {
      entries = []
    },
    find: (matcher) => entries.filter((entry) => matches(entry, matcher)),
    count: (matcher) => entries.filter((entry) => matches(entry, matcher)).length,
    expectCount(matcher, expected, label) {
      const found = entries.filter((entry) => matches(entry, matcher))
      expect(
        found.length,
        `${label ?? String(matcher)}: expected ${expected} request(s), saw ${found.length}: ${found.map((f) => f.url).join(', ')}`,
      ).toBe(expected)
    },
    expectNoForbiddenHosts(extra = []) {
      const forbidden = [...FORBIDDEN_HOSTS, ...extra]
      const hits = entries.filter((entry) => forbidden.some((host) => hostMatches(entry.host, host)))
      expect(
        hits.map((h) => h.url),
        `Requests to forbidden hosts (${forbidden.join(', ')})`,
      ).toEqual([])
    },
    expectSameOriginOnly(origin) {
      const foreign = entries.filter((entry) => !/^(data|blob|about):/.test(entry.url) && entry.host !== origin)
      expect(
        foreign.map((f) => f.url),
        `Requests outside ${origin}`,
      ).toEqual([])
    },
  }
}
