// Tiny external store for "which forms on this page hold unsaved edits". Forms write to it from an effect when their own
// dirty flag flips; only the UnsavedChangesGuard subscribes, so typing re-renders no sibling section
// (RBP rerender-defer-reads). One store per page instance (created in a useState initialiser), never module state.

export interface DirtyStore {
  set: (key: string, dirty: boolean) => void
  isDirty: () => boolean
  subscribe: (listener: () => void) => () => void
}

export function createDirtyStore(): DirtyStore {
  const dirtyKeys = new Set<string>()
  const listeners = new Set<() => void>()
  const emit = () => {
    for (const listener of listeners) listener()
  }
  return {
    set: (key, dirty) => {
      if (dirty === dirtyKeys.has(key)) return
      if (dirty) dirtyKeys.add(key)
      else dirtyKeys.delete(key)
      emit()
    },
    isDirty: () => dirtyKeys.size > 0,
    subscribe: (listener) => {
      listeners.add(listener)
      return () => {
        listeners.delete(listener)
      }
    },
  }
}
