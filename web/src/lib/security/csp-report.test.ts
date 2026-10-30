import { describe, expect, it, vi } from 'vitest'
import {
  MAX_REPORT_BYTES,
  blockedOrigin,
  createCspReportHandler,
  documentPath,
  extractViolations,
  isAcceptedContentType,
  readCappedBody,
  type CspViolationRecord,
} from './csp-report.ts'

const legacy = (overrides: Record<string, unknown> = {}) => ({
  'csp-report': {
    'document-uri': 'https://pg.example/reset-password?token=SECRET123#frag',
    referrer: 'https://pg.example/login?email=a@b.co',
    'violated-directive': "script-src-elem 'self' 'nonce-abc'",
    'effective-directive': 'script-src-elem',
    'original-policy': "default-src 'none'; script-src 'self'",
    disposition: 'enforce',
    'blocked-uri': 'https://evil.example/x.js?t=SECRET456',
    'status-code': 200,
    'script-sample': 'alert("password=hunter2")',
    'source-file': 'https://pg.example/_next/static/chunk.js?token=SECRET789',
    ...overrides,
  },
})

function post(body: BodyInit | null, headers: Record<string, string> = { 'content-type': 'application/csp-report' }) {
  return new Request('https://pg.example/api/csp-report', { method: 'POST', body, headers })
}

describe('extractViolations: PII rules (SEC-001 F-11)', () => {
  it('keeps a whitelist and drops query, fragment, script-sample, referrer and source-file', () => {
    const [record, ...rest] = extractViolations(legacy())
    expect(rest).toEqual([])
    expect(record).toEqual<CspViolationRecord>({
      source: 'csp-report',
      directive: 'script-src-elem',
      blocked: 'https://evil.example',
      documentPath: '/reset-password',
      disposition: 'enforce',
      status: 200,
    })
    const text = JSON.stringify(record)
    for (const secret of ['SECRET', 'hunter2', 'alert', 'a@b.co', 'frag', 'chunk.js', 'nonce']) {
      expect(text).not.toContain(secret)
    }
  })

  it('handles the Reporting API batch format and caps the batch', () => {
    const entry = {
      type: 'csp-violation',
      url: 'https://pg.example/x',
      body: {
        documentURL: 'https://pg.example/events/a/register?returnTo=%2Fapp',
        blockedURL: 'inline',
        effectiveDirective: 'script-src-elem',
        disposition: 'report',
        statusCode: 200,
        sample: 'secret inline code',
      },
    }
    const records = extractViolations(Array.from({ length: 50 }, () => entry))
    expect(records).toHaveLength(10)
    expect(records[0]).toEqual({
      source: 'reporting-api',
      directive: 'script-src-elem',
      blocked: 'inline',
      documentPath: '/events/a/register',
      disposition: 'report',
      status: 200,
    })
    expect(JSON.stringify(records)).not.toMatch(/secret|returnTo/)
    expect(extractViolations([{ type: 'deprecation', body: entry.body }])).toEqual([])
  })

  it('reduces blocked URIs to origin or keyword', () => {
    expect(blockedOrigin('https://cdn.example:8443/a/b?q=1#h')).toBe('https://cdn.example:8443')
    expect(blockedOrigin('data:text/html;base64,SECRETSECRET')).toBe('data')
    expect(blockedOrigin('blob:https://pg.example/uuid')).toBe('blob')
    expect(blockedOrigin('eval')).toBe('eval')
    expect(blockedOrigin('inline')).toBe('inline')
    expect(blockedOrigin('not a url')).toBe('other')
    expect(blockedOrigin(undefined)).toBe('unknown')
    expect(blockedOrigin('chrome-extension://abc/script.js?x=1')).toBe('chrome-extension')
  })

  it('reduces document URIs to a path', () => {
    expect(documentPath('https://pg.example/a/b?token=1#x')).toBe('/a/b')
    expect(documentPath('garbage')).toBe('unknown')
    expect(documentPath(undefined)).toBe('unknown')
  })

  it('strips control characters from logged fields (log injection)', () => {
    const [record] = extractViolations(legacy({ 'document-uri': 'https://pg.example/a%0Ab\nINJECTED' }))
    expect(record?.documentPath ?? '').not.toMatch(/[\r\n]/)
  })

  it('rejects hostile directive values and tolerates garbage payloads', () => {
    expect(extractViolations(legacy({ 'effective-directive': 'x; y', 'violated-directive': undefined }))).toEqual([])
    expect(extractViolations(legacy({ 'effective-directive': '<script>', 'violated-directive': '<img>' }))).toEqual([])
    for (const junk of [null, 1, 'x', [], [null], {}, { 'csp-report': 'x' }, { 'csp-report': [] }]) {
      expect(extractViolations(junk)).toEqual([])
    }
  })
})

describe('content types', () => {
  it('accepts exactly the two report types, ignoring case and parameters', () => {
    expect(isAcceptedContentType('application/csp-report')).toBe(true)
    expect(isAcceptedContentType('application/reports+json')).toBe(true)
    expect(isAcceptedContentType('Application/CSP-Report; charset=utf-8')).toBe(true)
    for (const bad of [
      null,
      '',
      'application/json',
      'text/plain',
      'application/x-www-form-urlencoded',
      'application/csp-report+x',
    ]) {
      expect(isAcceptedContentType(bad), String(bad)).toBe(false)
    }
  })
})

describe('readCappedBody', () => {
  it('reads a body within the cap', async () => {
    expect(await readCappedBody(post('{"a":1}'))).toBe('{"a":1}')
  })

  it('refuses a declared oversize body without reading it', async () => {
    const request = post('x', {
      'content-type': 'application/csp-report',
      'content-length': String(MAX_REPORT_BYTES + 1),
    })
    expect(await readCappedBody(request)).toBeUndefined()
  })

  it('stops reading a streamed body that exceeds the cap, even with no Content-Length', async () => {
    let pulled = 0
    const stream = new ReadableStream<Uint8Array>({
      pull(controller) {
        pulled += 1
        controller.enqueue(new Uint8Array(1024))
        if (pulled > 1000) controller.close()
      },
    })
    const request = new Request('https://pg.example/api/csp-report', {
      method: 'POST',
      body: stream,
      headers: { 'content-type': 'application/csp-report' },
      duplex: 'half',
    } as RequestInit)
    expect(await readCappedBody(request)).toBeUndefined()
    expect(pulled).toBeLessThan(40) // 8 chunks of cap plus the stream's internal read-ahead, never the 1000 offered
  })
})

describe('createCspReportHandler: always 204 (F-11)', () => {
  const run = async (request: Request, sink = vi.fn()) => {
    const response = await createCspReportHandler(sink)(request)
    return { response, sink }
  }

  it('logs one whitelisted record for a valid report and answers 204 with no body', async () => {
    const { response, sink } = await run(post(JSON.stringify(legacy())))
    expect(response.status).toBe(204)
    expect(await response.text()).toBe('')
    expect(response.headers.get('cache-control')).toBe('no-store')
    expect(sink).toHaveBeenCalledTimes(1)
    expect(JSON.stringify(sink.mock.calls)).not.toMatch(/SECRET|hunter2|alert/)
  })

  it('accepts the reports+json batch format', async () => {
    const batch = [
      { type: 'csp-violation', body: { effectiveDirective: 'img-src', blockedURL: 'https://x.example/p.png' } },
    ]
    const { response, sink } = await run(post(JSON.stringify(batch), { 'content-type': 'application/reports+json' }))
    expect(response.status).toBe(204)
    expect(sink).toHaveBeenCalledTimes(1)
  })

  it('answers 204 and logs nothing for a wrong content type, malformed JSON, oversize or empty bodies', async () => {
    const cases: Request[] = [
      post(JSON.stringify(legacy()), { 'content-type': 'application/json' }),
      post(JSON.stringify(legacy()), {}),
      post('{not json', { 'content-type': 'application/csp-report' }),
      post('x'.repeat(MAX_REPORT_BYTES + 100)),
      post(''),
      post(null),
      post('null'),
    ]
    for (const request of cases) {
      const { response, sink } = await run(request)
      expect(response.status).toBe(204)
      expect(sink).not.toHaveBeenCalled()
    }
  })

  it('answers 204 even when the sink throws', async () => {
    const sink = vi.fn(() => {
      throw new Error('boom')
    })
    const { response } = await run(post(JSON.stringify(legacy())), sink)
    expect(response.status).toBe(204)
  })

  it('keeps no state between requests', async () => {
    const sink = vi.fn()
    const handler = createCspReportHandler(sink)
    for (let i = 0; i < 3; i += 1) await handler(post(JSON.stringify(legacy())))
    expect(sink).toHaveBeenCalledTimes(3)
  })
})

describe('route module', () => {
  it('exports POST only', async () => {
    const route = await import('../../app/api/csp-report/route.ts')
    expect(typeof route.POST).toBe('function')
    for (const method of ['GET', 'PUT', 'PATCH', 'DELETE', 'HEAD', 'OPTIONS']) {
      expect(method in route, method).toBe(false)
    }
  })
})
