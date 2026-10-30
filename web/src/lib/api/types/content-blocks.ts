import { z } from 'zod'
import { mediaRefSchema } from '@/lib/api/types/media'
import { linkHrefSchema } from '@/lib/api/types/primitives'

// Closed block model for story bodies and legal pages (FEAT-001 OQ-01, ARCH-001 17.1, contract P07/P09).
// Plain text only, no HTML, no inline markup. A new block type is a contract change, never a free-form field.

export const BLOCK_TYPES = ['heading', 'paragraph', 'quote', 'image', 'list', 'link'] as const

const text = (max: number) => z.string().trim().min(1).max(max)

export const headingBlockSchema = z.object({
  type: z.literal('heading'),
  level: z.union([z.literal(2), z.literal(3)]),
  text: text(200),
})
export const paragraphBlockSchema = z.object({ type: z.literal('paragraph'), text: text(4000) })
export const quoteBlockSchema = z.object({
  type: z.literal('quote'),
  text: text(1000),
  attribution: text(120).optional(),
})
export const imageBlockSchema = z.object({
  type: z.literal('image'),
  media: mediaRefSchema,
  caption: text(300).optional(),
})
export const listBlockSchema = z.object({
  type: z.literal('list'),
  ordered: z.boolean(),
  items: z.array(text(500)).min(1).max(50),
})
export const linkBlockSchema = z.object({
  type: z.literal('link'),
  label: text(120),
  href: linkHrefSchema,
})

export const contentBlockSchema = z.discriminatedUnion('type', [
  headingBlockSchema,
  paragraphBlockSchema,
  quoteBlockSchema,
  imageBlockSchema,
  listBlockSchema,
  linkBlockSchema,
])
export type ContentBlock = z.infer<typeof contentBlockSchema>
export type ContentBlockType = ContentBlock['type']

export const contentBlocksSchema = z.array(contentBlockSchema).max(200)
