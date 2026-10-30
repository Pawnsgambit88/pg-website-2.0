import { z } from 'zod'
import { pageSchema } from '@/lib/api/types/pagination'
import { countSchema, isoInstantSchema, plainText, uuidSchema, versionSchema } from '@/lib/api/types/primitives'

// Host-desk check-in (contract C04, C05, screen 48). Admin check-in is possible at any time (default): it does not depend on
// the player check-in window, and an undo is an explicit `state: 'not_checked_in'`. The check-in state is NOT a status patch
// on the registration; it is its own command.

export const adminCheckInQuerySchema = z.strictObject({
  q: z.string().trim().min(1).max(100).optional(),
  /** Desk filter: waiting, arrived, or first-timers still to welcome. */
  filter: z.enum(['all', 'arrived', 'not_arrived', 'first_timers_unwelcomed']).optional(),
  page: z.int().min(1).optional(),
  pageSize: z.int().min(1).max(100).optional(),
})
export type AdminCheckInQuery = z.infer<typeof adminCheckInQuerySchema>

export const deskRowSchema = z.object({
  registrationId: uuidSchema,
  name: plainText(80),
  firstTimer: z.boolean(),
  welcomed: z.boolean(),
  /** Host assigned to welcome a first-timer (inferred field). */
  assignee: plainText(80).nullable(),
  checkedInAt: isoInstantSchema.nullable(),
  /** `self` = the player used the Event Room, `desk` = an admin checked them in (manual check-in). */
  checkInSource: z.enum(['self', 'desk']).nullable(),
})
export type DeskRow = z.infer<typeof deskRowSchema>

/** `GET /admin/events/{id}/check-in` (C05). Counts are for the whole event, not the page. */
export const checkInDeskSchema = z.object({
  counts: z.object({ expected: countSchema, arrived: countSchema, firstTimersWaiting: countSchema }),
  rows: pageSchema(deskRowSchema),
  serverNow: isoInstantSchema,
  version: versionSchema,
})
export type CheckInDeskDto = z.infer<typeof checkInDeskSchema>

/** `POST /admin/events/{id}/check-in` (C04): manual check-in or undo. */
export const manualCheckInSchema = z.strictObject({
  registrationId: uuidSchema,
  state: z.enum(['checked_in', 'not_checked_in']),
})
export type ManualCheckInInput = z.infer<typeof manualCheckInSchema>

export const manualCheckInResultSchema = z.object({
  registrationId: uuidSchema,
  checkedInAt: isoInstantSchema.nullable(),
  counts: z.object({ arrived: countSchema, expected: countSchema }),
  serverNow: isoInstantSchema,
})
export type ManualCheckInResult = z.infer<typeof manualCheckInResultSchema>

/** `POST /admin/events/{id}/check-in/all`: checks in every confirmed player who has not arrived. No body. */
export const checkInAllResultSchema = z.object({
  checkedIn: countSchema,
  counts: z.object({ arrived: countSchema, expected: countSchema }),
  serverNow: isoInstantSchema,
})
export type CheckInAllResult = z.infer<typeof checkInAllResultSchema>
