import { z } from 'zod'
import type { ProfileDto, ProfileUpdate } from '@/lib/api/types/profile'

// Pure pieces of the Profile screen (TASK-068, screen 31). The private form edits strings; the wire schema
// (`profileUpdateSchema`, strict) is applied by the API layer, so this schema only gives early, friendly feedback with
// the same patterns. Defined once at module scope.

export const PRIVATE_FIELDS = ['name', 'city', 'area', 'phone', 'birthday', 'chessComHandle', 'fideId'] as const
export type PrivateField = (typeof PRIVATE_FIELDS)[number]

export const PRIVATE_FIELD_LABELS: Readonly<Record<PrivateField, string>> = {
  name: 'Display name',
  city: 'City',
  area: 'Area',
  phone: 'Phone',
  birthday: 'Birthday',
  chessComHandle: 'Chess.com handle',
  fideId: 'FIDE ID',
}

const optional = (pattern: RegExp, message: string) =>
  z
    .string()
    .trim()
    .refine((value) => value === '' || pattern.test(value), message)

export const privateFormSchema = z.object({
  name: z.string().trim().min(1, 'Enter your name.').max(80, 'Use 80 characters or fewer.'),
  city: z.string().trim().max(80, 'Use 80 characters or fewer.'),
  area: z.string().trim().max(80, 'Use 80 characters or fewer.'),
  phone: optional(/^\+?[0-9 ()-]{7,20}$/, 'Enter a phone number with 7 to 20 digits, for example +91 98765 43210.'),
  birthday: optional(/^\d{4}-\d{2}-\d{2}$/, 'Enter a date as YYYY-MM-DD, for example 1994-03-21.'),
  chessComHandle: optional(/^[A-Za-z0-9_-]{3,25}$/, 'Use 3 to 25 letters, numbers, dashes or underscores.'),
  fideId: optional(/^[0-9]{3,12}$/, 'Use 3 to 12 digits.'),
})
export type PrivateFormValues = z.infer<typeof privateFormSchema>

export function privateDefaults(profile: ProfileDto): PrivateFormValues {
  return {
    name: profile.name,
    city: profile.city ?? '',
    area: profile.area ?? '',
    phone: profile.phone ?? '',
    birthday: profile.birthday ?? '',
    chessComHandle: profile.chessComHandle ?? '',
    fideId: profile.fideId ?? '',
  }
}

export interface PrivatePatch {
  /** Only the fields that changed to a non-empty value (the wire schema has no way to clear a field). */
  update: ProfileUpdate
  /** Fields that had a value and were emptied: the API cannot clear them, so the form says so. */
  cleared: PrivateField[]
}

export function privatePatch(values: PrivateFormValues, saved: PrivateFormValues): PrivatePatch {
  const update: Record<string, string> = {}
  const cleared: PrivateField[] = []
  for (const field of PRIVATE_FIELDS) {
    if (values[field] === saved[field]) continue
    if (values[field] === '') cleared.push(field)
    else update[field] = values[field]
  }
  return { update: update as ProfileUpdate, cleared }
}

export const publicFormSchema = z.object({
  showDisplayName: z.boolean(),
  showRatings: z.boolean(),
  showChessComHandle: z.boolean(),
  showCityChapter: z.boolean(),
})
export type PublicFormValues = z.infer<typeof publicFormSchema>

export const PUBLIC_TOGGLES = [
  { name: 'showDisplayName', label: 'Show display name', hint: 'Off shows your initials instead of your name.' },
  { name: 'showRatings', label: 'Show PG ratings', hint: 'Your Blitz, Rapid and Classical ratings.' },
  { name: 'showChessComHandle', label: 'Show Chess.com handle', hint: 'Only if you have added one above.' },
  { name: 'showCityChapter', label: 'Show city chapter', hint: 'The city you play in, not your address.' },
] as const satisfies readonly { name: keyof PublicFormValues; label: string; hint: string }[]
