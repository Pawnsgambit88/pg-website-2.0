// PII scrubber (ARCH-001 19.4, SEC-001 F-17, TASK-122). Pure functions, no I/O, safe on server and client.
// Two layers: key-name drop (sensitive keys lose their value) and value-pattern redaction (secrets hiding in free text).
// Order matters: URLs and Bearer strings go first so later patterns do not see their pieces.

export const REDACTED = '[redacted]'

const MAX_STRING = 500
const MAX_STACK = 2000
const MAX_DEPTH = 4
const MAX_KEYS = 30
const MAX_ITEMS = 20

/** Keys whose value is dropped whatever it holds. */
const SENSITIVE_KEY =
  /token|secret|password|passwd|authorization|cookie|session|email|phone|mobile|signature|razorpay|order|payment|card|cvv|otp|name|address|dob|birth|jwt|bearer|credential|api[-_]?key/i

// Each rule is linear-time: bounded quantifiers or single character classes, no nested quantifiers.
const RULES: ReadonlyArray<readonly [RegExp, string]> = [
  // URLs: keep origin and path, drop userinfo, query and fragment.
  [/\b([a-z][a-z0-9+.-]{1,15}:\/\/)(?:[^\s/@]{1,100}@)?([^\s/?#]{1,255})([^\s?#]{0,300})[^\s]*/gi, '$1$2$3'],
  // Bare query strings and fragments left in text such as `/path?x=1` or `#access_token=...`.
  [/(\/[^\s?#]{0,200})[?#][^\s]*/g, '$1'],
  [/\bBearer\s+[A-Za-z0-9._~+/=-]{4,}/gi, 'Bearer [redacted]'],
  [/\bBasic\s+[A-Za-z0-9+/=]{8,}/g, 'Basic [redacted]'],
  // JWT: three base64url segments.
  [/\beyJ[A-Za-z0-9_-]{5,}\.[A-Za-z0-9_-]{5,}\.[A-Za-z0-9_-]{0,}/g, REDACTED],
  [/[A-Za-z0-9._%+-]{1,64}@[A-Za-z0-9-]{1,63}(?:\.[A-Za-z0-9-]{1,63}){1,5}/g, REDACTED],
  // Razorpay identifiers: order_, pay_, rfnd_, plink_, cust_, rzp_(live|test)_ keys.
  [/\b(?:order|pay|rfnd|plink|cust|acc|inv|sub|qr|rzp_live|rzp_test)_[A-Za-z0-9]{6,}/gi, REDACTED],
  // key=value / key: value pairs that name a secret.
  [
    /\b(?:token|secret|password|passwd|authorization|api[-_]?key|signature|otp|cvv)\s*[=:]\s*[^\s,;&"']{1,200}/gi,
    REDACTED,
  ],
  // Card-like digit groups (13 to 19 digits with optional spaces or dashes).
  [/\b\d(?:[ -]?\d){12,18}\b/g, REDACTED],
  // Phone numbers: optional +, then 10 to 14 digits with separators.
  [/(?<![\w.])\+?\d[\d ()-]{8,16}\d(?![\w])/g, REDACTED],
  // Long hex or base64-like runs (hashes, keys, opaque tokens).
  [/\b[A-Fa-f0-9]{24,}\b/g, REDACTED],
  [/[A-Za-z0-9_+/-]{32,}={0,2}/g, REDACTED],
  // Any remaining long digit run (ids that map to people).
  [/\d{9,}/g, REDACTED],
]

function oneLine(value: string): string {
  let out = ''
  for (const char of value) {
    const code = char.codePointAt(0) ?? 0
    const control = code <= 0x1f || (code >= 0x7f && code <= 0x9f) || code === 0x2028 || code === 0x2029
    out += control ? ' ' : char
  }
  return out
}

/** Redacts PII patterns from free text and bounds its length. Newlines become spaces (log injection). */
export function scrubString(input: string, max: number = MAX_STRING): string {
  let out = oneLine(input.slice(0, max * 2))
  for (const [pattern, replacement] of RULES) out = out.replace(pattern, replacement)
  return out.length > max ? `${out.slice(0, max)}...` : out
}

/** Stack traces keep their line structure, but every line is scrubbed and the total is bounded. */
export function scrubStack(stack: string): string {
  const lines = stack.slice(0, MAX_STACK * 2).split('\n')
  const out: string[] = []
  let total = 0
  for (const line of lines) {
    const clean = scrubString(line, 300)
    total += clean.length + 1
    if (total > MAX_STACK) break
    out.push(clean)
  }
  return out.join('\n')
}

/** Reduces a URL or path to `origin + pathname`, with no userinfo, query or fragment. Unparseable input becomes `unknown`. */
export function scrubUrl(raw: string): string {
  try {
    const url = new URL(raw, 'http://placeholder.invalid')
    const isRelative = url.origin === 'http://placeholder.invalid' && !/^[a-z][a-z0-9+.-]*:/i.test(raw)
    return scrubString(isRelative ? url.pathname : `${url.origin}${url.pathname}`, 200)
  } catch {
    return 'unknown'
  }
}

/**
 * Scrubs any value into a JSON-safe structure: sensitive keys are dropped, strings are pattern-redacted, depth, keys and
 * array length are bounded, functions and symbols vanish. Cycles end at the depth limit.
 */
export function scrubValue(value: unknown, depth: number = 0): unknown {
  if (value === null || value === undefined) return value
  switch (typeof value) {
    case 'string':
      return scrubString(value)
    case 'number':
      return Number.isFinite(value) ? value : null
    case 'boolean':
      return value
    case 'bigint':
      return REDACTED
    case 'object':
      break
    default:
      return undefined
  }
  if (depth >= MAX_DEPTH) return '[truncated]'
  if (value instanceof Error) return scrubErrorLike(value)
  if (Array.isArray(value)) return (value as unknown[]).slice(0, MAX_ITEMS).map((item) => scrubValue(item, depth + 1))
  const out: Record<string, unknown> = {}
  for (const [key, inner] of Object.entries(value as Record<string, unknown>).slice(0, MAX_KEYS)) {
    out[key] = SENSITIVE_KEY.test(key) ? REDACTED : scrubValue(inner, depth + 1)
  }
  return out
}

function scrubErrorLike(error: Error): Record<string, unknown> {
  return { name: scrubString(error.name, 80), message: scrubString(error.message) }
}

/** Context objects: same rules as any value, always an object back. */
export function scrubContext(ctx: Readonly<Record<string, unknown>>): Record<string, unknown> {
  const result = scrubValue(ctx)
  return typeof result === 'object' && result !== null && !Array.isArray(result)
    ? (result as Record<string, unknown>)
    : {}
}
