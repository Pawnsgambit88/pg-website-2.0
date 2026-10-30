// CSP violation report intake (TASK-120, SEC-001 F-11, ARCH-001 10.5 / 17.1 / 19). Pure logic behind
// app/api/csp-report/route.ts so it can be unit-tested without a server.
//
// Contract: POST only, ALWAYS 204 (an attacker learns nothing and a browser never retries), content types limited to
// `application/csp-report` and `application/reports+json`, body capped at 8 KB while streaming, URLs reduced to origin
// and path (query and fragment dropped), `script-sample` and every request header never read, no storage, no state.
// The record goes to a sink; TASK-122 swaps the default console sink for the observability adapter in one place.
// Rate limiting is the Vercel Firewall's job (OPS-001 FW-02, FW-10, FW-14), not this handler's.

import { observeProvider, reportError } from '@/lib/observe/observer'

export const MAX_REPORT_BYTES = 8 * 1024
export const ACCEPTED_REPORT_TYPES = ['application/csp-report', 'application/reports+json'] as const
/** Reports of a single POST that are looked at; a Reporting API batch can hold many. */
export const MAX_REPORTS_PER_REQUEST = 10

/** What is logged. Whitelist only: nothing here can carry a query string, a token or typed content. */
export interface CspViolationRecord {
  readonly source: 'csp-report' | 'reporting-api'
  /** Effective directive, for example `script-src-elem`. Token characters only. */
  readonly directive: string
  /** Origin of the blocked resource, or a CSP keyword (`inline`, `eval`, `data`, `blob`, `self`). */
  readonly blocked: string
  /** Path (no query, no fragment) of the document, or `unknown`. */
  readonly documentPath: string
  readonly disposition: 'enforce' | 'report'
  readonly status: number | undefined
}

export type CspViolationSink = (record: CspViolationRecord) => void

const KEYWORDS = new Set(['inline', 'eval', 'wasm-eval', 'data', 'blob', 'filesystem', 'self', 'mediastream'])
const DIRECTIVE_SHAPE = /^[a-z][a-z-]{0,39}$/
const MAX_FIELD = 120

const asRecord = (value: unknown): Record<string, unknown> | undefined =>
  typeof value === 'object' && value !== null && !Array.isArray(value) ? (value as Record<string, unknown>) : undefined

const asString = (value: unknown): string | undefined => (typeof value === 'string' ? value : undefined)

/** Strips control characters (log injection) and bounds the length. */
function clean(value: string): string {
  let out = ''
  for (const char of value) {
    const code = char.codePointAt(0) ?? 0
    const control = code <= 0x1f || (code >= 0x7f && code <= 0x9f) || code === 0x2028 || code === 0x2029
    if (!control) out += char
  }
  return out.slice(0, MAX_FIELD)
}

/**
 * Origin of an http(s) URL, or a CSP keyword, or `other`. Never a path or query: a blocked URL can embed a token.
 */
export function blockedOrigin(raw: string | undefined): string {
  if (raw === undefined || raw === '') return 'unknown'
  const lower = raw.toLowerCase()
  if (KEYWORDS.has(lower)) return lower
  // `data:...` and `blob:...` URIs keep only their scheme: the rest is content.
  const scheme = /^([a-z][a-z0-9+.-]*):/.exec(lower)?.[1]
  if (scheme === 'data' || scheme === 'blob' || scheme === 'filesystem') return scheme
  try {
    const url = new URL(raw)
    if (url.protocol === 'http:' || url.protocol === 'https:' || url.protocol === 'ws:' || url.protocol === 'wss:') {
      return clean(url.origin)
    }
    return clean(url.protocol.replace(/:$/, ''))
  } catch {
    return 'other'
  }
}

/** Pathname of the reporting document with the query and fragment dropped (F-11). */
export function documentPath(raw: string | undefined): string {
  if (raw === undefined || raw === '') return 'unknown'
  try {
    return clean(new URL(raw).pathname)
  } catch {
    return 'unknown'
  }
}

function directiveOf(body: Record<string, unknown>): string | undefined {
  const candidate = asString(
    body['effective-directive'] ?? body.effectiveDirective ?? body['violated-directive'] ?? body.violatedDirective,
  )
  // `violated-directive` may carry the whole source list ("script-src 'self' ..."): keep the directive name only.
  const name = candidate?.trim().split(/\s+/)[0]?.toLowerCase()
  return name !== undefined && DIRECTIVE_SHAPE.test(name) ? name : undefined
}

function dispositionOf(value: unknown): 'enforce' | 'report' {
  return value === 'report' ? 'report' : 'enforce'
}

function statusOf(value: unknown): number | undefined {
  return typeof value === 'number' && Number.isInteger(value) && value >= 0 && value <= 999 ? value : undefined
}

function fromLegacy(body: Record<string, unknown>): CspViolationRecord | undefined {
  const directive = directiveOf(body)
  if (directive === undefined) return undefined
  return {
    source: 'csp-report',
    directive,
    blocked: blockedOrigin(asString(body['blocked-uri'])),
    documentPath: documentPath(asString(body['document-uri'])),
    disposition: dispositionOf(body.disposition),
    status: statusOf(body['status-code']),
  }
}

function fromReportingApi(body: Record<string, unknown>): CspViolationRecord | undefined {
  const directive = directiveOf(body)
  if (directive === undefined) return undefined
  return {
    source: 'reporting-api',
    directive,
    blocked: blockedOrigin(asString(body.blockedURL)),
    documentPath: documentPath(asString(body.documentURL)),
    disposition: dispositionOf(body.disposition),
    status: statusOf(body.statusCode),
  }
}

/**
 * Extracts whitelisted records from a parsed body in either wire format. Anything malformed yields fewer or no records,
 * never an exception. `script-sample`, `referrer`, `original-policy` and `source-file` are never read.
 */
export function extractViolations(payload: unknown): CspViolationRecord[] {
  const records: CspViolationRecord[] = []
  if (Array.isArray(payload)) {
    for (const entry of payload.slice(0, MAX_REPORTS_PER_REQUEST)) {
      const report = asRecord(entry)
      const body = asRecord(report?.body)
      if (report?.type !== 'csp-violation' || body === undefined) continue
      const record = fromReportingApi(body)
      if (record !== undefined) records.push(record)
    }
    return records
  }
  const legacy = asRecord(asRecord(payload)?.['csp-report'])
  if (legacy !== undefined) {
    const record = fromLegacy(legacy)
    if (record !== undefined) records.push(record)
  }
  return records
}

/** True for `application/csp-report` and `application/reports+json`, ignoring case and parameters. */
export function isAcceptedContentType(header: string | null): boolean {
  if (header === null) return false
  const type = header.split(';')[0]?.trim().toLowerCase() ?? ''
  return (ACCEPTED_REPORT_TYPES as readonly string[]).includes(type)
}

/**
 * Reads at most `limit` bytes. Returns undefined as soon as the stream exceeds the cap (the rest is cancelled, never
 * buffered) so an oversize body costs no memory. A declared Content-Length over the cap is refused without reading.
 */
export async function readCappedBody(request: Request, limit: number = MAX_REPORT_BYTES): Promise<string | undefined> {
  const declared = Number(request.headers.get('content-length'))
  if (Number.isFinite(declared) && declared > limit) return undefined
  const stream = request.body
  if (stream === null) return ''
  const reader = stream.getReader()
  const chunks: Uint8Array[] = []
  let total = 0
  for (;;) {
    const { done, value } = await reader.read()
    if (done) break
    total += value.byteLength
    if (total > limit) {
      await reader.cancel().catch(() => undefined)
      return undefined
    }
    chunks.push(value)
  }
  const joined = new Uint8Array(total)
  let offset = 0
  for (const chunk of chunks) {
    joined.set(chunk, offset)
    offset += chunk.byteLength
  }
  return new TextDecoder('utf-8', { fatal: false }).decode(joined)
}

const NO_CONTENT_HEADERS = { 'Cache-Control': 'no-store' } as const

/**
 * Builds the POST handler. Every path out of it, including thrown errors and a throwing sink, is a 204.
 * The sink receives whitelisted records only.
 */
export function createCspReportHandler(sink: CspViolationSink): (request: Request) => Promise<Response> {
  return async (request) => {
    try {
      if (isAcceptedContentType(request.headers.get('content-type'))) {
        const text = await readCappedBody(request)
        if (text !== undefined && text !== '') {
          for (const record of extractViolations(JSON.parse(text) as unknown)) sink(record)
        }
      }
    } catch {
      // Malformed JSON, aborted stream or a failing sink: nothing to tell the sender.
    }
    return new Response(null, { status: 204, headers: NO_CONTENT_HEADERS })
  }
}

/**
 * Sink routed through `lib/observe` (TASK-122). When a provider is configured the record goes to
 * `reportError({ area: 'csp' })` with the whitelisted fields as context. With the no-op provider (the production
 * default) the intake keeps its own server-side line, because Report-Only rollout (ARCH-001 10.5) needs these in the
 * Vercel runtime logs: one structured line, whitelisted fields only, JSON-encoded so no field can break the line.
 */
export function logCspViolation(record: CspViolationRecord): void {
  if (observeProvider === 'noop') {
    console.warn(JSON.stringify({ event: 'csp-violation', ...record }))
    return
  }
  reportError(new Error('csp-violation'), { area: 'csp', action: record.directive, extra: { ...record } })
}
