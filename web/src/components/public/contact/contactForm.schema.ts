import { z } from 'zod'
import { CONTACT_TOPICS, type ContactTopic } from '@/lib/api/types/contact'

// Client-side rules for the contact form (TASK-048). Same limits as the contract schema (lib/api/types/contact.ts,
// P11) with plain-English messages next to each field. The server re-validates; its VALIDATION_FAILED field messages
// are mapped back onto these names.

export const contactFormSchema = z.object({
  name: z.string().trim().min(1, 'Enter your name').max(80, 'Keep your name to 80 characters or fewer'),
  email: z
    .string()
    .trim()
    .min(1, 'Enter your email address')
    .max(254, 'That email address is too long')
    .pipe(z.email('Enter an email address like name@example.com')),
  topic: z.enum(CONTACT_TOPICS, { error: 'Choose what your message is about' }),
  message: z
    .string()
    .trim()
    .min(1, 'Write your message')
    .max(2000, 'Keep your message to 2,000 characters or fewer'),
  /** Honeypot: hidden from people and assistive tech; a person leaves it empty. Sent verbatim (contract P11). */
  website: z.string().max(200).optional(),
})

export type ContactFormInput = z.input<typeof contactFormSchema>
export type ContactFormValues = z.output<typeof contactFormSchema>

export const CONTACT_FIELDS = ['name', 'email', 'topic', 'message'] as const

export const FIELD_LABEL: Readonly<Record<(typeof CONTACT_FIELDS)[number], string>> = {
  name: 'Name',
  email: 'Email',
  topic: 'What is this about?',
  message: 'Message',
}

export const TOPIC_LABEL: Readonly<Record<ContactTopic, string>> = {
  joining_event: 'Joining an event',
  partnership: 'Partnership',
  payment: 'Payment',
  other: 'Something else',
}

export const MESSAGE_MAX = 2000
