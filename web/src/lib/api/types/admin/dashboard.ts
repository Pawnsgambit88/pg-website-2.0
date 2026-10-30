import { z } from 'zod'
import { eventStatusSchema } from '@/lib/api/types/event-state'
import {
  countSchema,
  currencySchema,
  isoInstantSchema,
  paiseSchema,
  plainText,
  slugSchema,
  uuidSchema,
} from '@/lib/api/types/primitives'

// Admin dashboard (contract D01, screen 32): operational status and actionable alerts, not vanity analytics.
// Empty state when there is no upcoming event is explicit (`event: null`).

/** Attention kinds named by the contract: unreconciled payments, media without alt, testimonial missing consent, capacity warning. */
export const ATTENTION_KINDS = [
  'unreconciled_payment',
  'media_missing_alt',
  'testimonial_missing_consent',
  'capacity_warning',
] as const
export const attentionKindSchema = z.enum(ATTENTION_KINDS)
export type AttentionKind = z.infer<typeof attentionKindSchema>

/** Admin routes an attention item may deep-link to (same-site path only, never a backend-supplied URL, F-16). */
const adminPath = z
  .string()
  .regex(/^\/admin(?:\/[a-z0-9-]+)*(?:\?[A-Za-z0-9=&_-]*)?$/)
  .max(200)

export const attentionItemSchema = z.object({
  kind: attentionKindSchema,
  message: plainText(200),
  count: countSchema,
  href: adminPath,
})
export type AttentionItem = z.infer<typeof attentionItemSchema>

const nextEventSchema = z.object({
  id: uuidSchema,
  slug: slugSchema,
  title: plainText(120),
  status: eventStatusSchema,
  startsAt: isoInstantSchema,
  confirmed: countSchema,
  capacity: z.int().min(0).max(100000).nullable(),
  firstTimers: countSchema,
})

const healthState = z.enum(['ok', 'degraded', 'down'])

export const dashboardSummarySchema = z.object({
  /** The next or today's event; null shows the "no upcoming event" empty state. */
  event: nextEventSchema.nullable(),
  pendingPayments: z.object({
    count: countSchema,
    amountPaise: paiseSchema,
    currency: currencySchema,
  }),
  /** Website health: last publish and whether revalidation callouts are being delivered. */
  websiteHealth: z.object({
    state: healthState,
    lastPublishedAt: isoInstantSchema.nullable(),
    pendingRevalidations: countSchema,
  }),
  attention: z.array(attentionItemSchema).max(20),
  serverNow: isoInstantSchema,
})
export type DashboardSummaryDto = z.infer<typeof dashboardSummarySchema>
