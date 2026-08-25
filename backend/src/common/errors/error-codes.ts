/**
 * Stable machine-readable error codes (CLAUDE.md §8).
 *
 * The frontend translates these; the English `message` on the wire is a dev
 * fallback and is never rendered. Changing a value here is a breaking API
 * change and requires approval (§15) — add new codes instead.
 */
export const ErrorCode = {
  // --- generic ---
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  UNAUTHORIZED: 'UNAUTHORIZED',
  FORBIDDEN: 'FORBIDDEN',
  NOT_FOUND: 'NOT_FOUND',
  CONFLICT: 'CONFLICT',
  RATE_LIMITED: 'RATE_LIMITED',
  INTERNAL_ERROR: 'INTERNAL_ERROR',

  // --- auth (§9) ---
  /** Uniform login failure. Never says whether it was the email or the password. */
  INVALID_CREDENTIALS: 'INVALID_CREDENTIALS',
  /**
   * Uniform refresh failure — returned for an unknown, expired AND reused
   * token alike. Distinguishing them would tell an attacker their replay
   * tripped the family revocation.
   */
  INVALID_REFRESH_TOKEN: 'INVALID_REFRESH_TOKEN',
  INVALID_VERIFICATION_TOKEN: 'INVALID_VERIFICATION_TOKEN',
  EMAIL_TAKEN: 'EMAIL_TAKEN',
  EMAIL_NOT_VERIFIED: 'EMAIL_NOT_VERIFIED',
  EMAIL_ALREADY_VERIFIED: 'EMAIL_ALREADY_VERIFIED',
  ACCOUNT_SUSPENDED: 'ACCOUNT_SUSPENDED',
  /** Role-aware minimum age: PLAYER ≥ 12, every other role ≥ 18 (FR-AUTH-1). */
  UNDERAGE: 'UNDERAGE',
  /** PENDING_PROFILE user reaching past the auth/profile-completion endpoints. */
  PROFILE_INCOMPLETE: 'PROFILE_INCOMPLETE',

  // --- profiles ---
  /**
   * The role-block in a completion/update body is missing or does not match
   * the caller's own JWT role. One code for both: which block was wrong is
   * obvious to a legitimate client and useless to anyone else.
   */
  ROLE_MISMATCH: 'ROLE_MISMATCH',
  /** Role profile row already exists — completion is one-shot per account. */
  PROFILE_ALREADY_COMPLETED: 'PROFILE_ALREADY_COMPLETED',
  /** club_admin_profiles.club_id is unique: one admin per club in v1 (PRD A.2). */
  CLUB_ALREADY_MANAGED: 'CLUB_ALREADY_MANAGED',

  // --- career ---
  /**
   * `uq_affiliation_one_current_per_club` fired: the caller already has an
   * open (end_date IS NULL) affiliation with that club. Deliberately narrow —
   * open affiliations at DIFFERENT clubs and overlapping date ranges are both
   * permitted (PRD 9.2 edge cases), and nothing in the application blocks
   * them. This code means "close the open one first", not "one club only".
   */
  AFFILIATION_ALREADY_OPEN: 'AFFILIATION_ALREADY_OPEN',
} as const;

export type ErrorCode = (typeof ErrorCode)[keyof typeof ErrorCode];
