import { slugSchema, type Slug } from '@/lib/api/types/primitives'

/** Brands a literal as a Slug through the real schema, so a bad seed slug fails at first use. */
export function mockSlug(value: string): Slug {
  return slugSchema.parse(value)
}
