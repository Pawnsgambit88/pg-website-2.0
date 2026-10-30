import { z } from 'zod'
import { writeVersionSchema } from '@/lib/api/types/admin/common'
import { eventTypeSchema, pairingModeSchema } from '@/lib/api/types/event-state'
import { currencySchema, isoInstantSchema, plainText, safeHrefSchema, versionSchema } from '@/lib/api/types/primitives'

// Admin settings (contract G07, G08, screen 56; SCREEN-INVENTORY "Settings": secrets never returned to or read from the UI).
// GUARANTEE: this file declares NON-SECRET settings only. Three layers keep it that way:
//   1. Every group is a closed `strictObject`, so a response or patch with an extra key fails to parse.
//   2. `hasSecretLookingKey` rejects any key (at any depth) that looks like a credential, on both response and patch.
//   3. A TYPE-LEVEL check (`SettingsHasNoSecrets`) fails `tsc` if any key of `SettingsDto` or `SettingsPatch` ever matches
//      the secret fragments, so adding such a field cannot compile.
// Integration health is reported as `connected` flags only. The Razorpay key secret, webhook secret, Google client secret
// and email provider credentials live in backend secrets and never appear in any DTO.

const SECRET_FRAGMENT = /secret|passw(?:or)?d|token|api[-_]?key|private[-_]?key|credential|signing|webhook/i

/** True when any object key, at any depth, looks like a credential. Used as a runtime guard by schemas, adapters and mocks. */
export function hasSecretLookingKey(value: unknown): boolean {
  if (Array.isArray(value)) return value.some(hasSecretLookingKey)
  if (value !== null && typeof value === 'object') {
    return Object.entries(value).some(([key, inner]) => SECRET_FRAGMENT.test(key) || hasSecretLookingKey(inner))
  }
  return false
}

const noSecretKeys = (value: unknown) => !hasSecretLookingKey(value)
const NO_SECRET_MESSAGE = 'Settings never carry secret-looking keys'

// ---------- Groups ----------

const social = z.object({ label: plainText(40), href: safeHrefSchema })

export const brandSettingsSchema = z.strictObject({
  siteName: plainText(60),
  supportEmail: z.email().max(254),
  /** WhatsApp or phone link for the event desk; null when not configured. */
  deskContactHref: safeHrefSchema.nullable(),
  defaultCity: plainText(80),
  social: z.array(social).max(8),
})

export const authSettingsSchema = z.strictObject({
  googleSignInEnabled: z.boolean(),
  signupOpen: z.boolean(),
  /** Admin refresh lifetime in hours (contract 2.4: 12 hours or less under the waiver). */
  adminSessionHours: z.int().min(1).max(12),
})

export const ratingSettingsSchema = z.strictObject({
  ratingsEnabled: z.boolean(),
  provisionalGames: z.int().min(0).max(100),
  showRatingsByDefault: z.boolean(),
})

export const paymentSettingsSchema = z.strictObject({
  currency: currencySchema,
  holdMinutes: z.int().min(1).max(60),
  defaultRefundWindowHours: z
    .int()
    .min(0)
    .max(24 * 60)
    .nullable(),
})

export const notificationSettingsSchema = z.strictObject({
  emailEnabled: z.boolean(),
  senderName: plainText(60),
  /** Where contact-form submissions are delivered (FEAT-001 OQ-10). */
  contactDestinationEmail: z.email().max(254),
  reminderHoursBefore: z.int().min(1).max(168),
})

export const eventDefaultSettingsSchema = z.strictObject({
  type: eventTypeSchema,
  pairingMode: pairingModeSchema,
  capacity: z.int().min(1).max(100000),
  waitlistEnabled: z.boolean(),
  timeControl: plainText(60),
})

export const SETTINGS_GROUPS = ['brand', 'auth', 'ratings', 'payments', 'notifications', 'eventDefaults'] as const
export const settingsGroupSchema = z.enum(SETTINGS_GROUPS)
export type SettingsGroup = z.infer<typeof settingsGroupSchema>

/** Connected flag per integration. A boolean, never a credential or a masked value. */
export const integrationHealthSchema = z.strictObject({
  google: z.boolean(),
  razorpay: z.boolean(),
  email: z.boolean(),
  whatsapp: z.boolean(),
})
export type IntegrationHealth = z.infer<typeof integrationHealthSchema>

/** `GET /admin/settings` (G07). Bounded. */
export const settingsSchema = z
  .strictObject({
    brand: brandSettingsSchema,
    auth: authSettingsSchema,
    ratings: ratingSettingsSchema,
    payments: paymentSettingsSchema,
    notifications: notificationSettingsSchema,
    eventDefaults: eventDefaultSettingsSchema,
    integrations: integrationHealthSchema,
    version: versionSchema,
    updatedAt: isoInstantSchema,
  })
  .refine(noSecretKeys, NO_SECRET_MESSAGE)
export type SettingsDto = z.infer<typeof settingsSchema>

/** `PATCH /admin/settings` (G08): partial groups, partial fields, with `version`. Keys outside the allow-list are rejected. */
export const settingsPatchSchema = z
  .strictObject({
    version: writeVersionSchema,
    brand: brandSettingsSchema.partial().optional(),
    auth: authSettingsSchema.partial().optional(),
    ratings: ratingSettingsSchema.partial().optional(),
    payments: paymentSettingsSchema.omit({ currency: true }).partial().optional(),
    notifications: notificationSettingsSchema.partial().optional(),
    eventDefaults: eventDefaultSettingsSchema.partial().optional(),
  })
  .refine(noSecretKeys, NO_SECRET_MESSAGE)
export type SettingsPatch = z.infer<typeof settingsPatchSchema>

// ---------- Type-level guarantee ----------

type DeepKeys<T> = T extends readonly (infer U)[]
  ? DeepKeys<U>
  : T extends object
    ? { [K in keyof T & string]: K | DeepKeys<T[K]> }[keyof T & string]
    : never

type SecretFragment =
  | 'secret'
  | 'password'
  | 'passwd'
  | 'token'
  | 'apikey'
  | 'api_key'
  | 'api-key'
  | 'privatekey'
  | 'private_key'
  | 'credential'
  | 'signing'
  | 'webhook'

/** Union of the settings key names that look like a credential. Must be `never`. */
export type SecretLikeSettingsKeys = Extract<
  Lowercase<DeepKeys<SettingsDto> | DeepKeys<SettingsPatch>>,
  `${string}${SecretFragment}${string}`
>
/** `true` while no secret-looking key exists; a union member that matches turns it into `never` and breaks the build below. */
export type SettingsHasNoSecrets = [SecretLikeSettingsKeys] extends [never] ? true : never
export const settingsHaveNoSecrets: SettingsHasNoSecrets = true
