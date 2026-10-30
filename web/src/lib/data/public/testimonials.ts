import 'server-only'
import { cache } from 'react'
import { getPublicApi } from '@/lib/api/adapters/getPublicApi.server'
import type { TestimonialDto } from '@/lib/api/types/testimonial'
import { PUBLIC_REVALIDATE_SECONDS } from '@/lib/data/public/cache-policy'
import { tagsFor } from '@/lib/data/public/tags'

// P08 published testimonials (bounded list, at most 24 by schema). Tag `testimonials` (ARCH-001 9.3). Throws on failure.

export const getTestimonials = cache(
  (): Promise<TestimonialDto[]> =>
    getPublicApi().getTestimonials({ tags: tagsFor.testimonials(), revalidate: PUBLIC_REVALIDATE_SECONDS }),
)
