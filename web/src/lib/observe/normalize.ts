// Turns anything thrown into a scrubbed, JSON-safe shape (ARCH-001 19.4). Used by every sink that logs an error.
import { scrubContext, scrubStack, scrubString } from './scrub'
import type { ErrorContext, ScrubbedError } from './types'

const DIGEST = /^[\w-]{1,32}$/

function digestOf(error: unknown): string | undefined {
  if (typeof error !== 'object' || error === null || !('digest' in error)) return undefined
  const { digest } = error
  return typeof digest === 'string' && DIGEST.test(digest) ? digest : undefined
}

export function normalizeError(error: unknown): ScrubbedError {
  if (error instanceof Error) {
    return {
      name: scrubString(error.name, 80),
      message: scrubString(error.message),
      stack: error.stack === undefined ? undefined : scrubStack(error.stack),
      digest: digestOf(error),
    }
  }
  return {
    name: 'NonError',
    message: typeof error === 'string' ? scrubString(error) : `Non-error value of type ${typeof error}`,
    stack: undefined,
    digest: digestOf(error),
  }
}

/** Context fields a sink may log: area and action are short labels, requestId is an opaque id, extra is scrubbed. */
export function normalizeContext(ctx: ErrorContext): Record<string, unknown> {
  return {
    area: scrubString(ctx.area, 60),
    action: ctx.action === undefined ? undefined : scrubString(ctx.action, 60),
    requestId: ctx.requestId === undefined ? undefined : scrubString(ctx.requestId, 64),
    extra: ctx.extra === undefined ? undefined : scrubContext(ctx.extra),
  }
}
