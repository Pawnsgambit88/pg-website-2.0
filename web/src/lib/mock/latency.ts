import { ApiError } from '@/lib/api/errors'
import { SLOW_MS, type MockMode } from '@/lib/mock/mode'

// Latency and failure injection (ARCH-001 11.4). Data-driven by the mode argument and an optional per-adapter delay;
// both are OFF by default (mode 'default', delayMs 0). No timers or state live at module level.

export interface InjectionOptions {
  /** Extra fixed delay in ms for every call (test hook). Default 0. */
  delayMs?: number
}

function wait(ms: number, signal: AbortSignal | undefined): Promise<void> {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) {
      reject(new DOMException('The request was cancelled.', 'AbortError'))
      return
    }
    const timer = setTimeout(resolve, ms)
    signal?.addEventListener(
      'abort',
      () => {
        clearTimeout(timer)
        reject(new DOMException('The request was cancelled.', 'AbortError'))
      },
      { once: true },
    )
  })
}

/** Applies the mode's delay, then throws for mode 'error'. Call at the start of every mock method. */
export async function inject(mode: MockMode, options: InjectionOptions, signal?: AbortSignal): Promise<void> {
  const ms = (options.delayMs ?? 0) + (mode === 'slow' ? SLOW_MS : 0)
  if (ms > 0) await wait(ms, signal)
  if (mode === 'error') throw new ApiError('HTTP_5XX', { status: 503, detail: 'Injected mock failure' })
}
