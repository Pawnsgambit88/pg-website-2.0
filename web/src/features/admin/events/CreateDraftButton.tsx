'use client'

import type { Route } from 'next'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/Button'
import { useApi } from '@/lib/api/adapters/useApi.browser'
import { qk } from '@/lib/query/keys'
import { useApiMutation } from '@/lib/query/mutation'

interface CreateDraftButtonProps {
  size?: 'sm' | 'md' | 'lg'
  children?: React.ReactNode
}

/**
 * Creates a blank draft immediately (title "New event", type "social") and redirects to the builder.
 * Replaces the /admin/events/new intermediate page (E02).
 */
export function CreateDraftButton({ size, children = 'New event' }: CreateDraftButtonProps) {
  const api = useApi().admin
  const router = useRouter()

  const create = useApiMutation({
    mutationFn: (_: void, { idempotencyKey }) =>
      api.events.createDraft(
        { title: 'New event', type: 'social' },
        idempotencyKey === null ? undefined : { idempotencyKey },
      ),
    invalidates: () => [qk.admin.events()],
    onSuccess: (draft) => {
      router.push(`/admin/events/${encodeURIComponent(draft.id)}/edit` as Route)
    },
  })

  return (
    <Button
      size={size}
      loading={create.isPending || create.isSuccess}
      loadingLabel="Creating draft"
      onClick={() => create.mutate()}
    >
      {children}
    </Button>
  )
}
