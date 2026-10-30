'use client'

import { z } from 'zod'
import { clearMockAuthSession } from '@/lib/mock/auth/store.browser'
import { parseMockMode, type MockMode } from '@/lib/mock/mode'
import { defineStore } from '@/lib/storage/versioned'

// The ONLY mutable mock state (ARCH-001 11.4): per browser session, sessionStorage key `pg:mock:v1`, via
// lib/storage/versioned.ts. There is no module-level mutable object: every function reads and writes the storage
// area, and on the server the storage is absent, so reads give defaults and writes are no-ops. Nothing here is
// reachable from a server render (the server adapter never imports this file).
// The mock auth database lives beside it under the suffix key `pg:mock:v1:auth` (lib/mock/auth/store.browser.ts).

const stateSchema = z.object({
  /** Scenario chosen with `?mock=` (slow | error | empty), kept for the session. */
  mode: z.enum(['default', 'slow', 'error', 'empty']),
  /** Contact messages "sent" this session (count only; message bodies are never stored). */
  contactsSent: z.int().min(0).max(1000),
})
type MockSessionState = z.infer<typeof stateSchema>

const store = defineStore<MockSessionState>({
  area: 'session',
  name: 'mock',
  version: 1,
  parse: (value) => {
    const result = stateSchema.safeParse(value)
    return result.success ? result.data : null
  },
})

const INITIAL: MockSessionState = { mode: 'default', contactsSent: 0 }

function read(): MockSessionState {
  return store.read() ?? INITIAL
}

/** `?mock=` in the URL wins and is remembered for the session; otherwise the stored mode; otherwise 'default'. */
export function resolveBrowserMode(): MockMode {
  if (typeof window === 'undefined') return 'default'
  const fromUrl = parseMockMode(new URLSearchParams(window.location.search).get('mock'))
  if (fromUrl !== null) {
    store.write({ ...read(), mode: fromUrl })
    return fromUrl
  }
  return read().mode
}

/** Counts a "sent" contact message for the session. Returns the new count. */
export function recordContactSent(): number {
  const next = { ...read(), contactsSent: read().contactsSent + 1 }
  store.write(next)
  return next.contactsSent
}

/** Resets the mock session: scenario, counters and the mock auth database (accounts, families, reset requests). */
export function clearMockSession(): void {
  store.remove()
  clearMockAuthSession()
}
