import { z } from 'zod'
import { capabilityFlagSchema } from '@/lib/api/types/admin/common'
import { userRoleSchema } from '@/lib/api/types/auth'
import { ratingPoolSchema } from '@/lib/api/types/identity'
import {
  countSchema,
  emailSchema,
  isoDateSchema,
  isoInstantSchema,
  plainText,
  slugSchema,
  uuidSchema,
  versionSchema,
} from '@/lib/api/types/primitives'
import { registrationStatusSchema } from '@/lib/api/types/registration'

// Admin players (contract G01 to G03, screen 54). The record shows only the PERMITTED private fields for the caller's
// role: a field the role may not see arrives as `null`, never as a placeholder. Sensitive operations (role change) need a
// step-up token (contract 2.4): the browser calls `player.auth.stepUp`, then sends the role change with that token.

export const adminPlayersQuerySchema = z.strictObject({
  /** Name, email or phone. */
  q: z.string().trim().min(1).max(100).optional(),
  page: z.int().min(1).optional(),
  pageSize: z.int().min(1).max(100).optional(),
})
export type AdminPlayersQuery = z.infer<typeof adminPlayersQuerySchema>

export const ACCOUNT_STATUSES = ['active', 'suspended'] as const
export const accountStatusSchema = z.enum(ACCOUNT_STATUSES)
export type AccountStatus = z.infer<typeof accountStatusSchema>

/** `GET /admin/players` row (G01). */
export const adminPlayerRowSchema = z.object({
  id: uuidSchema,
  name: plainText(80),
  email: emailSchema,
  city: plainText(80).nullable(),
  role: userRoleSchema,
  status: accountStatusSchema,
  eventsAttended: countSchema,
  joinedAt: isoInstantSchema,
})
export type AdminPlayerRowDto = z.infer<typeof adminPlayerRowSchema>

const historyRow = z.object({
  registrationId: uuidSchema,
  eventId: uuidSchema,
  eventSlug: slugSchema,
  eventTitle: plainText(120),
  startsAt: isoInstantSchema,
  status: registrationStatusSchema,
  attended: z.boolean(),
})
export type PlayerEventHistoryRow = z.infer<typeof historyRow>

const ratingContext = z.object({
  pool: ratingPoolSchema,
  rating: z.int().min(0).max(4000),
  games: countSchema,
  provisional: z.boolean(),
})

/**
 * Private fields a role may be allowed to see. Each is `null` when the caller's role does not permit it OR the player
 * has not provided it; `visibleFields` lists the keys the role may see so the UI can tell the two apart.
 */
export const PERMITTED_PRIVATE_FIELDS = ['phone', 'birthday', 'area', 'chessComHandle', 'fideId'] as const
export const permittedPrivateFieldSchema = z.enum(PERMITTED_PRIVATE_FIELDS)
export type PermittedPrivateField = z.infer<typeof permittedPrivateFieldSchema>

/** `GET /admin/players/{id}` (G02). */
export const adminPlayerSchema = adminPlayerRowSchema.extend({
  phone: z
    .string()
    .regex(/^\+?[0-9 ()-]{7,20}$/)
    .nullable(),
  birthday: isoDateSchema.nullable(),
  area: plainText(80).nullable(),
  chessComHandle: plainText(25).nullable(),
  fideId: plainText(12).nullable(),
  visibleFields: z.array(permittedPrivateFieldSchema).max(5),
  history: z.array(historyRow).max(100),
  ratings: z.array(ratingContext).max(3),
  /** Role change needs a step-up; the flag carries the reason when it is off (last admin, own account). */
  canChangeRole: capabilityFlagSchema,
  version: versionSchema,
})
export type AdminPlayerDto = z.infer<typeof adminPlayerSchema>

/**
 * `PUT /admin/players/{id}/role` (G03). IK required, step-up required. Strict: only the role travels. The server blocks
 * removing the last admin and self-promotion (inferred).
 */
export const changeRoleSchema = z.strictObject({ role: userRoleSchema })
export type ChangeRoleInput = z.infer<typeof changeRoleSchema>

export const changeRoleResultSchema = z.object({ id: uuidSchema, role: userRoleSchema, changedAt: isoInstantSchema })
export type ChangeRoleResult = z.infer<typeof changeRoleResultSchema>
