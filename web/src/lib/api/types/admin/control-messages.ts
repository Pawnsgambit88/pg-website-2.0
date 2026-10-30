import { z } from 'zod'
import { messageChannelSchema, messageTriggerSchema } from '@/lib/api/types/admin/event-builder'
import { adminActorSchema, writeVersionSchema } from '@/lib/api/types/admin/common'
import { countSchema, isoInstantSchema, plainText, uuidSchema } from '@/lib/api/types/primitives'

// Control room messages (contract C14, C15, screen 51; UI-STATES "message send partially failed"). Sending stores the
// message first and returns 202; the worker delivers. Delivery is reported PER RECIPIENT so a partial failure is visible and
// the UI never claims "sent" until the server says so. Email only at launch. Message bodies are plain text.

export const MESSAGE_AUDIENCES = ['confirmed', 'waitlist', 'checked_in', 'first_timers'] as const
export const messageAudienceSchema = z.enum(MESSAGE_AUDIENCES)
export type MessageAudience = z.infer<typeof messageAudienceSchema>

/** `POST /admin/events/{id}/messages` (C14), IK required. */
export const sendMessageSchema = z.strictObject({
  audience: messageAudienceSchema,
  channel: messageChannelSchema,
  subject: z.string().trim().min(1).max(150),
  body: z.string().trim().min(1).max(5000),
})
export type SendMessageInput = z.infer<typeof sendMessageSchema>

/** Delivery state per recipient. `queued` and `sent` precede `delivered`; `failed` carries a text reason. */
export const DELIVERY_STATES = ['queued', 'sent', 'delivered', 'failed'] as const
export const deliveryStateSchema = z.enum(DELIVERY_STATES)
export type DeliveryState = z.infer<typeof deliveryStateSchema>

export const recipientDeliverySchema = z.discriminatedUnion('state', [
  z.object({ registrationId: uuidSchema, name: plainText(80), state: z.literal('queued') }),
  z.object({ registrationId: uuidSchema, name: plainText(80), state: z.literal('sent'), at: isoInstantSchema }),
  z.object({ registrationId: uuidSchema, name: plainText(80), state: z.literal('delivered'), at: isoInstantSchema }),
  z.object({
    registrationId: uuidSchema,
    name: plainText(80),
    state: z.literal('failed'),
    reason: plainText(300),
    at: isoInstantSchema,
  }),
])
export type RecipientDelivery = z.infer<typeof recipientDeliverySchema>

/**
 * Message-level delivery rollup, derived by the server from the recipients. `partial_failure` means some recipients
 * failed and some succeeded; it is shown prominently with a retry affordance (retry is Later, no endpoint at launch).
 */
export const MESSAGE_DELIVERY_STATUSES = ['queued', 'sending', 'delivered', 'partial_failure', 'failed'] as const
export const messageDeliveryStatusSchema = z.enum(MESSAGE_DELIVERY_STATUSES)
export type MessageDeliveryStatus = z.infer<typeof messageDeliveryStatusSchema>

export const deliveryCountsSchema = z.object({
  recipients: countSchema,
  queued: countSchema,
  sent: countSchema,
  delivered: countSchema,
  failed: countSchema,
})
export type DeliveryCounts = z.infer<typeof deliveryCountsSchema>

export const messageLogEntrySchema = z.object({
  id: uuidSchema,
  audience: messageAudienceSchema,
  channel: messageChannelSchema,
  subject: plainText(150),
  /** Null for state-triggered messages (`trigger` set) that have no authored subject. */
  body: plainText(5000),
  trigger: messageTriggerSchema.nullable(),
  sentBy: adminActorSchema.nullable(),
  createdAt: isoInstantSchema,
  status: messageDeliveryStatusSchema,
  counts: deliveryCountsSchema,
})
export type MessageLogEntry = z.infer<typeof messageLogEntrySchema>

/** Channel health shown above the log (email only at launch). */
export const channelHealthSchema = z.object({ channel: messageChannelSchema, connected: z.boolean() })

/** `GET /admin/events/{id}/messages` (C14). */
export const messageLogSchema = z.object({
  messages: z.array(messageLogEntrySchema).max(100),
  channels: z.array(channelHealthSchema).max(4),
  serverNow: isoInstantSchema,
})
export type MessageLogDto = z.infer<typeof messageLogSchema>

/** `GET .../messages/{messageId}`: one message with per-recipient delivery state (bounded to 500, paged is Later). */
export const messageDetailSchema = messageLogEntrySchema.extend({
  recipients: z.array(recipientDeliverySchema).max(500),
})
export type MessageDetailDto = z.infer<typeof messageDetailSchema>

/** C14 POST response (202): stored, delivery pending. */
export const messageAcceptedSchema = z.object({
  id: uuidSchema,
  status: z.literal('queued'),
  recipients: countSchema,
  acceptedAt: isoInstantSchema,
})
export type MessageAccepted = z.infer<typeof messageAcceptedSchema>

// ---------- Communications toggles (C15) ----------

export const communicationsSettingsSchema = z.object({
  triggers: z.record(messageTriggerSchema, z.boolean()),
  channels: z.array(messageChannelSchema).min(1).max(1),
  version: z.int().min(0),
})
export type CommunicationsSettingsDto = z.infer<typeof communicationsSettingsSchema>

/** `PATCH /admin/events/{id}/communications`. Partial triggers. */
export const updateCommunicationsSchema = z.strictObject({
  version: writeVersionSchema,
  triggers: z.partialRecord(messageTriggerSchema, z.boolean()).optional(),
  channels: z.array(messageChannelSchema).min(1).max(1).optional(),
})
export type UpdateCommunicationsInput = z.infer<typeof updateCommunicationsSchema>
