'use client'

import { useMutation, useQueryClient, type QueryClient } from '@tanstack/react-query'
import { useCallback, useEffect, useMemo, useRef } from 'react'
import { ApiError, isApiError } from '@/lib/api/errors'
import { newIdempotencyKey } from '@/lib/api/idempotency'
import type { IdempotencyKey } from '@/lib/api/types/primitives'
import type { AppQueryKey } from '@/lib/query/keys'

// useApiMutation: the one way client code writes to the API (ARCH-001 11.8, 11.9).
//
// Rules this helper enforces
//   1. `invalidates` is REQUIRED by type and returns the explicit, smallest set of keys that the write made stale. It runs
//      only after the server answered successfully, and the mutation stays `pending` until those refetches settle, so
//      the UI never shows fresh-looking success next to stale data.
//   2. No optimistic UI by default. A write that is allowed to be optimistic (a reversible toggle) passes `optimistic`,
//      which MUST supply the keys it touches; the helper snapshots them and restores the snapshot on error. Never use it
//      for results, payments, registration, publish or finalise.
//   3. Idempotency: the key is created when the intent starts (the first `mutate` after a fresh hook, a success or a
//      `reset()`), handed to `mutationFn`, and REUSED when the user retries the same intent after an error. If the retry
//      carries different variables the intent is different, so a new key is made (the server would answer
//      IDEMPOTENCY_CONFLICT for the same key with another body). Pass `idempotent: false` for calls with no key.
//   4. Never retries by itself (client defaults: mutations `retry: false`). A retry is the user's tap.
//   5. `error` is always an `ApiError` (an unexpected non-API failure is wrapped as BAD_RESPONSE, status 0). Show it with
//      `copyFor(error, { action })`; keep the user's input.

export interface MutationContext {
  /** Same value for every attempt of one intent. `null` when `idempotent: false`. */
  idempotencyKey: IdempotencyKey | null
}

export interface OptimisticUpdate<TVars> {
  /** Every key (prefix) that `apply` writes. Snapshotted before, restored on error, refetched after. */
  keys: readonly AppQueryKey[]
  /** Write the expected result with `queryClient.setQueryData`. Must be reversible by restoring the snapshot. */
  apply: (vars: TVars, queryClient: QueryClient) => void
}

export interface ApiMutationOptions<TData, TVars> {
  mutationFn: (vars: TVars, context: MutationContext) => Promise<TData>
  /** Keys made stale by this write. Required: pass `() => []` only when the write truly changes no cached read. */
  invalidates: (vars: TVars, data: TData) => readonly AppQueryKey[]
  /** Runs after the server succeeded AND the invalidated queries settled. */
  onSuccess?: (data: TData, vars: TVars) => void | Promise<void>
  onError?: (error: ApiError, vars: TVars) => void
  /** Default true: create and reuse an `Idempotency-Key`. Set false for calls whose key is optional and unwanted. */
  idempotent?: boolean
  /** Opt-in optimistic update with automatic rollback. See rule 2. */
  optimistic?: OptimisticUpdate<TVars>
}

export interface ApiMutation<TData, TVars> {
  mutate: (vars: TVars) => void
  mutateAsync: (vars: TVars) => Promise<TData>
  /** Clears state AND ends the intent: the next `mutate` gets a new idempotency key. */
  reset: () => void
  isIdle: boolean
  isPending: boolean
  isError: boolean
  isSuccess: boolean
  data: TData | undefined
  error: ApiError | null
}

type Snapshot = [readonly unknown[], unknown][]

function sameVars(a: unknown, b: unknown): boolean {
  if (Object.is(a, b)) return true
  try {
    return JSON.stringify(a) === JSON.stringify(b)
  } catch {
    return false
  }
}

function toApiError(error: unknown): ApiError | null {
  if (error === null || error === undefined) return null
  return isApiError(error) ? error : new ApiError('BAD_RESPONSE', { status: 0 })
}

export function useApiMutation<TData, TVars = void>(
  options: ApiMutationOptions<TData, TVars>,
): ApiMutation<TData, TVars> {
  const queryClient = useQueryClient()
  const intent = useRef<{ key: IdempotencyKey; vars: unknown } | null>(null)
  const optionsRef = useRef(options)
  useEffect(() => {
    optionsRef.current = options // latest closures without re-creating the mutation (rerender-defer-reads)
  })

  const mutation = useMutation<TData, Error, TVars, Snapshot>({
    retry: false,
    mutationFn: (vars) => {
      const { idempotent = true, mutationFn } = optionsRef.current
      if (!idempotent) return mutationFn(vars, { idempotencyKey: null })
      if (intent.current === null || !sameVars(intent.current.vars, vars)) {
        intent.current = { key: newIdempotencyKey(), vars }
      }
      return mutationFn(vars, { idempotencyKey: intent.current.key })
    },
    onMutate: async (vars) => {
      const optimistic = optionsRef.current.optimistic
      if (optimistic === undefined) return []
      const snapshot: Snapshot = []
      for (const queryKey of optimistic.keys) {
        await queryClient.cancelQueries({ queryKey })
        snapshot.push(
          ...queryClient
            .getQueriesData({ queryKey })
            .map(([key, value]): [readonly unknown[], unknown] => [key, value]),
        )
      }
      optimistic.apply(vars, queryClient)
      return snapshot
    },
    onSuccess: async (data, vars) => {
      intent.current = null // the intent is done: the next submit is a new one
      const keys = optionsRef.current.invalidates(vars, data)
      await Promise.all(keys.map((queryKey) => queryClient.invalidateQueries({ queryKey })))
      await optionsRef.current.onSuccess?.(data, vars)
    },
    onError: async (error, vars, snapshot) => {
      // Roll back only what an optimistic update wrote, then refetch the truth. The idempotency key is kept for the retry.
      const optimistic = optionsRef.current.optimistic
      if (optimistic !== undefined && snapshot !== undefined) {
        for (const [queryKey, value] of snapshot) queryClient.setQueryData(queryKey, value)
        await Promise.all(optimistic.keys.map((queryKey) => queryClient.invalidateQueries({ queryKey })))
      }
      const apiError = toApiError(error)
      if (apiError !== null) optionsRef.current.onError?.(apiError, vars)
    },
  })

  const { mutate: rawMutate, mutateAsync: rawMutateAsync, reset: rawReset } = mutation
  const mutate = useCallback(
    (vars: TVars) => {
      rawMutate(vars)
    },
    [rawMutate],
  )
  const reset = useCallback(() => {
    intent.current = null
    rawReset()
  }, [rawReset])
  const error = useMemo(() => toApiError(mutation.error), [mutation.error])

  return {
    mutate,
    mutateAsync: rawMutateAsync,
    reset,
    isIdle: mutation.isIdle,
    isPending: mutation.isPending,
    isError: mutation.isError,
    isSuccess: mutation.isSuccess,
    data: mutation.data,
    error,
  }
}
