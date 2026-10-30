'use client'

import { useQuery } from '@tanstack/react-query'
import { useState } from 'react'
import { Button } from '@/components/ui/Button'
import { ErrorState } from '@/components/ui/feedback/ErrorState'
import { QueryView } from '@/components/ui/feedback/QueryView'
import { Skeleton } from '@/components/ui/feedback/Skeleton'
import { ChoiceCard } from '@/components/ui/form/ChoiceCard'
import { Field } from '@/components/ui/form/Field'
import { Input } from '@/components/ui/form/Input'
import { ResponsiveImage } from '@/components/ui/media/ResponsiveImage'
import { useApi } from '@/lib/api/adapters/useApi.browser'
import { MAX_COLLECTION_ITEMS, createMediaCollectionSchema } from '@/lib/api/types/admin/media'
import type { MediaCollectionAdminDto } from '@/lib/api/types/admin/media'
import type { MEDIA_MODES } from '@/lib/api/types/media'
import { qk } from '@/lib/query/keys'
import { useApiMutation } from '@/lib/query/mutation'
import { adminMediaAssetsQuery } from '@/lib/query/query-options/admin'

// Minimal lazy collection creator for the Media step (FE-28). Lists library assets (S09), lets the editor tick images
// in order and creates the collection (S12). The full media library (FE-18/19) supersedes it for upload and curation.

const AUTOPLAY_INTERVAL_MS = 5000
const ASSETS_QUERY = { pageSize: 50 } as const

interface NewCollectionPanelProps {
  mode: (typeof MEDIA_MODES)[number]
  onCreated: (collection: MediaCollectionAdminDto) => void
  onCancel: () => void
}

export function NewCollectionPanel({ mode, onCreated, onCancel }: NewCollectionPanelProps) {
  const api = useApi().admin
  const assets = useQuery(adminMediaAssetsQuery(api, ASSETS_QUERY))
  const [name, setName] = useState('')
  const [selected, setSelected] = useState<readonly string[]>([])
  const [nameError, setNameError] = useState<string | undefined>()

  const create = useApiMutation({
    mutationFn: (input: { name: string; assetIds: readonly string[] }) =>
      api.media.createCollection(
        createMediaCollectionSchema.parse({
          name: input.name,
          mode,
          autoplay: false,
          intervalMs: AUTOPLAY_INTERVAL_MS,
          items: input.assetIds.map((assetId) => ({ assetId })),
        }),
      ),
    invalidates: () => [qk.admin.mediaCollections()],
    idempotent: false,
    onSuccess: (collection) => {
      onCreated(collection)
    },
  })

  const toggle = (id: string, on: boolean): void => {
    setSelected((current) => {
      if (!on) return current.filter((value) => value !== id)
      if (current.includes(id) || current.length >= MAX_COLLECTION_ITEMS) return current
      return [...current, id]
    })
  }

  const submit = (): void => {
    if (name.trim() === '') {
      setNameError('Name the collection.')
      return
    }
    setNameError(undefined)
    create.mutate({ name: name.trim(), assetIds: selected })
  }

  return (
    <div className="grid min-w-0 gap-4 rounded-public border border-muted p-4">
      {create.isError ? (
        <ErrorState
          error={create.error}
          action="create the collection"
          variant="inline"
          onRetry={submit}
          retrying={create.isPending}
        />
      ) : null}
      <Field label="Collection name" required error={nameError}>
        <Input
          value={name}
          maxLength={120}
          onChange={(event) => {
            setName(event.target.value)
          }}
        />
      </Field>
      <Field
        group
        label="Images"
        hint={`Tick images in the order they should show (${selected.length} of ${MAX_COLLECTION_ITEMS}). Upload new images in the media library.`}
      >
        <QueryView
          query={assets}
          loadingLabel="Loading media library"
          skeleton={<Skeleton shape="block" />}
          errorAction="load the media library"
        >
          {(page) =>
            page.items.length === 0 ? (
              <p className="type-small text-muted">The media library is empty. Upload images first.</p>
            ) : (
              <div className="grid min-w-0 gap-3 sm:grid-cols-2">
                {page.items.map((asset) => (
                  <ChoiceCard
                    key={asset.id}
                    type="checkbox"
                    checked={selected.includes(asset.id)}
                    onCheckedChange={(on) => {
                      toggle(asset.id, on)
                    }}
                    label={asset.alt ?? (asset.decorative ? 'Decorative image' : 'No alt text yet')}
                    description={
                      <span className="block w-24">
                        <ResponsiveImage
                          src={asset.src}
                          width={asset.width}
                          height={asset.height}
                          focal={asset.focal}
                          decorative
                          alt=""
                          ratio="1:1"
                          sizes="96px"
                        />
                      </span>
                    }
                  />
                ))}
              </div>
            )
          }
        </QueryView>
      </Field>
      <div className="flex flex-wrap gap-3">
        <Button type="button" onClick={submit} loading={create.isPending} loadingLabel="Creating collection">
          Create collection
        </Button>
        <Button type="button" variant="secondary" onClick={onCancel}>
          Cancel
        </Button>
      </div>
    </div>
  )
}
