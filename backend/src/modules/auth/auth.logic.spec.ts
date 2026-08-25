import { UserRole } from '../../generated/prisma/client';
import {
  calculateAge,
  decideRefresh,
  generateRefreshToken,
  hashRefreshToken,
  meetsMinimumAge,
  minimumAgeForRole,
  refreshTokenExpiry,
  type RefreshTokenState,
} from './auth.logic';

/** UTC throughout: dateOfBirth is a @db.Date with no timezone attached. */
const utc = (iso: string) => new Date(`${iso}T00:00:00.000Z`);

describe('age gate (FR-AUTH-1)', () => {
  describe('minimumAgeForRole', () => {
    it('is 12 for players', () => {
      expect(minimumAgeForRole(UserRole.PLAYER)).toBe(12);
    });

    it.each([
      UserRole.COACH,
      UserRole.SCOUT,
      UserRole.ANALYST,
      UserRole.PHYSICAL_THERAPIST,
      UserRole.CLUB_ADMIN,
    ])('is 18 for %s', (role) => {
      expect(minimumAgeForRole(role)).toBe(18);
    });
  });

  describe('calculateAge', () => {
    it('counts a birthday that has already passed this year', () => {
      expect(calculateAge(utc('1990-03-01'), utc('2026-08-06'))).toBe(36);
    });

    it('does not count a birthday still to come this year', () => {
      expect(calculateAge(utc('1990-12-01'), utc('2026-08-06'))).toBe(35);
    });

    it('counts the birthday itself', () => {
      expect(calculateAge(utc('1990-08-06'), utc('2026-08-06'))).toBe(36);
    });

    it('does not count the day before the birthday', () => {
      expect(calculateAge(utc('1990-08-06'), utc('2026-08-05'))).toBe(35);
    });

    it('handles a birthday later in the same month', () => {
      expect(calculateAge(utc('2000-08-20'), utc('2026-08-06'))).toBe(25);
    });

    // The reason this is calendar arithmetic and not elapsedMs / 365.25 days:
    // across 9 leap years the fractional approach drifts far enough to reject
    // someone on their actual 18th birthday.
    it('is exact on a 29 February birthday in a non-leap year', () => {
      expect(calculateAge(utc('2008-02-29'), utc('2026-02-28'))).toBe(17);
      expect(calculateAge(utc('2008-02-29'), utc('2026-03-01'))).toBe(18);
    });

    it('is exact on a 29 February birthday in a leap year', () => {
      expect(calculateAge(utc('2008-02-29'), utc('2028-02-29'))).toBe(20);
    });

    it('returns a negative age for a date of birth in the future', () => {
      expect(calculateAge(utc('2030-01-01'), utc('2026-08-06'))).toBe(-4);
    });
  });

  describe('meetsMinimumAge', () => {
    const now = utc('2026-08-06');

    it('admits a player who turns 12 today', () => {
      expect(meetsMinimumAge(UserRole.PLAYER, utc('2014-08-06'), now)).toBe(
        true,
      );
    });

    it('rejects a player one day short of 12', () => {
      expect(meetsMinimumAge(UserRole.PLAYER, utc('2014-08-07'), now)).toBe(
        false,
      );
    });

    it('admits a coach who turns 18 today', () => {
      expect(meetsMinimumAge(UserRole.COACH, utc('2008-08-06'), now)).toBe(
        true,
      );
    });

    it('rejects a coach one day short of 18', () => {
      expect(meetsMinimumAge(UserRole.COACH, utc('2008-08-07'), now)).toBe(
        false,
      );
    });

    // Nothing stops a client sending a future date — the DTO checks that
    // dateOfBirth IS a date, not that it is in the past. The age gate is what
    // catches it, so pin that it fails CLOSED rather than reading as valid.
    it.each([UserRole.PLAYER, UserRole.COACH])(
      'rejects a %s whose date of birth is in the future',
      (role) => {
        expect(meetsMinimumAge(role, utc('2030-01-01'), now)).toBe(false);
      },
    );

    // The whole point of the rule being role-aware.
    it('rejects a 12-year-old for every non-player role', () => {
      const twelve = utc('2014-08-06');
      expect(meetsMinimumAge(UserRole.PLAYER, twelve, now)).toBe(true);
      expect(meetsMinimumAge(UserRole.SCOUT, twelve, now)).toBe(false);
      expect(meetsMinimumAge(UserRole.CLUB_ADMIN, twelve, now)).toBe(false);
    });
  });
});

describe('refresh token generation and hashing (§9)', () => {
  it('produces an opaque token, not a JWT', () => {
    const token = generateRefreshToken();
    expect(token).not.toContain('.');
    // 32 random bytes, base64url encoded and unpadded.
    expect(token).toMatch(/^[A-Za-z0-9_-]{43}$/);
  });

  it('never repeats a token', () => {
    const tokens = new Set(
      Array.from({ length: 500 }, () => generateRefreshToken()),
    );
    expect(tokens.size).toBe(500);
  });

  it('hashes to 64 hex characters (SHA-256)', () => {
    expect(hashRefreshToken('any-token')).toMatch(/^[0-9a-f]{64}$/);
  });

  it('is deterministic, so a presented token can be looked up by hash', () => {
    const token = generateRefreshToken();
    expect(hashRefreshToken(token)).toBe(hashRefreshToken(token));
  });

  it('never returns the raw token, so a database leak yields no sessions', () => {
    const token = generateRefreshToken();
    expect(hashRefreshToken(token)).not.toBe(token);
  });

  it('maps distinct tokens to distinct hashes', () => {
    expect(hashRefreshToken('a')).not.toBe(hashRefreshToken('b'));
  });

  it('computes a 30-day expiry', () => {
    const now = utc('2026-08-06');
    expect(refreshTokenExpiry(now, 30).toISOString()).toBe(
      '2026-09-05T00:00:00.000Z',
    );
  });
});

describe('decideRefresh — rotation and reuse detection (§9 breach tripwire)', () => {
  const now = utc('2026-08-06');
  const state = (overrides: Partial<RefreshTokenState>): RefreshTokenState => ({
    revokedAt: null,
    expiresAt: utc('2026-09-05'),
    ...overrides,
  });

  it('rotates a live token', () => {
    expect(decideRefresh(state({}), now)).toBe('ROTATE');
  });

  it('rejects an unknown token with nothing to revoke', () => {
    expect(decideRefresh(null, now)).toBe('REJECT');
  });

  it('rejects an expired token', () => {
    expect(decideRefresh(state({ expiresAt: utc('2026-08-05') }), now)).toBe(
      'REJECT',
    );
  });

  it('rejects a token expiring exactly now', () => {
    expect(decideRefresh(state({ expiresAt: now }), now)).toBe('REJECT');
  });

  // THE case this whole mechanism exists for: the token was already rotated
  // away, so the copy being presented came from somewhere it shouldn't have.
  it('revokes the family when an already-rotated token is replayed', () => {
    expect(decideRefresh(state({ revokedAt: utc('2026-08-01') }), now)).toBe(
      'REVOKE_FAMILY',
    );
  });

  it('still revokes the family when the replayed token is also expired', () => {
    // Reuse detection outranks expiry: a stale stolen token is evidence of a
    // breach whether or not it would have worked.
    expect(
      decideRefresh(
        { revokedAt: utc('2026-01-01'), expiresAt: utc('2026-02-01') },
        now,
      ),
    ).toBe('REVOKE_FAMILY');
  });

  it('accepts a token expiring one millisecond from now', () => {
    expect(
      decideRefresh(state({ expiresAt: new Date(now.getTime() + 1) }), now),
    ).toBe('ROTATE');
  });
});
