import { z } from 'zod'
import { emailSchema, inputText } from '@/lib/api/types/primitives'

// Contact message (contract P11, F-CON-001). Reference topics: "Joining an event", "Partnership", "Payment".

export const CONTACT_TOPICS = ['joining_event', 'partnership', 'payment', 'other'] as const
export const contactTopicSchema = z.enum(CONTACT_TOPICS)
export type ContactTopic = z.infer<typeof contactTopicSchema>

export const contactInputSchema = z.object({
  name: inputText(80),
  email: emailSchema,
  topic: contactTopicSchema,
  message: inputText(2000),
  /**
   * Honeypot (inferred spam control, contract P11). Rendered hidden; a human leaves it empty. The browser client sends
   * it verbatim and the backend discards the message silently when it is not empty.
   */
  website: z.string().max(200).optional(),
})
export type ContactInput = z.infer<typeof contactInputSchema>
