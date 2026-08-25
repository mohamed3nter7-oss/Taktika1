import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { ErrorCode } from '../../common/errors/error-codes';
import { UserRole, UserStatus } from '../../generated/prisma/client';
import type { PrismaService } from '../../common/prisma/prisma.service';
import type { ReferenceService } from '../reference/reference.service';
import { AuthService } from './auth.service';
import type { LoginDto } from './dto/login.dto';
import type { RegisterDto } from './dto/register.dto';

/**
 * These cover the rules that live in AuthService itself: the age gate, what
 * actually reaches the users row, the uniform login failure, and the JWT
 * payload.
 *
 * JwtService and ConfigService are the real classes, so token claims are
 * asserted against genuinely signed output. Only Prisma is stubbed, and only
 * as a probe to inspect what the service WROTE — never to assert that Prisma
 * was called, which CLAUDE.md §13 rightly calls not-a-test. Everything that
 * depends on real database behaviour (unique violations, transactional
 * rotation) belongs in the integration suite once migrations exist.
 */

interface StoredUser {
  id: string;
  email: string;
  passwordHash: string;
  role: UserRole;
  status: UserStatus;
}

class PrismaStub {
  users: StoredUser[] = [];
  createdUserData: Record<string, unknown>[] = [];
  refreshTokenRows: Record<string, unknown>[] = [];
  revokedFamilies: string[] = [];

  user = {
    create: ({
      data,
    }: {
      data: Record<string, unknown>;
    }): Promise<Record<string, unknown>> => {
      this.createdUserData.push(data);
      return Promise.resolve({
        id: 'user-1',
        email: data.email,
        fullName: data.fullName,
        role: data.role,
        status: data.status,
      });
    },
    findUnique: ({
      where,
    }: {
      where: { email?: string; id?: string };
    }): Promise<StoredUser | null> =>
      Promise.resolve(
        this.users.find(
          (u) =>
            (where.email !== undefined && u.email === where.email) ||
            (where.id !== undefined && u.id === where.id),
        ) ?? null,
      ),
    updateMany: (): Promise<{ count: number }> => Promise.resolve({ count: 1 }),
  };

  refreshToken = {
    create: ({
      data,
    }: {
      data: Record<string, unknown>;
    }): Promise<Record<string, unknown>> => {
      this.refreshTokenRows.push(data);
      return Promise.resolve(data);
    },
    findUnique: (): Promise<null> => Promise.resolve(null),
    updateMany: ({
      where,
    }: {
      where: { familyId?: string };
    }): Promise<{ count: number }> => {
      if (where.familyId) this.revokedFamilies.push(where.familyId);
      return Promise.resolve({ count: 1 });
    },
  };
}

const JWT_SECRET = 'test-access-secret';

// The mail stub logs on every register; keep the suite output readable.
beforeAll(() => {
  Logger.overrideLogger(false);
});

function buildService() {
  const prisma = new PrismaStub();
  const jwt = new JwtService({ secret: JWT_SECRET });
  const config = new ConfigService({
    EMAIL_VERIFICATION_SECRET: 'test-verification-secret',
    NODE_ENV: 'test',
  });

  // Admits the fixture city/country pair so registration reaches the logic
  // under test. Whether the pair is genuinely valid is a question about real
  // rows, so it is asserted in the e2e suite against real Postgres, not here.
  const reference = {
    assertCityInCountry: (): Promise<void> => Promise.resolve(),
  };

  const service = new AuthService(
    prisma as unknown as PrismaService,
    jwt,
    config,
    reference as unknown as ReferenceService,
  );

  return { service, prisma, jwt };
}

const baseRegisterDto = (
  overrides: Partial<RegisterDto> = {},
): RegisterDto => ({
  email: 'mohamed@example.com',
  password: 'correct horse battery',
  fullName: 'Mohamed Anter',
  role: UserRole.COACH,
  dateOfBirth: new Date('1990-01-01T00:00:00.000Z'),
  countryId: 1,
  cityId: 1,
  ...overrides,
});

/** Extracts the `error` payload from a thrown Nest HttpException. */
function errorPayload(error: unknown): { code?: string; message?: string } {
  const response = (error as { getResponse?: () => unknown }).getResponse?.();
  return response ?? {};
}

async function captureError(promise: Promise<unknown>): Promise<unknown> {
  try {
    await promise;
  } catch (error) {
    return error;
  }
  throw new Error('Expected the call to reject, but it resolved.');
}

describe('AuthService — password handling', () => {
  it('stores a bcrypt hash at cost 12, never the plaintext', async () => {
    const { service, prisma } = buildService();
    const dto = baseRegisterDto();

    await service.register(dto);

    const [written] = prisma.createdUserData;
    const passwordHash = written.passwordHash as string;

    // Pins the cost factor required by §9. Dropping it to 10 to speed up tests
    // is exactly the regression this catches.
    expect(passwordHash).toMatch(/^\$2[aby]\$12\$/);
    expect(passwordHash).not.toBe(dto.password);
    expect(await bcrypt.compare(dto.password, passwordHash)).toBe(true);
  });

  it('never writes the raw password anywhere on the row', async () => {
    const { service, prisma } = buildService();

    await service.register(baseRegisterDto({ password: 'a-very-secret-pass' }));

    expect(JSON.stringify(prisma.createdUserData)).not.toContain(
      'a-very-secret-pass',
    );
  });

  it('writes no field that could reach admin_profiles', async () => {
    const { service, prisma } = buildService();

    await service.register(baseRegisterDto());

    // Registration must be structurally unable to mint an administrator (§9):
    // one flat create, no nested writes, no admin-adjacent keys.
    const written = prisma.createdUserData[0];
    expect(Object.keys(written).sort()).toEqual(
      [
        'bio',
        'cityId',
        'countryId',
        'dateOfBirth',
        'email',
        'fullName',
        'gender',
        'headline',
        'passwordHash',
        'phone',
        'role',
        'status',
      ].sort(),
    );
    expect(written.status).toBe(UserStatus.PENDING_VERIFICATION);
  });
});

describe('AuthService — age gate (FR-AUTH-1)', () => {
  const twelveYearsOld = new Date();
  twelveYearsOld.setUTCFullYear(twelveYearsOld.getUTCFullYear() - 12);

  const seventeenYearsOld = new Date();
  seventeenYearsOld.setUTCFullYear(seventeenYearsOld.getUTCFullYear() - 17);

  it('admits a 12-year-old player', async () => {
    const { service, prisma } = buildService();

    await service.register(
      baseRegisterDto({ role: UserRole.PLAYER, dateOfBirth: twelveYearsOld }),
    );

    expect(prisma.createdUserData).toHaveLength(1);
  });

  it('rejects a 17-year-old coach with UNDERAGE', async () => {
    const { service, prisma } = buildService();

    const error = await captureError(
      service.register(
        baseRegisterDto({
          role: UserRole.COACH,
          dateOfBirth: seventeenYearsOld,
        }),
      ),
    );

    expect(errorPayload(error).code).toBe(ErrorCode.UNDERAGE);
    // Rejected before any hashing or writing happened.
    expect(prisma.createdUserData).toHaveLength(0);
  });

  it('rejects a 12-year-old scout — the gate is role-aware, not global', async () => {
    const { service } = buildService();

    const error = await captureError(
      service.register(
        baseRegisterDto({ role: UserRole.SCOUT, dateOfBirth: twelveYearsOld }),
      ),
    );

    expect(errorPayload(error).code).toBe(ErrorCode.UNDERAGE);
  });
});

describe('AuthService — login', () => {
  const PASSWORD = 'correct horse battery';
  let passwordHash: string;

  beforeAll(async () => {
    passwordHash = await bcrypt.hash(PASSWORD, 12);
  });

  const seed = (prisma: PrismaStub, status: UserStatus) =>
    prisma.users.push({
      id: 'user-1',
      email: 'mohamed@example.com',
      passwordHash,
      role: UserRole.COACH,
      status,
    });

  const credentials = (overrides: Partial<LoginDto> = {}): LoginDto => ({
    email: 'mohamed@example.com',
    password: PASSWORD,
    ...overrides,
  });

  it('returns an identical 401 for an unknown email and a wrong password', async () => {
    const { service: unknownEmailService } = buildService();
    const { service: wrongPasswordService, prisma } = buildService();
    seed(prisma, UserStatus.ACTIVE);

    const unknownEmail = await captureError(
      unknownEmailService.login(credentials({ email: 'nobody@example.com' })),
    );
    const wrongPassword = await captureError(
      wrongPasswordService.login(credentials({ password: 'wrong' })),
    );

    // §9: never reveal which field was wrong. Status, code and message must be
    // byte-identical or the difference itself is the answer.
    expect(errorPayload(unknownEmail).code).toBe(ErrorCode.INVALID_CREDENTIALS);
    expect(errorPayload(unknownEmail)).toEqual(errorPayload(wrongPassword));
    expect((unknownEmail as { status: number }).status).toBe(
      (wrongPassword as { status: number }).status,
    );
  });

  it('still burns a bcrypt comparison when no such user exists', async () => {
    const { service } = buildService();

    const startedAt = performance.now();
    await captureError(
      service.login(credentials({ email: 'nobody@example.com' })),
    );
    const elapsed = performance.now() - startedAt;

    // Without the dummy-hash comparison this path returns in under a
    // millisecond, and response time answers "does this account exist?" —
    // defeating the uniform 401 above. A real cost-12 compare takes ~200ms;
    // the floor here is deliberately far below that so the test cannot flake
    // on a slow machine, while still being far above a skipped comparison.
    expect(elapsed).toBeGreaterThan(50);
  });

  it('refuses an unverified account with EMAIL_NOT_VERIFIED', async () => {
    const { service, prisma } = buildService();
    seed(prisma, UserStatus.PENDING_VERIFICATION);

    const error = await captureError(service.login(credentials()));

    expect(errorPayload(error).code).toBe(ErrorCode.EMAIL_NOT_VERIFIED);
  });

  it.each([UserStatus.SUSPENDED, UserStatus.DELETED])(
    'refuses a %s account',
    async (status) => {
      const { service, prisma } = buildService();
      seed(prisma, status);

      const error = await captureError(service.login(credentials()));

      expect(errorPayload(error).code).toBe(ErrorCode.ACCOUNT_SUSPENDED);
    },
  );

  it('admits a PENDING_PROFILE user — they still need the auth endpoints', async () => {
    const { service, prisma } = buildService();
    seed(prisma, UserStatus.PENDING_PROFILE);

    await expect(service.login(credentials())).resolves.toMatchObject({
      expiresIn: 900,
    });
  });
});

describe('AuthService — issued session', () => {
  const PASSWORD = 'correct horse battery';

  const login = async () => {
    const built = buildService();
    built.prisma.users.push({
      id: 'user-1',
      email: 'mohamed@example.com',
      passwordHash: await bcrypt.hash(PASSWORD, 12),
      role: UserRole.COACH,
      status: UserStatus.ACTIVE,
    });
    const session = await built.service.login({
      email: 'mohamed@example.com',
      password: PASSWORD,
    });
    return { ...built, session };
  };

  it('signs an access token carrying exactly sub, role and status', async () => {
    const { session, jwt } = await login();

    const claims = jwt.verify<Record<string, unknown>>(session.accessToken, {
      secret: JWT_SECRET,
    });

    // §9: nothing else in the payload. Extra claims widen what a stolen
    // 15-minute token is worth.
    expect(Object.keys(claims).sort()).toEqual([
      'exp',
      'iat',
      'role',
      'status',
      'sub',
    ]);
    expect(claims.sub).toBe('user-1');
    expect(claims.role).toBe(UserRole.COACH);
    expect(claims.status).toBe(UserStatus.ACTIVE);
  });

  it('expires the access token in 15 minutes', async () => {
    const { session, jwt } = await login();

    const { iat, exp } = jwt.verify<{ iat: number; exp: number }>(
      session.accessToken,
      { secret: JWT_SECRET },
    );

    expect(exp - iat).toBe(900);
    expect(session.expiresIn).toBe(900);
  });

  it('issues an opaque refresh token and stores only its hash', async () => {
    const { session, prisma } = await login();

    const [row] = prisma.refreshTokenRows;

    expect(session.refreshToken).not.toContain('.'); // not a JWT
    expect(row.tokenHash).toMatch(/^[0-9a-f]{64}$/);
    expect(row.tokenHash).not.toBe(session.refreshToken);
    expect(JSON.stringify(prisma.refreshTokenRows)).not.toContain(
      session.refreshToken,
    );
  });

  it('starts a new token family, expiring in 30 days', async () => {
    const { prisma } = await login();

    const [row] = prisma.refreshTokenRows;

    expect(row.familyId).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/,
    );
    const days =
      ((row.expiresAt as Date).getTime() - Date.now()) / (24 * 60 * 60 * 1000);
    expect(days).toBeCloseTo(30, 1);
  });
});

describe('AuthService — logout', () => {
  it('does nothing when no refresh cookie was sent', async () => {
    const { service, prisma } = buildService();

    await service.logout(undefined, 'user-1');

    expect(prisma.revokedFamilies).toHaveLength(0);
  });

  it('revokes the whole family the token belongs to', async () => {
    const { service, prisma } = buildService();
    prisma.refreshToken.findUnique = () =>
      Promise.resolve({ userId: 'user-1', familyId: 'family-1' } as never);

    await service.logout('some-raw-token', 'user-1');

    expect(prisma.revokedFamilies).toEqual(['family-1']);
  });

  it("refuses to revoke another user's family", async () => {
    const { service, prisma } = buildService();
    prisma.refreshToken.findUnique = () =>
      Promise.resolve({
        userId: 'someone-else',
        familyId: 'family-2',
      } as never);

    await service.logout('a-stolen-token', 'user-1');

    // Silent no-op rather than an error: reporting the mismatch would turn
    // logout into a token-validity oracle.
    expect(prisma.revokedFamilies).toHaveLength(0);
  });
});
