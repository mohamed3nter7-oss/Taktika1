import { createHash, randomBytes } from 'node:crypto';
import { UserRole } from '../../generated/prisma/client';

/**
 * Pure auth logic — no Nest, no Prisma, no I/O.
 *
 * Extracted purely so CLAUDE.md §13's "unit tests only for genuinely complex
 * pure logic (token rotation)" is testable without mocking Prisma. This is not
 * a layer: `AuthService` imports these as plain functions. `ProfilesService`
 * also imports `calculateAge` (public profiles expose age, not birth date) —
 * the calendar arithmetic below is subtle enough that duplicating it would be
 * worse than sharing it.
 */

// =============================================================================
// Age gate (FR-AUTH-1)
// =============================================================================

/** PLAYER ≥ 12, every other role ≥ 18 (schema.prisma:326). */
export const MINIMUM_AGE_PLAYER = 12;
export const MINIMUM_AGE_DEFAULT = 18;

export function minimumAgeForRole(role: UserRole): number {
  return role === UserRole.PLAYER ? MINIMUM_AGE_PLAYER : MINIMUM_AGE_DEFAULT;
}

/**
 * Full years elapsed between `dateOfBirth` and `now`.
 *
 * Calendar arithmetic, never `elapsedMs / 365.25 days`: the fractional-year
 * approach drifts by up to a day across leap years, which silently rejects
 * someone on their 18th birthday.
 *
 * Both dates are read in UTC — `dateOfBirth` is a `@db.Date` column with no
 * timezone, so interpreting it locally would shift it by a day for anyone east
 * or west of UTC.
 */
export function calculateAge(dateOfBirth: Date, now: Date): number {
  let age = now.getUTCFullYear() - dateOfBirth.getUTCFullYear();

  const monthDelta = now.getUTCMonth() - dateOfBirth.getUTCMonth();
  const dayDelta = now.getUTCDate() - dateOfBirth.getUTCDate();

  // Birthday has not come round yet this year.
  if (monthDelta < 0 || (monthDelta === 0 && dayDelta < 0)) {
    age -= 1;
  }

  return age;
}

export function meetsMinimumAge(
  role: UserRole,
  dateOfBirth: Date,
  now: Date,
): boolean {
  return calculateAge(dateOfBirth, now) >= minimumAgeForRole(role);
}

// =============================================================================
// Refresh tokens (§9)
// =============================================================================

/** Opaque, NOT a JWT — 256 bits of entropy, nothing encoded in it. */
export function generateRefreshToken(): string {
  return randomBytes(32).toString('base64url');
}

/**
 * SHA-256, not bcrypt. The token is 256 bits of uniform randomness, so there
 * is no dictionary to slow down — a work factor would only tax every refresh
 * call. bcrypt is for passwords, which have low entropy.
 */
export function hashRefreshToken(token: string): string {
  return createHash('sha256').update(token, 'utf8').digest('hex');
}

/** The stored row, reduced to only what the rotation decision depends on. */
export interface RefreshTokenState {
  revokedAt: Date | null;
  expiresAt: Date;
}

export type RefreshAction =
  /** Live token: revoke it, issue its successor in the same family. */
  | 'ROTATE'
  /**
   * Breach tripwire. The presented token was already rotated away, so someone
   * is replaying a stolen copy — kill every sibling session immediately.
   */
  | 'REVOKE_FAMILY'
  /** Unknown or expired. Nothing to revoke. */
  | 'REJECT';

/**
 * The rotation decision, in one place, with no I/O so the reuse case is
 * actually testable (CLAUDE.md §13 priority 2).
 *
 * Every outcome must produce the SAME 401 on the wire. Telling a caller that
 * they tripped family revocation is telling an attacker their replay was
 * detected.
 */
export function decideRefresh(
  state: RefreshTokenState | null,
  now: Date,
): RefreshAction {
  if (!state) return 'REJECT';

  // Checked before expiry on purpose: an expired token that was ALSO already
  // rotated is still evidence of a replay, and the family still needs killing.
  if (state.revokedAt !== null) return 'REVOKE_FAMILY';

  if (state.expiresAt.getTime() <= now.getTime()) return 'REJECT';

  return 'ROTATE';
}

export function refreshTokenExpiry(now: Date, ttlDays: number): Date {
  return new Date(now.getTime() + ttlDays * 24 * 60 * 60 * 1000);
}
