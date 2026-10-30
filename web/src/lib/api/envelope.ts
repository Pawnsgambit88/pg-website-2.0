import type { z } from 'zod'
import { ApiError, resolveErrorCode, safeRequestId, codeFromStatus } from '@/lib/api/errors'
import { envelopeErrorSchema, envelopeMetaSchema } from '@/lib/api/types/envelope'
import { paginationWireSchema, toPaginationMeta, type PaginationWire } from '@/lib/api/types/pagination'

// Response parsing: the unified envelope plus the removable legacy-bare normaliser (ARCH-001 11.2; backend contract 2.1;
// SEC-001 F-16, L-16). Shared by the server and browser entries: no browser or Node globals beyond `Response`.
//
// Order (strict):
//   1. 204 / 205 / empty 2xx body: no payload, resolves `undefined`.
//   2. ENVELOPE: a JSON object with a boolean `success` and a `data` or `error` key. Success returns `data` (merged with
//      `meta.pagination` into `Page<T>` for lists). Failure throws ApiError from `error.{code,detail,fields,retry_after,reason}`.
//   3. LEGACY-BARE (transition only, DEC-008): a 2xx JSON body that is not an envelope is the payload itself (a DRF page
//      `{count,next,previous,results}` becomes `Page<T>`; `next` is NEVER read, F-16). A non-2xx body with a top-level string
//      `error` is the legacy flat error; a DRF `{field: [messages]}` body becomes `fields`.
//   4. Anything else (HTML, non-JSON): BAD_RESPONSE for 2xx, the HTTP fallback code otherwise (5xx is HTTP_5XX).
// Delete the "LEGACY-BARE" section (and `LegacyPageHint`) when the backend is fully enveloped; nothing else depends on it.
// Nothing here logs. A body, a header value or a URL never reaches a message (AC-5).

export interface ParsedResponse {
  /** The value to validate with the method's schema. Lists are already shaped as `{ items, pagination }`. */
  payload: unknown
  requestId: string | undefined
  /** True when the legacy-bare normaliser produced the payload. */
  legacy: boolean
}

/** The request's own paging, used only to shape a legacy DRF page (the legacy body carries no page number). */
export interface LegacyPageHint {
  page: number
  pageSize: number
}

export interface ParseOptions {
  legacyPage?: LegacyPageHint | undefined
}

type JsonObject = Record<string, unknown>

function isObject(value: unknown): value is JsonObject {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

/** Strict envelope detection (ARCH-001 11.2 step 2). */
export function isEnvelope(value: unknown): value is JsonObject & { success: boolean } {
  return isObject(value) && typeof value.success === 'boolean' && ('data' in value || 'error' in value)
}

function tryParseJson(text: string): unknown {
  try {
    return JSON.parse(text) as unknown
  } catch {
    return undefined
  }
}

/** `Retry-After` in whole seconds. The HTTP-date form is ignored (the API sends seconds, contract 2.10). */
function retryAfterFromHeader(headers: Headers): number | undefined {
  const raw = headers.get('Retry-After')
  return raw !== null && /^\d{1,6}$/.test(raw.trim()) ? Number(raw.trim()) : undefined
}

function isSuccessStatus(status: number): boolean {
  return status >= 200 && status < 300
}

// ---------- error construction ----------

function errorFromStatus(status: number, requestId: string | undefined, retryAfter: number | undefined): ApiError {
  return new ApiError(codeFromStatus(status), { status, requestId, retryAfter })
}

function errorFromEnvelope(
  body: JsonObject,
  status: number,
  headerRequestId: string | undefined,
  headerRetryAfter: number | undefined,
): ApiError {
  const meta = envelopeMetaSchema.safeParse(body.meta)
  const requestId = (meta.success ? safeRequestId(meta.data.request_id) : undefined) ?? headerRequestId
  const parsed = envelopeErrorSchema.safeParse(body.error)
  if (parsed.success) {
    const { code, serverCode } = resolveErrorCode(parsed.data.code, status)
    return new ApiError(code, {
      status,
      detail: parsed.data.detail,
      fields: parsed.data.fields,
      requestId,
      retryAfter: parsed.data.retry_after ?? headerRetryAfter,
      reason: parsed.data.reason,
      serverCode,
    })
  }
  // A malformed `error` object: keep what is certain (a string code) and fall back to the HTTP status for the rest.
  const wire = isObject(body.error) && typeof body.error.code === 'string' ? body.error.code : undefined
  const { code, serverCode } = resolveErrorCode(wire, status)
  return new ApiError(code, { status, requestId, retryAfter: headerRetryAfter, serverCode })
}

// ---------- LEGACY-BARE normaliser (removable, DEC-008) ----------

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item) => typeof item === 'string')
}

/** DRF validation body: a non-empty object whose every value is a list of strings. */
function legacyFieldErrors(body: JsonObject): Record<string, string[]> | undefined {
  const entries = Object.entries(body)
  if (entries.length === 0 || !entries.every(([, value]) => isStringArray(value))) return undefined
  return Object.fromEntries(entries) as Record<string, string[]>
}

function legacyError(
  body: JsonObject,
  status: number,
  requestId: string | undefined,
  headerRetryAfter: number | undefined,
): ApiError {
  if (typeof body.error === 'string') {
    // Legacy flat shape: { error, detail, retry_after }. `error` is a code or a sentence; only a known code is trusted.
    const { code, serverCode } = resolveErrorCode(body.error, status)
    return new ApiError(code, {
      status,
      detail: typeof body.detail === 'string' ? body.detail : undefined,
      requestId,
      retryAfter: typeof body.retry_after === 'number' ? body.retry_after : headerRetryAfter,
      serverCode,
    })
  }
  const fields = legacyFieldErrors(body)
  if (fields !== undefined) {
    return new ApiError(codeFromStatus(status), { status, fields, requestId, retryAfter: headerRetryAfter })
  }
  return new ApiError(codeFromStatus(status), {
    status,
    detail: typeof body.detail === 'string' ? body.detail : undefined,
    requestId,
    retryAfter: headerRetryAfter,
  })
}

/** DRF page to `Page<T>` input. `next` and `previous` are ignored on purpose: following them is the F-16 attack. */
function legacyPage(body: JsonObject, hint: LegacyPageHint | undefined): unknown {
  const results = body.results
  const count = body.count
  if (!Array.isArray(results) || typeof count !== 'number' || !Number.isInteger(count) || count < 0) return body
  const pageSize = Math.max(1, hint?.pageSize ?? Math.max(results.length, 1))
  return {
    items: results,
    pagination: {
      page: Math.max(1, hint?.page ?? 1),
      pageSize,
      total: count,
      totalPages: Math.ceil(count / pageSize),
    },
  }
}

// ---------- public API ----------

/**
 * Reads one HTTP response. Resolves the payload or throws ApiError. Errors from reading the body (abort, network) are NOT
 * converted here: the caller (`fetchParsed`) owns the abort/timeout/network classification.
 */
export async function parseResponse(response: Response, options: ParseOptions = {}): Promise<ParsedResponse> {
  const { status } = response
  const success = isSuccessStatus(status)
  const headerRequestId = safeRequestId(response.headers.get('X-Request-ID'))
  const headerRetryAfter = retryAfterFromHeader(response.headers)

  if (status === 204 || status === 205) {
    return { payload: undefined, requestId: headerRequestId, legacy: false }
  }

  const text = (await response.text()).trim()
  if (text === '') {
    if (success) return { payload: undefined, requestId: headerRequestId, legacy: false }
    throw errorFromStatus(status, headerRequestId, headerRetryAfter)
  }

  const json = tryParseJson(text)
  if (json === undefined) {
    // HTML error page, plain text or truncated JSON.
    throw success
      ? new ApiError('BAD_RESPONSE', { status, requestId: headerRequestId })
      : errorFromStatus(status, headerRequestId, headerRetryAfter)
  }

  if (isEnvelope(json)) {
    if (json.success === false || !success) {
      // A failure envelope, or any non-2xx (a `success: true` body on a 4xx/5xx is not trusted).
      throw json.success === false
        ? errorFromEnvelope(json, status, headerRequestId, headerRetryAfter)
        : errorFromStatus(status, headerRequestId, headerRetryAfter)
    }
    const meta = envelopeMetaSchema.safeParse(json.meta)
    const requestId = (meta.success ? safeRequestId(meta.data.request_id) : undefined) ?? headerRequestId
    const pagination = parsePagination(json.meta)
    const payload =
      pagination !== null && Array.isArray(json.data)
        ? { items: json.data, pagination: toPaginationMeta(pagination) }
        : json.data
    return { payload, requestId, legacy: false }
  }

  // ----- LEGACY-BARE (removable) -----
  if (!success) {
    throw isObject(json)
      ? legacyError(json, status, headerRequestId, headerRetryAfter)
      : errorFromStatus(status, headerRequestId, headerRetryAfter)
  }
  const payload = isObject(json) ? legacyPage(json, options.legacyPage) : json
  return { payload, requestId: headerRequestId, legacy: true }
}

function parsePagination(meta: unknown): PaginationWire | null {
  if (!isObject(meta)) return null
  const parsed = paginationWireSchema.safeParse(meta.pagination)
  return parsed.success ? parsed.data : null
}

/**
 * Validates a payload with the method's schema. A mismatch becomes ApiError(BAD_RESPONSE). In development the schema PATH
 * (never the value, never the body) is logged to help fix a drift; production logs nothing until `lib/observe` exists.
 */
export function validatePayload<T>(schema: z.ZodType<T>, parsed: ParsedResponse, status: number): T {
  const result = schema.safeParse(parsed.payload)
  if (result.success) return result.data
  if (process.env.NODE_ENV !== 'production') {
    const paths = [...new Set(result.error.issues.map((issue) => issue.path.map(String).join('.') || '(root)'))]
    console.warn('[pg-api] response did not match its schema at:', paths.slice(0, 10).join(', '))
  }
  throw new ApiError('BAD_RESPONSE', { status, requestId: parsed.requestId })
}
