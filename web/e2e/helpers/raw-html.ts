import { expect, type APIRequestContext, type APIResponse } from '@playwright/test'

export type RawHtml = { response: APIResponse; status: number; html: string; text: string }

const ENTITIES: Record<string, string> = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ' }

function decodeEntities(value: string): string {
  return value
    .replace(/&#x([0-9a-f]+);/gi, (_, hex: string) => String.fromCodePoint(parseInt(hex, 16)))
    .replace(/&#(\d+);/g, (_, dec: string) => String.fromCodePoint(Number(dec)))
    .replace(/&([a-z]+);/gi, (whole, name: string) => ENTITIES[name.toLowerCase()] ?? whole)
}

/** Visible text of an HTML document: scripts, styles and tags removed, entities decoded, whitespace collapsed. */
export function htmlToText(html: string): string {
  const stripped = html
    .replace(/<(script|style|noscript)\b[\s\S]*?<\/\1>/gi, ' ')
    .replace(/<!--[\s\S]*?-->/g, ' ')
    .replace(/<[^>]+>/g, ' ')
  return decodeEntities(stripped).replace(/\s+/g, ' ').trim()
}

/**
 * Fetches the server's HTML with no browser and no JavaScript (ARCH-001 16.1 "Prerender/no-JS", AC-10). Whatever is
 * asserted on the result is what a crawler or a script-less client receives. Redirects are not followed.
 */
export async function fetchRawHtml(request: APIRequestContext, url: string): Promise<RawHtml> {
  const response = await request.get(url, { headers: { Accept: 'text/html' }, maxRedirects: 0 })
  const html = await response.text()
  return { response, status: response.status(), html, text: htmlToText(html) }
}

/** The response contains each string in its visible text, and each href as a real anchor. */
export function expectRawContent(raw: RawHtml, expected: { text?: string[]; links?: string[] }): void {
  for (const text of expected.text ?? []) {
    expect(raw.text, `raw HTML (status ${raw.status}) is missing text "${text}"`).toContain(text)
  }
  for (const href of expected.links ?? []) {
    const escaped = href.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    expect(raw.html, `raw HTML is missing an anchor to ${href}`).toMatch(new RegExp(`<a\\b[^>]*\\bhref="${escaped}"`))
  }
}
