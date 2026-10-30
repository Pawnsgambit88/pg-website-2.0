// The only module allowed to touch localStorage / sessionStorage (ARCH-001 A.3, 22; lint rule restrictedGlobals).
// Rules this module enforces for every caller (RBP client-localstorage-schema, js-cache-storage):
//   - the key is `pg:<name>:v<N>` (optional `:<suffix>` for per-id keys), so a version bump abandons old values
//     instead of migrating them ("No migrations; a version bump discards old values", ARCH-001 22);
//   - a value is JSON, read back through the caller's validator and never trusted as-is;
//   - nothing here throws: storage may be missing (SSR, private mode, blocked cookies), full, or hold garbage.
//     Reads give `null`, writes and removals give `false`, and the caller degrades to memory (ARCH-001 12.1, FM-09).
// Never store tokens other than the refresh token (12.1) and no personal data beyond what ARCH-001 22 lists.

export type StorageArea = 'local' | 'session'

const NAME = /^[a-z][a-z0-9-]*(?::[a-z][a-z0-9-]*)*$/
const SUFFIX = /^[A-Za-z0-9_-]{1,64}$/

export interface StoreDefinition<T> {
  area: StorageArea
  /** Lower-case words joined by `-` or `:`, such as `auth`, `session-hint`, `auth:lock`. */
  name: string
  /** Positive integer. Bump it when the stored shape changes; old keys are then ignored. */
  version: number
  /**
   * Returns the typed value, or `null` when the unknown input is not valid. Must not throw (a throw is treated as
   * invalid). A zod schema fits: `(value) => { const r = schema.safeParse(value); return r.success ? r.data : null }`.
   */
  parse: (value: unknown) => T | null
}

export interface Store<T> {
  /** Base storage key, for example `pg:auth:v1`. */
  readonly key: string
  /** Storage key for a per-id value, for example `pg:builder-draft:v1:evt_42`. An invalid suffix gives `null`. */
  keyFor: (suffix: string) => string | null
  /** Validated value, or `null` when absent, unreadable, invalid (the bad entry is removed) or storage is unavailable. */
  read: (suffix?: string) => T | null
  /** `true` when the value was persisted; `false` on quota, unavailable storage or a non-serialisable value. */
  write: (value: T, suffix?: string) => boolean
  /** `true` when the key is gone afterwards (including when it never existed); `false` if storage is unavailable. */
  remove: (suffix?: string) => boolean
  /**
   * Calls `listener` when ANOTHER tab changes (or clears) this key. The `storage` event never fires in the tab that
   * wrote, so this is cross-tab only. The value is validated; removal and invalid data both arrive as `null`.
   * Returns the unsubscribe function. One shared window listener serves all subscriptions.
   */
  subscribe: (listener: (value: T | null, suffix: string | undefined) => void, suffix?: string) => () => void
}

function getArea(area: StorageArea): Storage | null {
  if (typeof window === 'undefined') return null
  try {
    // Accessing the property itself can throw a SecurityError when storage is blocked.
    const storage = area === 'local' ? window.localStorage : window.sessionStorage
    return storage ?? null
  } catch {
    return null
  }
}

/** `false` on the server and when the browser blocks storage. Reads and writes are still safe to call. */
export function isStorageAvailable(area: StorageArea): boolean {
  const storage = getArea(area)
  if (storage === null) return false
  try {
    const probe = 'pg:probe:v1'
    storage.setItem(probe, '1')
    storage.removeItem(probe)
    return true
  } catch {
    return false
  }
}

// ---- one shared `storage` listener (RBP client-event-listeners) ----

type Subscriber = (event: StorageEvent) => void
const subscribers = new Set<Subscriber>()

function onStorageEvent(event: StorageEvent): void {
  for (const subscriber of subscribers) subscriber(event)
}

function addSubscriber(subscriber: Subscriber): () => void {
  if (typeof window === 'undefined') return () => undefined
  if (subscribers.size === 0) window.addEventListener('storage', onStorageEvent)
  subscribers.add(subscriber)
  return () => {
    if (!subscribers.delete(subscriber)) return
    if (subscribers.size === 0) window.removeEventListener('storage', onStorageEvent)
  }
}

/** Defines one stored value. Throws only for a programmer error in the definition (bad name or version), at startup. */
export function defineStore<T>(definition: StoreDefinition<T>): Store<T> {
  const { area, name, version, parse } = definition
  if (!NAME.test(name)) throw new Error(`Invalid storage name "${name}"`)
  if (!Number.isInteger(version) || version < 1) throw new Error(`Invalid storage version ${String(version)}`)
  const key = `pg:${name}:v${version}`

  const keyFor = (suffix: string): string | null => (SUFFIX.test(suffix) ? `${key}:${suffix}` : null)
  const resolve = (suffix: string | undefined): string | null => (suffix === undefined ? key : keyFor(suffix))

  function validate(raw: string): T | null {
    try {
      return parse(JSON.parse(raw) as unknown)
    } catch {
      return null
    }
  }

  function remove(suffix?: string): boolean {
    const storageKey = resolve(suffix)
    const storage = getArea(area)
    if (storageKey === null || storage === null) return false
    try {
      storage.removeItem(storageKey)
      return true
    } catch {
      return false
    }
  }

  function read(suffix?: string): T | null {
    const storageKey = resolve(suffix)
    const storage = getArea(area)
    if (storageKey === null || storage === null) return null
    let raw: string | null
    try {
      raw = storage.getItem(storageKey)
    } catch {
      return null
    }
    if (raw === null) return null
    const value = validate(raw)
    if (value === null) remove(suffix)
    return value
  }

  function write(value: T, suffix?: string): boolean {
    const storageKey = resolve(suffix)
    const storage = getArea(area)
    if (storageKey === null || storage === null) return false
    try {
      const serialised = JSON.stringify(value)
      if (serialised === undefined) return false
      storage.setItem(storageKey, serialised)
      return true
    } catch {
      return false
    }
  }

  function subscribe(listener: (value: T | null, suffix: string | undefined) => void, suffix?: string): () => void {
    const watched = resolve(suffix)
    if (watched === null) return () => undefined
    return addSubscriber((event) => {
      const storage = getArea(area)
      // `key === null` means the whole area was cleared.
      if (storage === null || event.storageArea !== storage) return
      if (event.key !== null && event.key !== watched) return
      const value = event.newValue === null ? null : validate(event.newValue)
      listener(value, suffix)
    })
  }

  return { key, keyFor, read, write, remove, subscribe }
}
