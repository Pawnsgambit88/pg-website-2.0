import type { MeDto } from '@/lib/api/types/auth'
import { preferencesInputSchema } from '@/lib/api/types/auth'
import {
  profileUpdateSchema,
  publicIdentityUpdateSchema,
  type ProfileDto,
  type ProfileUpdate,
} from '@/lib/api/types/profile'
import { toMe, toProfile } from '@/lib/mock/auth/accounts'
import { parseInput } from '@/lib/mock/auth/errors'
import { verifyAccess } from '@/lib/mock/auth/sessions'
import type { AuthStateStore } from '@/lib/mock/auth/state'
import { transact } from '@/lib/mock/auth/transact'

// The mock profile backend (TASK-021): M13 to M16 over the per-session store (backend contract 3.4). Every call needs a
// valid access token (AUTH_REQUIRED otherwise). Inputs are STRICT like the server: a key outside the allow-list
// (role, email, ratings, id, onboardingDone, a visibility flag for email/phone/birthday) is VALIDATION_FAILED with
// `fields.<key>`; it is never silently dropped.

export interface MockProfileServiceOptions {
  store: AuthStateStore | null
  now?: () => number
}

export interface MockProfileService {
  getProfile: (accessToken: string | null) => ProfileDto
  updateProfile: (accessToken: string | null, input: unknown) => ProfileDto
  updatePublicIdentity: (accessToken: string | null, input: unknown) => ProfileDto
  savePreferences: (accessToken: string | null, input: unknown) => MeDto
}

/** Assigns only the keys present (an `undefined` value is "not sent"), so a PATCH never clears a field by omission. */
function applyProfile(profile: ProfileDto, update: ProfileUpdate): void {
  for (const [key, value] of Object.entries(update) as [keyof ProfileUpdate, string | undefined][]) {
    if (value !== undefined) profile[key] = value
  }
}

export function createMockProfileService(options: MockProfileServiceOptions): MockProfileService {
  const { store } = options
  const now = options.now ?? Date.now

  return {
    // M13
    getProfile(accessToken) {
      return transact(store, 'read', (state) => toProfile(verifyAccess(state, accessToken, now())))
    },

    // M14. Allow-listed private fields only; email, role and ratings are rejected.
    updateProfile(accessToken, input) {
      return transact(store, 'write', (state) => {
        const account = verifyAccess(state, accessToken, now())
        applyProfile(account.profile, parseInput(profileUpdateSchema, input))
        return toProfile(account)
      })
    },

    // M15. Visibility toggles only; there is no key for email, phone or birthday.
    updatePublicIdentity(accessToken, input) {
      return transact(store, 'write', (state) => {
        const account = verifyAccess(state, accessToken, now())
        const update = parseInput(publicIdentityUpdateSchema, input)
        const flags = account.profile.publicIdentity
        for (const [key, value] of Object.entries(update) as [keyof typeof flags, boolean | undefined][]) {
          if (value !== undefined) flags[key] = value
        }
        return toProfile(account)
      })
    },

    // M16. Skippable; saving or skipping marks onboarding done.
    savePreferences(accessToken, input) {
      return transact(store, 'write', (state) => {
        const account = verifyAccess(state, accessToken, now())
        const prefs = parseInput(preferencesInputSchema.strict(), input)
        if (prefs.skipped !== true) {
          if (prefs.playStyle !== undefined) account.playStyle = prefs.playStyle
          if (prefs.mood !== undefined) account.mood = prefs.mood
        }
        account.onboardingDone = true
        return toMe(account)
      })
    },
  }
}
