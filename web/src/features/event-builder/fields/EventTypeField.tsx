'use client'

import { useQuery } from '@tanstack/react-query'
import type { Control } from 'react-hook-form'
import { QueryView } from '@/components/ui/feedback/QueryView'
import { Skeleton } from '@/components/ui/feedback/Skeleton'
import { FormField } from '@/components/ui/form/FormField'
import { Select } from '@/components/ui/form/Select'
import { useApi } from '@/lib/api/adapters/useApi.browser'
import type { BasicsStep } from '@/lib/api/types/admin/event-builder'
import { adminEventTypesQuery } from '@/lib/query/query-options/admin'

/** Event type select fed by E06, with a note when the type has no game engine yet. */
export function EventTypeField({ control }: { control: Control<BasicsStep> }) {
  const api = useApi()
  const query = useQuery(adminEventTypesQuery(api.admin))
  return (
    <QueryView
      query={query}
      loadingLabel="Loading event types"
      skeleton={<Skeleton shape="block" />}
      errorAction="load the event types"
    >
      {(types) => (
        <FormField control={control} name="type" label="Event type" required>
          {(field, id) => {
            const selected = types.find((row) => row.type === field.value)
            return (
              <>
                <Select
                  id={id}
                  ref={field.ref}
                  name={field.name}
                  value={field.value}
                  onValueChange={field.onChange}
                  onBlur={field.onBlur}
                  options={types.map((row) => ({ value: row.type, label: row.label }))}
                />
                {selected && !selected.engineAvailable ? (
                  <p className="type-small mt-2 text-muted">
                    The game engine for this type is not available yet. You can still schedule and promote it.
                  </p>
                ) : null}
              </>
            )
          }}
        </FormField>
      )}
    </QueryView>
  )
}
