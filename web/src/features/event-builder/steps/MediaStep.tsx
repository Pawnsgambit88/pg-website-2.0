'use client'

import { FormField } from '@/components/ui/form/FormField'
import { Select } from '@/components/ui/form/Select'
import { Heading } from '@/components/ui/Heading'
import { useStepForm } from '@/features/event-builder/context'
import { CollectionField } from '@/features/event-builder/fields/CollectionField'
import type { BuilderStepProps } from '@/features/event-builder/types'
import type { MediaStep as MediaValues } from '@/lib/api/types/admin/event-builder'
import { MEDIA_MODES } from '@/lib/api/types/media'

// Builder step 6 (FE-28): the event's media collection (S12) and how it is shown. Zero images shows the placeholder,
// one image is static (rendering rules).

const MODE_LABELS: Readonly<Record<MediaValues['mode'], string>> = {
  static: 'Static (first image)',
  carousel: 'Carousel',
}
const MODE_OPTIONS = MEDIA_MODES.map((value) => ({ value, label: MODE_LABELS[value] }))

export function MediaStep({ dataKey }: BuilderStepProps) {
  const form = useStepForm<MediaValues>(dataKey ?? 'media')
  const { control } = form

  return (
    <div className="grid min-w-0 gap-6">
        <section aria-labelledby="media-collection" className="grid min-w-0 gap-4">
          <Heading level={2} size="card" id="media-collection">
            Images
          </Heading>
          <CollectionField control={control} />
          <FormField
            control={control}
            name="mode"
            label="Display"
            hint="A carousel needs two or more images; one image always shows static."
          >
            {(field, id) => (
              <Select
                id={id}
                ref={field.ref}
                name={field.name}
                value={field.value}
                onValueChange={field.onChange}
                onBlur={field.onBlur}
                options={MODE_OPTIONS}
              />
            )}
          </FormField>
        </section>
    </div>
  )
}
