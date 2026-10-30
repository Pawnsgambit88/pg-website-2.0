'use client'

import { useInfiniteQuery, useQuery } from '@tanstack/react-query'
import dynamic from 'next/dynamic'
import { useEffect, useState } from 'react'
import { useWatch, type Control } from 'react-hook-form'
import { Button } from '@/components/ui/Button'
import { ErrorState } from '@/components/ui/feedback/ErrorState'
import { Skeleton } from '@/components/ui/feedback/Skeleton'
import { SkeletonRegion } from '@/components/ui/feedback/SkeletonRegion'
import { FormField } from '@/components/ui/form/FormField'
import { Field } from '@/components/ui/form/Field'
import { Input } from '@/components/ui/form/Input'
import { Select } from '@/components/ui/form/Select'
import { CollectionThumbs } from '@/features/event-builder/fields/CollectionThumbs'
import { useApi } from '@/lib/api/adapters/useApi.browser'
import type { MediaStep as MediaValues } from '@/lib/api/types/admin/event-builder'
import { adminMediaCollectionQuery, adminMediaCollectionsPickerQuery } from '@/lib/query/query-options/admin'

// Collection picker over S12 with a search box, "Load more" paging and a lazy "new collection from library" panel
// (S09 + S12). Stand-in until the media library screens (FE-18/19) provide a shared picker.

const NewCollectionPanel = dynamic(
  () => import('@/features/event-builder/fields/NewCollectionPanel').then((module) => module.NewCollectionPanel),
  { loading: () => <Skeleton shape="block" /> },
)

const NONE = '__none'
const SEARCH_DEBOUNCE_MS = 350

function useDebounced<T>(value: T, ms: number): T {
  const [debounced, setDebounced] = useState(value)
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebounced(value)
    }, ms)
    return () => {
      clearTimeout(timer)
    }
  }, [value, ms])
  return debounced
}

export function CollectionField({ control }: { control: Control<MediaValues> }) {
  const api = useApi().admin
  // `mode` only seeds a newly created collection.
  const mode = useWatch({ control, name: 'mode' })
  const selectedId = useWatch({ control, name: 'collectionId' })
  const [search, setSearch] = useState('')
  const q = useDebounced(search.trim(), SEARCH_DEBOUNCE_MS)
  const query = useInfiniteQuery(adminMediaCollectionsPickerQuery(api, q))
  const [creating, setCreating] = useState(false)

  const rows = query.data?.pages.flatMap((page) => page.items)
  const chosen = rows?.find((row) => row.id === selectedId)
  // The saved choice may sit beyond the loaded pages or outside the search: read it directly.
  const lookup = useQuery({
    ...adminMediaCollectionQuery(api, selectedId ?? '1'),
    enabled: selectedId !== null && chosen === undefined,
  })
  const selected = chosen ?? (selectedId === null ? undefined : lookup.data)

  if (rows === undefined) {
    if (query.isPending) {
      return (
        <SkeletonRegion label="Loading media collections">
          <Skeleton shape="block" />
        </SkeletonRegion>
      )
    }
    return (
      <ErrorState
        error={query.error}
        action="load the media collections"
        headingLevel={3}
        onRetry={() => void query.refetch()}
        retrying={query.isFetching}
      />
    )
  }

  return (
    <div className="grid min-w-0 gap-3">
      <Field label="Search collections" hint="Type part of a name to narrow the list below." optionalLabel>
        <Input
          type="search"
          value={search}
          maxLength={100}
          onChange={(event) => {
            setSearch(event.target.value)
          }}
        />
      </Field>
      <FormField
        control={control}
        name="collectionId"
        label="Media collection"
        hint="Images shown on the event page. Leave empty to show a placeholder."
        optionalLabel
      >
        {(field, id) => {
          const known = rows.some((row) => row.id === field.value)
          const orphan = field.value !== null && !known ? field.value : null
          return (
            <div className="grid min-w-0 gap-3">
              <Select
                id={id}
                ref={field.ref}
                name={field.name}
                value={field.value ?? NONE}
                onValueChange={(value) => field.onChange(value === NONE ? null : value)}
                onBlur={field.onBlur}
                options={[
                  { value: NONE, label: 'No collection (placeholder)' },
                  ...rows.map((row) => ({ value: row.id, label: `${row.name} (${row.items.length})` })),
                  ...(orphan === null ? [] : [{ value: orphan, label: selected?.name ?? 'Selected collection' }]),
                ]}
              />
              {query.isFetching && q !== '' && rows.length === 0 ? (
                <p className="type-small text-muted">Searching</p>
              ) : null}
              {!query.isFetching && rows.length === 0 ? (
                <p className="type-small text-muted">{q === '' ? 'No collections yet.' : 'No collection matches.'}</p>
              ) : null}
              {query.hasNextPage ? (
                <div>
                  <Button
                    type="button"
                    variant="secondary"
                    loading={query.isFetchingNextPage}
                    loadingLabel="Loading more collections"
                    onClick={() => void query.fetchNextPage()}
                  >
                    Load more collections
                  </Button>
                </div>
              ) : null}
              {selected ? <CollectionThumbs collection={selected} /> : null}
              {creating ? (
                <NewCollectionPanel
                  mode={mode}
                  onCancel={() => {
                    setCreating(false)
                  }}
                  onCreated={(collection) => {
                    setCreating(false)
                    field.onChange(collection.id)
                  }}
                />
              ) : (
                <div>
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={() => {
                      setCreating(true)
                    }}
                  >
                    New collection from library
                  </Button>
                </div>
              )}
            </div>
          )
        }}
      </FormField>
    </div>
  )
}
