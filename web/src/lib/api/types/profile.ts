import { z } from 'zod'
import { emailSchema, inputText, isoDateSchema } from '@/lib/api/types/primitives'

// Player profile (contract M13 to M15; FEAT-000 OQ-26). PRIVATE account data and PUBLIC chess identity are separate
// resources with separate update calls, so a visibility toggle can never leak a private field. Email, phone and
// birthday cannot be made public: there is no toggle for them and the server rejects one (M15).

const phone = z
  .string()
  .trim()
  .regex(/^\+?[0-9 ()-]{7,20}$/)
const chessComHandle = z
  .string()
  .trim()
  .regex(/^[A-Za-z0-9_-]{3,25}$/)
const fideId = z
  .string()
  .trim()
  .regex(/^[0-9]{3,12}$/)

/** Private fields the registration flow may ask for (`requiredProfileFields`). */
export const PROFILE_FIELDS = ['name', 'city', 'area', 'phone', 'birthday', 'chessComHandle', 'fideId'] as const
export const profileFieldSchema = z.enum(PROFILE_FIELDS)
export type ProfileField = z.infer<typeof profileFieldSchema>

/** Visibility toggles (M15). Defaults are private-by-default except where the screen shows On (name, ratings, city). */
export const publicIdentityFlagsSchema = z.object({
  showDisplayName: z.boolean(),
  showRatings: z.boolean(),
  showChessComHandle: z.boolean(),
  showCityChapter: z.boolean(),
})
export type PublicIdentityFlags = z.infer<typeof publicIdentityFlagsSchema>

/** `GET /me/profile` (M13, `no-store`). Self only. Email is read-only. */
export const profileSchema = z.object({
  name: z.string().trim().min(1).max(80),
  email: emailSchema,
  city: z.string().trim().min(1).max(80).nullable(),
  area: z.string().trim().min(1).max(80).nullable(),
  phone: phone.nullable(),
  birthday: isoDateSchema.nullable(),
  chessComHandle: chessComHandle.nullable(),
  fideId: fideId.nullable(),
  publicIdentity: publicIdentityFlagsSchema,
})
export type ProfileDto = z.infer<typeof profileSchema>

/**
 * `PATCH /me/profile` (M14): allow-listed private fields only. Role, email and ratings are not accepted: the schema is
 * strict, so a stray key fails validation instead of travelling to the server.
 */
export const profileUpdateSchema = z
  .strictObject({
    name: inputText(80),
    city: inputText(80),
    area: inputText(80),
    phone,
    birthday: isoDateSchema,
    chessComHandle,
    fideId,
  })
  .partial()
export type ProfileUpdate = z.infer<typeof profileUpdateSchema>

/** `PATCH /me/public-identity` (M15). Strict: no key for email, phone or birthday exists. */
export const publicIdentityUpdateSchema = publicIdentityFlagsSchema.partial().strict()
export type PublicIdentityUpdate = z.infer<typeof publicIdentityUpdateSchema>
