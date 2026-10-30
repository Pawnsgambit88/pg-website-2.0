import type { z } from 'zod'
import { parseResponse, validatePayload, type LegacyPageHint } from '@/lib/api/envelope'
import { ApiError, createAbortError, isAbortError } from '@/lib/api/errors'

// The shared HTTP core under both entries (TASK-014): signal combining, timeout, and "one request in, typed data or
// ApiError out". It has no state, reads no environment, builds no URLs and attaches no credentials: the server and
// browser entries decide those. `fetch` here is the global one; the entries pass a different implementation in tests.
//
// anySignal is the in-repo combiner required by ARCH-001 5.2 / 11.6 (AbortSignal.any is above the browser floor and the
// lint rule rejects it).

export interface CombinedSignal {
  signal: AbortSignal
  /** Removes the listeners added to the inputs. Always call it when the request settles. */
  cleanup: () => void
}

/** Aborts when any input aborts, carrying that input's reason. Inputs that are `undefined` are skipped. */
export function anySignal(signals: readonly (AbortSignal | undefined)[]): CombinedSignal {
  const controller = new AbortController()
  const listeners: { signal: AbortSignal; listener: () => void }[] = []

  const cleanup = (): void => {
    for (const { signal, listener } of listeners) signal.removeEventListener('abort', listener)
    listeners.length = 0
  }

  for (const input of signals) {
    if (input === undefined) continue
    if (input.aborted) {
      controller.abort(input.reason)
      cleanup()
      return { signal: controller.signal, cleanup }
    }
    const listener = (): void => {
      controller.abort(input.reason)
      cleanup()
    }
    input.addEventListener('abort', listener, { once: true })
    listeners.push({ signal: input, listener })
  }
  return { signal: controller.signal, cleanup }
}

export type FetchLike = (input: string, init: RequestInit) => Promise<Response>

export interface HttpRequest {
  /** Already built, validated URL. */
  url: string
  init: RequestInit
  /** The caller's cancel (TanStack Query supplies one so superseded requests stop). */
  signal?: AbortSignal | undefined
  timeoutMs: number
  /** Payload schema of the PgApi method. Omit for bodyless successes (202/204). */
  schema?: z.ZodType | undefined
  legacyPage?: LegacyPageHint | undefined
  fetchImpl?: FetchLike | undefined
}

export interface HttpResult<T> {
  data: T
  status: number
  requestId: string | undefined
}

const TIMED_OUT = Symbol('timed-out')

/**
 * Sends one request and parses it. Outcomes:
 *   - data: the validated payload (or `undefined` for 204/205/empty 2xx when no schema is given);
 *   - AbortError: the CALLER cancelled. Callers/Query treat it as "not an error"; nothing is logged;
 *   - ApiError(TIMEOUT): the timeout elapsed;
 *   - ApiError(NETWORK): fetch rejected (offline, DNS, CORS, connection reset);
 *   - ApiError(<code>): a failure envelope / legacy error / non-2xx status;
 *   - ApiError(BAD_RESPONSE): HTML or non-JSON 2xx, or the payload failed its schema.
 * Never logs anything about the request or response (AC-5).
 */
export async function sendRequest<T = unknown>(request: HttpRequest): Promise<HttpResult<T>> {
  const timeout = new AbortController()
  const timer = setTimeout(() => {
    timeout.abort(TIMED_OUT)
  }, request.timeoutMs)
  const combined = anySignal([request.signal, timeout.signal])
  const fetchImpl: FetchLike = request.fetchImpl ?? ((input, init) => fetch(input, init))

  try {
    const response = await fetchImpl(request.url, { ...request.init, signal: combined.signal })
    const parsed = await parseResponse(response, { legacyPage: request.legacyPage })
    if (request.schema === undefined) {
      return { data: parsed.payload as T, status: response.status, requestId: parsed.requestId }
    }
    return {
      data: validatePayload(request.schema, parsed, response.status) as T,
      status: response.status,
      requestId: parsed.requestId,
    }
  } catch (error) {
    if (error instanceof ApiError) throw error
    if (request.signal?.aborted === true) throw createAbortError() // the caller cancelled: not an API failure
    if (timeout.signal.aborted && timeout.signal.reason === TIMED_OUT) {
      throw new ApiError('TIMEOUT', { status: 0 })
    }
    if (isAbortError(error)) throw createAbortError()
    throw new ApiError('NETWORK', { status: 0 }) // the original error can carry a URL or host: it is dropped on purpose
  } finally {
    clearTimeout(timer)
    combined.cleanup()
  }
}
