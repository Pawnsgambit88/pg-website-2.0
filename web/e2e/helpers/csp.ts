import { expect } from '@playwright/test'

type Header = { name: string; value: string }

/**
 * A Playwright browser `Response` (async `headersArray()`) or `APIResponse` from a plain fetch (sync `headersArray()`).
 */
export type HeaderSource = { headersArray(): Header[] | Promise<Header[]>; url(): string }

const CSP_NAMES = ['content-security-policy', 'content-security-policy-report-only']

/**
 * Every CSP header on the response, one entry per header line. `headersArray()` keeps duplicates, whereas
 * `headers()` would join two headers into one comma-separated value and hide the defect.
 */
export async function cspHeaders(response: HeaderSource): Promise<Header[]> {
  const all = await response.headersArray()
  return all.filter((header) => CSP_NAMES.includes(header.name.toLowerCase()))
}

/**
 * ARCH-001 10.5 step 1: exactly one `Content-Security-Policy` or `Content-Security-Policy-Report-Only` header, never
 * zero, never two. Returns the single header so callers can assert on its directives.
 */
export async function expectSingleCspHeader(response: HeaderSource): Promise<Header> {
  const found = await cspHeaders(response)
  expect(
    found.map((h) => h.name),
    `${response.url()} must carry exactly one CSP header, found ${found.length}`,
  ).toHaveLength(1)
  const [only] = found
  if (!only) throw new Error('unreachable')
  return only
}

/** Duplicate guard for routes whose CSP has not landed yet (TASK-120): zero or one header passes, two or more fails. */
export async function expectNoDuplicateCspHeaders(response: HeaderSource): Promise<void> {
  const count = (await cspHeaders(response)).length
  expect(count, `${response.url()} carries ${count} CSP headers, at most one is allowed`).toBeLessThanOrEqual(1)
}
