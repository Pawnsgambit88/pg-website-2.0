// Mock auth policy numbers (backend contract 2.4, 2.10; ARCH-001 12.1). The mock "server" applies them to its session
// store; the real backend decides its own values. Real wall-clock time is used here (not MOCK_NOW): expiry must pass.

const SECOND = 1000
const MINUTE = 60 * SECOND
const HOUR = 60 * MINUTE

/** Access token lifetime (contract: 5 to 15 min). Overridable per adapter (`accessTtlMs`) to exercise refresh quickly. */
export const ACCESS_TTL_MS = 10 * MINUTE
/** Step-up token: valid 5 minutes for one sensitive operation (contract 2.4). */
export const STEP_UP_TTL_MS = 5 * MINUTE
/** Replay of the immediately previous refresh token inside this window returns the same new pair (contract 2.4, F-02). */
export const REFRESH_GRACE_MS = 10 * SECOND
/** Player session: 14 days sliding in dev/mock mode (contract 2.4 table). */
export const PLAYER_SESSION_SLIDING_MS = 14 * 24 * HOUR
/** Admin session: absolute cap of 12 hours (ARCH-001 12.1). */
export const ADMIN_SESSION_ABSOLUTE_MS = 12 * HOUR
/** Password reset token: 1 hour, single use (contract 2.4). */
export const RESET_TOKEN_TTL_MS = HOUR
/** OAuth one-time code. */
export const OAUTH_CODE_TTL_MS = 5 * MINUTE

/** Rate limits (contract 2.10 starting points). */
export const LOGIN_FAILURE_LIMIT = Object.freeze({ max: 5, windowMs: MINUTE })
export const RESET_REQUEST_LIMIT = Object.freeze({ max: 3, windowMs: HOUR })

/** Bounds that keep the session store small. */
export const MAX_ACCOUNTS = 200
export const MAX_FAMILIES = 50
export const MAX_ACCESS_RECORDS = 200
export const MAX_USED_PER_FAMILY = 20
/** Revoked families are kept this long so a late replay still reports REFRESH_REUSED. */
export const REVOKED_FAMILY_RETENTION_MS = 24 * HOUR
