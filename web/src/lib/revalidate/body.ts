import 'server-only'
import { MAX_BODY_BYTES } from './limits.ts'

/**
 * Reads at most `limit` bytes of the request body. Returns undefined as soon as the declared length or the streamed total
 * exceeds the cap (the rest is cancelled, never buffered; SEC-001 F-08). The bytes are returned raw: the signature is
 * computed over them before any decoding.
 */
export async function readCappedBytes(
  request: Request,
  limit: number = MAX_BODY_BYTES,
): Promise<Uint8Array | undefined> {
  const declared = Number(request.headers.get('content-length'))
  if (Number.isFinite(declared) && declared > limit) return undefined
  const stream = request.body
  if (stream === null) return new Uint8Array(0)
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
  return joined
}
