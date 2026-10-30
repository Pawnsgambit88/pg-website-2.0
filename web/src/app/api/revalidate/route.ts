import { revalidateTag } from 'next/cache'
import { readCappedBytes } from '@/lib/revalidate/body'
import { createDuplicateStore } from '@/lib/revalidate/duplicates'
import { HEADER_EVENT_ID, HEADER_SIGNATURE, HEADER_TIMESTAMP } from '@/lib/revalidate/limits'
import { tagsToExpire } from '@/lib/revalidate/mapping'
import { parsePayload } from '@/lib/revalidate/payload'
import { activeSecrets } from '@/lib/revalidate/secrets'
import { isValidEventId, verifySignature } from '@/lib/revalidate/signature'
import { isWithinWindow, parseTimestamp } from '@/lib/revalidate/timestamp'
import { reportError } from '@/lib/observe/observer'

// Signed revalidation webhook (ARCH-001 9.1 to 9.4; ARCH-001-isr-revalidation; SEC-001 F-07, F-08, F-11).
// POST only (no other export, so Next answers 405). Node runtime, never cached. Failures never say why.
// Order: secret configured -> capped body (413) -> timestamp window -> signature -> schema (400) -> duplicate (202) -> expire.
export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// The one documented module-state exception: a bounded per-instance duplicate memory (best effort, not global).
const duplicates = createDuplicateStore()
let missingSecretLogged = false

const NO_STORE = { 'Cache-Control': 'no-store' } as const
const reply = (status: number, ok: boolean): Response => Response.json({ ok }, { status, headers: NO_STORE })

export async function POST(request: Request): Promise<Response> {
  const secrets = activeSecrets()
  if (secrets.length === 0) {
    if (!missingSecretLogged) {
      missingSecretLogged = true
      reportError(new Error('revalidate-secret-missing'), { area: 'revalidate', action: 'config' })
    }
    return reply(503, false)
  }

  try {
    const body = await readCappedBytes(request)
    if (body === undefined) return reply(413, false)

    const timestampHeader = request.headers.get(HEADER_TIMESTAMP)
    const eventId = request.headers.get(HEADER_EVENT_ID)
    const timestamp = parseTimestamp(timestampHeader)
    const nowMs = Date.now()
    if (timestampHeader === null || timestamp === undefined || !isWithinWindow(timestamp, Math.floor(nowMs / 1000))) {
      return reply(401, false)
    }
    if (!isValidEventId(eventId)) return reply(401, false)
    if (!verifySignature(secrets, timestampHeader, eventId, body, request.headers.get(HEADER_SIGNATURE))) {
      return reply(401, false)
    }

    const event = parsePayload(new TextDecoder('utf-8', { fatal: true }).decode(body))
    if (event === undefined) return reply(400, false)

    if (duplicates.has(eventId, nowMs)) return reply(202, true)

    for (const tag of tagsToExpire(event)) revalidateTag(tag, { expire: 0 })
    duplicates.add(eventId, nowMs)
    return reply(202, true)
  } catch (error) {
    // Bad UTF-8, aborted stream or a revalidation failure: uniform, uninformative, no body or secret in the log.
    reportError(error instanceof Error ? new Error(error.name) : new Error('revalidate-failed'), {
      area: 'revalidate',
      action: 'handle',
    })
    return reply(400, false)
  }
}
