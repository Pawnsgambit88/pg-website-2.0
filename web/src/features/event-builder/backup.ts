import type { PendingPatch } from '@/features/event-builder/types'
import { defineStore } from '@/lib/storage/versioned'

// Session backup of UNSENT edits (TASK-077 / AC-7): survives an accidental reload or crash. Event content only, never
// tokens or personal data. Key `pg:builder-draft:v1:<id>`; storage failures degrade to "no backup".

interface Backup {
  /** The server `version` the edits were made on; a different version means the draft moved on and the backup is stale. */
  version: number
  pending: PendingPatch
}

const store = defineStore<Backup>({
  area: 'session',
  name: 'builder-draft',
  version: 1,
  parse: (value) => {
    if (typeof value !== 'object' || value === null) return null
    const { version, pending } = value as Partial<Backup>
    return typeof version === 'number' && typeof pending === 'object' && pending !== null ? { version, pending } : null
  },
})

export function saveBackup(eventId: string, version: number, pending: PendingPatch | null): void {
  if (pending === null) store.remove(eventId)
  else store.write({ version, pending }, eventId)
}

export function loadBackup(eventId: string, version: number): PendingPatch | null {
  const backup = store.read(eventId)
  return backup !== null && backup.version === version ? backup.pending : null
}
