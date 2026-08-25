import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { createHash } from 'node:crypto';
import { UserRole, UserStatus } from '../src/generated/prisma/client';
import {
  ApiClient,
  asError,
  asJson,
  clearE2eUsers,
  clearReferenceData,
  cookieHeader,
  createE2eApp,
  refreshCookieValue,
  refreshSetCookie,
  seedReferenceData,
  setCookieLines,
  uniqueEmail,
  type E2eContext,
  type ReferenceData,
  type SessionBody,
} from './support/e2e';

/**
 * CLAUDE.md §13 priority 2, against the real Postgres 16 container:
 * register → verify → login → refresh rotation → reuse-detection revokes the
 * family. Nothing is mocked; the only interception is the logger, and that is
 * there to ASSERT §9's "never log tokens".
 */

/** This suite's own fixture namespace: no other suite can delete its rows. */
const SUITE = 'flow';
const COUNTRY_CODE = 'ZF';
/**
 * A second country, so "this city is not in that country" can be posed with
 * two rows that both genuinely exist — the only shape of that bug the foreign
 * keys cannot catch on their own.
 */
const FOREIGN_COUNTRY_CODE = 'ZE';
const PASSWORD = 'correct horse battery staple';

/** An ISO date `years` before today, nudged by `days`. */
function isoDob(years: number, days = 0): string {
  const d = new Date();
  d.setUTCFullYear(d.getUTCFullYear() - years);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

const sha256 = (value: string) =>
  createHash('sha256').update(value).digest('hex');

interface RegisteredBody {
  id: string;
  email: string;
  fullName: string;
  role: UserRole;
  status: UserStatus;
}

describe('Auth flow (e2e, real Postgres)', () => {
  let ctx: E2eContext;
  let ref: ReferenceData;
  let foreignRef: ReferenceData;
  let jwt: JwtService;

  const payload = (overrides: Record<string, unknown> = {}) => ({
    email: uniqueEmail(SUITE),
    password: PASSWORD,
    fullName: 'Mohamed Anter',
    role: UserRole.COACH,
    dateOfBirth: '1990-04-23',
    countryId: ref.countryId,
    cityId: ref.cityId,
    ...overrides,
  });

  /** The mail seam logs the token in non-production; this is how we read it. */
  const verificationTokenFor = (userId: string): string => {
    const line = ctx.logs
      .filter(
        (l) =>
          l.level === 'debug' &&
          l.message.includes(`verification token for ${userId}`),
      )
      .pop();
    if (!line) throw new Error(`no verification token logged for ${userId}`);
    return line.message.slice(line.message.lastIndexOf(': ') + 2);
  };

  /** Registers a user and leaves them in PENDING_VERIFICATION. */
  async function register(overrides: Record<string, unknown> = {}) {
    const body = payload(overrides);
    const res = await new ApiClient(ctx.server)
      .post('/auth/register')
      .send(body)
      .expect(201);
    return { ...asJson<RegisteredBody>(res), password: PASSWORD };
  }

  /** Registers and verifies, leaving the user in PENDING_PROFILE. */
  async function verifiedUser(overrides: Record<string, unknown> = {}) {
    const user = await register(overrides);
    await new ApiClient(ctx.server)
      .post('/auth/verify-email')
      .send({ token: verificationTokenFor(user.id) })
      .expect(200);
    return user;
  }

  /** Registers, verifies, logs in. Returns the session and its cookie. */
  async function loggedInUser(overrides: Record<string, unknown> = {}) {
    const user = await verifiedUser(overrides);
    const api = new ApiClient(ctx.server);
    const res = await api
      .post('/auth/login')
      .send({ email: user.email, password: user.password })
      .expect(200);
    return {
      user,
      api,
      session: asJson<SessionBody>(res),
      refreshToken: refreshCookieValue(res),
    };
  }

  beforeAll(async () => {
    ctx = await createE2eApp();
    jwt = ctx.app.get(JwtService);
    await clearE2eUsers(ctx.prisma, SUITE);
    ref = await seedReferenceData(ctx.prisma, COUNTRY_CODE);
    foreignRef = await seedReferenceData(ctx.prisma, FOREIGN_COUNTRY_CODE);
  });

  afterAll(async () => {
    await clearE2eUsers(ctx.prisma, SUITE);
    await clearReferenceData(ctx.prisma, COUNTRY_CODE);
    await clearReferenceData(ctx.prisma, FOREIGN_COUNTRY_CODE);
    await ctx.close();
  });

  // ==========================================================================
  // Register
  // ==========================================================================

  describe('POST /auth/register', () => {
    it('creates a PENDING_VERIFICATION user and returns only whitelisted columns', async () => {
      const res = await new ApiClient(ctx.server)
        .post('/auth/register')
        .send(payload())
        .expect(201);

      const body = asJson<RegisteredBody>(res);
      expect(Object.keys(body).sort()).toEqual([
        'email',
        'fullName',
        'id',
        'role',
        'status',
      ]);
      expect(body.status).toBe(UserStatus.PENDING_VERIFICATION);
      expect(body.role).toBe(UserRole.COACH);
    });

    it('stores a bcrypt cost-12 hash and never the plaintext', async () => {
      const user = await register();

      const row = await ctx.prisma.user.findUniqueOrThrow({
        where: { id: user.id },
        select: { passwordHash: true, emailVerifiedAt: true },
      });

      expect(row.passwordHash).not.toBe(PASSWORD);
      expect(row.passwordHash).toMatch(/^\$2[aby]\$12\$/); // cost factor 12 (§9)
      await expect(bcrypt.compare(PASSWORD, row.passwordHash)).resolves.toBe(
        true,
      );
      expect(row.emailVerifiedAt).toBeNull();
    });

    it('lowercases the email so the chk_users_email_lowercase CHECK is only a backstop', async () => {
      const mixed = uniqueEmail(SUITE, 'MiXeD').toUpperCase();
      const user = await register({ email: mixed });

      expect(user.email).toBe(mixed.toLowerCase());
      await expect(
        ctx.prisma.user.findUnique({ where: { email: mixed.toLowerCase() } }),
      ).resolves.not.toBeNull();
    });

    it('rejects a duplicate email with 409 EMAIL_TAKEN', async () => {
      const first = await register();

      const res = await new ApiClient(ctx.server)
        .post('/auth/register')
        .send(payload({ email: first.email }))
        .expect(409);

      expect(asError(res).error.code).toBe('EMAIL_TAKEN');
    });

    it('turns an unknown countryId into 400, not a leaked Prisma code', async () => {
      const res = await new ApiClient(ctx.server)
        .post('/auth/register')
        .send(payload({ countryId: 987654 }))
        .expect(400);

      // Caught by the city-in-country check; the FK stays as the backstop
      // underneath it. Either way §8 is what the caller sees — a Prisma code
      // never reaches the wire.
      expect(asError(res).error.code).toBe('VALIDATION_ERROR');
      expect(JSON.stringify(res.body)).not.toContain('P2003');
    });

    describe('city must belong to the country (PRD 9.1)', () => {
      it('rejects a city from another country and creates no user', async () => {
        const email = uniqueEmail(SUITE);

        const res = await new ApiClient(ctx.server)
          .post('/auth/register')
          .send(
            payload({
              email,
              countryId: ref.countryId,
              cityId: foreignRef.cityId,
            }),
          )
          .expect(400);

        expect(asError(res).error.code).toBe('VALIDATION_ERROR');

        // Both ids exist, so every foreign key on `users` is satisfiable —
        // this pairing is wrong in a way only the belongs-to check can see.
        // Before that check existed, this request created an account whose
        // stated city was in a country it had never been in.
        await expect(
          ctx.prisma.user.findUnique({ where: { email } }),
        ).resolves.toBeNull();
      });

      it('rejects an unknown cityId', async () => {
        const res = await new ApiClient(ctx.server)
          .post('/auth/register')
          .send(payload({ cityId: 987654 }))
          .expect(400);

        expect(asError(res).error.code).toBe('VALIDATION_ERROR');
      });

      it('accepts any genuinely matching pair, not just the default fixture', async () => {
        // The control: proves the two rejections above are the check working
        // rather than the endpoint refusing everything unfamiliar.
        await new ApiClient(ctx.server)
          .post('/auth/register')
          .send(
            payload({
              countryId: foreignRef.countryId,
              cityId: foreignRef.cityId,
            }),
          )
          .expect(201);
      });
    });

    describe('headline and bio accept exactly what the profile editor does', () => {
      // PRD 9.2 sets 120/1000, and PATCH /users/me enforces those. Registration
      // once allowed 160/2000, so a value could be set at sign-up that its own
      // edit form would then reject. These pin both ends to the same numbers.
      it('accepts a headline of exactly 120 and a bio of exactly 1000', async () => {
        await new ApiClient(ctx.server)
          .post('/auth/register')
          .send(payload({ headline: 'h'.repeat(120), bio: 'b'.repeat(1000) }))
          .expect(201);
      });

      it('rejects a headline of 121', async () => {
        const res = await new ApiClient(ctx.server)
          .post('/auth/register')
          .send(payload({ headline: 'h'.repeat(121) }))
          .expect(400);

        expect(asError(res).error.code).toBe('VALIDATION_ERROR');
        expect(asError(res).error.details.join(' ')).toContain('headline');
      });

      it('rejects a bio of 1001', async () => {
        const res = await new ApiClient(ctx.server)
          .post('/auth/register')
          .send(payload({ bio: 'b'.repeat(1001) }))
          .expect(400);

        expect(asError(res).error.code).toBe('VALIDATION_ERROR');
        expect(asError(res).error.details.join(' ')).toContain('bio');
      });

      it('stores a max-length headline intact', async () => {
        const headline = 'h'.repeat(120);
        const user = await register({ headline });

        const row = await ctx.prisma.user.findUniqueOrThrow({
          where: { id: user.id },
          select: { headline: true },
        });
        // TEXT columns, no DB-level length cap — nothing truncates silently.
        expect(row.headline).toBe(headline);
      });
    });

    describe('role-aware age gate (FR-AUTH-1)', () => {
      it('admits a player who turns 12 today', async () => {
        await new ApiClient(ctx.server)
          .post('/auth/register')
          .send(payload({ role: UserRole.PLAYER, dateOfBirth: isoDob(12) }))
          .expect(201);
      });

      it('rejects a player one day short of 12', async () => {
        const res = await new ApiClient(ctx.server)
          .post('/auth/register')
          .send(payload({ role: UserRole.PLAYER, dateOfBirth: isoDob(12, 1) }))
          .expect(400);

        expect(asError(res).error.code).toBe('UNDERAGE');
      });

      it('admits a coach who turns 18 today', async () => {
        await new ApiClient(ctx.server)
          .post('/auth/register')
          .send(payload({ role: UserRole.COACH, dateOfBirth: isoDob(18) }))
          .expect(201);
      });

      it('rejects a 12-year-old coach — the same date that admits a player', async () => {
        const res = await new ApiClient(ctx.server)
          .post('/auth/register')
          .send(payload({ role: UserRole.COACH, dateOfBirth: isoDob(12) }))
          .expect(400);

        expect(asError(res).error.code).toBe('UNDERAGE');
      });

      it('creates no user when the age gate rejects', async () => {
        const email = uniqueEmail(SUITE);
        await new ApiClient(ctx.server)
          .post('/auth/register')
          .send(
            payload({
              email,
              role: UserRole.PLAYER,
              dateOfBirth: isoDob(8),
            }),
          )
          .expect(400);

        await expect(
          ctx.prisma.user.findUnique({ where: { email } }),
        ).resolves.toBeNull();
      });
    });

    describe('cannot create an administrator under any input (§9)', () => {
      it('rejects an ADMIN role — the enum has no such value', async () => {
        const res = await new ApiClient(ctx.server)
          .post('/auth/register')
          .send(payload({ role: 'ADMIN' }))
          .expect(400);

        expect(asError(res).error.code).toBe('VALIDATION_ERROR');
      });

      it.each([
        ['adminLevel', { adminLevel: 'SUPER_ADMIN' }],
        ['status', { status: UserStatus.ACTIVE }],
        ['emailVerifiedAt', { emailVerifiedAt: new Date().toISOString() }],
        ['adminProfile', { adminProfile: { create: { level: 'SUPER' } } }],
        ['passwordHash', { passwordHash: '$2b$12$anything' }],
      ])('rejects a smuggled %s outright', async (field, extra) => {
        const res = await new ApiClient(ctx.server)
          .post('/auth/register')
          .send(payload(extra))
          .expect(400);

        // forbidNonWhitelisted: an undeclared field is a 400, never a silently
        // dropped key that a future nested write might pick up.
        expect(asError(res).error.details.join(' ')).toContain(field);
      });

      it('leaves admin_profiles empty after a successful registration', async () => {
        await register();
        await expect(ctx.prisma.adminProfile.count()).resolves.toBe(0);
      });
    });

    it('reports every failed constraint in the §8 details list', async () => {
      const res = await new ApiClient(ctx.server)
        .post('/auth/register')
        .send({ email: 'not-an-email', password: 'short' })
        .expect(400);

      const body = asError(res);
      expect(body.success).toBe(false);
      expect(body.error.code).toBe('VALIDATION_ERROR');
      expect(body.error.details.length).toBeGreaterThan(1);
      expect(body.error.correlationId).toMatch(/^[0-9a-f-]{36}$/);
    });
  });

  // ==========================================================================
  // Verify email
  // ==========================================================================

  describe('POST /auth/verify-email', () => {
    it('moves PENDING_VERIFICATION → PENDING_PROFILE and stamps emailVerifiedAt', async () => {
      const user = await register();

      const res = await new ApiClient(ctx.server)
        .post('/auth/verify-email')
        .send({ token: verificationTokenFor(user.id) })
        .expect(200);

      expect(asJson<{ status: UserStatus }>(res).status).toBe(
        UserStatus.PENDING_PROFILE,
      );

      const row = await ctx.prisma.user.findUniqueOrThrow({
        where: { id: user.id },
        select: { status: true, emailVerifiedAt: true },
      });
      expect(row.status).toBe(UserStatus.PENDING_PROFILE);
      expect(row.emailVerifiedAt).not.toBeNull();
    });

    it('rejects a second click on the same link with 409', async () => {
      const user = await verifiedUser();

      const res = await new ApiClient(ctx.server)
        .post('/auth/verify-email')
        .send({ token: verificationTokenFor(user.id) })
        .expect(409);

      expect(asError(res).error.code).toBe('EMAIL_ALREADY_VERIFIED');
    });

    it('refuses an access token presented as a verification token', async () => {
      // The separate EMAIL_VERIFICATION_SECRET is what makes this impossible:
      // neither kind of token can ever be replayed as the other.
      const { session } = await loggedInUser();

      const res = await new ApiClient(ctx.server)
        .post('/auth/verify-email')
        .send({ token: session.accessToken })
        .expect(400);

      expect(asError(res).error.code).toBe('INVALID_VERIFICATION_TOKEN');
    });

    it('refuses a token signed with the wrong key', async () => {
      const user = await register();
      const forged = new JwtService({ secret: 'not-the-real-secret' }).sign({
        sub: user.id,
        typ: 'email_verify',
      });

      const res = await new ApiClient(ctx.server)
        .post('/auth/verify-email')
        .send({ token: forged })
        .expect(400);

      expect(asError(res).error.code).toBe('INVALID_VERIFICATION_TOKEN');
    });
  });

  // ==========================================================================
  // Login
  // ==========================================================================

  describe('POST /auth/login', () => {
    it('refuses an unverified account with EMAIL_NOT_VERIFIED', async () => {
      const user = await register();

      const res = await new ApiClient(ctx.server)
        .post('/auth/login')
        .send({ email: user.email, password: user.password })
        .expect(403);

      expect(asError(res).error.code).toBe('EMAIL_NOT_VERIFIED');
    });

    it('answers a wrong password and an unknown email identically', async () => {
      const user = await verifiedUser();

      const wrongPassword = await new ApiClient(ctx.server)
        .post('/auth/login')
        .send({ email: user.email, password: 'definitely not the password' })
        .expect(401);

      const unknownEmail = await new ApiClient(ctx.server)
        .post('/auth/login')
        .send({ email: uniqueEmail(SUITE, 'ghost'), password: user.password })
        .expect(401);

      expect(asError(wrongPassword).error.code).toBe('INVALID_CREDENTIALS');
      // Byte-identical apart from the per-request correlation id: nothing here
      // says whether the account exists (§9).
      expect({ ...asError(wrongPassword).error, correlationId: '' }).toEqual({
        ...asError(unknownEmail).error,
        correlationId: '',
      });
      expect(setCookieLines(wrongPassword)).toEqual(
        setCookieLines(unknownEmail),
      );
    });

    it('refuses a suspended account with ACCOUNT_SUSPENDED', async () => {
      const user = await verifiedUser();
      await ctx.prisma.user.update({
        where: { id: user.id },
        data: { status: UserStatus.SUSPENDED },
      });

      const res = await new ApiClient(ctx.server)
        .post('/auth/login')
        .send({ email: user.email, password: user.password })
        .expect(403);

      expect(asError(res).error.code).toBe('ACCOUNT_SUSPENDED');
    });

    it('issues an access token carrying exactly sub, role and status', async () => {
      const { user, session } = await loggedInUser();

      const claims = jwt.verify<Record<string, unknown>>(session.accessToken);
      expect(Object.keys(claims).sort()).toEqual([
        'exp',
        'iat',
        'role',
        'status',
        'sub',
      ]);
      expect(claims.sub).toBe(user.id);
      expect(claims.status).toBe(UserStatus.PENDING_PROFILE);
      expect(Number(claims.exp) - Number(claims.iat)).toBe(15 * 60);
      expect(session.expiresIn).toBe(15 * 60);
    });

    it('never puts the refresh token in the body, only in the cookie', async () => {
      const { session, refreshToken } = await loggedInUser();

      expect(Object.keys(session).sort()).toEqual(['accessToken', 'expiresIn']);
      expect(JSON.stringify(session)).not.toContain(refreshToken);
    });

    it('sets the refresh cookie with every §9 attribute', async () => {
      const user = await verifiedUser();
      const res = await new ApiClient(ctx.server)
        .post('/auth/login')
        .send({ email: user.email, password: user.password })
        .expect(200);

      const cookie = refreshSetCookie(res);
      expect(cookie).toContain('HttpOnly');
      expect(cookie).toContain('Secure');
      expect(cookie).toContain('SameSite=Strict');
      expect(cookie).toContain('Path=/api/v1/auth');
      expect(cookie).toContain(`Max-Age=${30 * 24 * 60 * 60}`);
    });

    it('is an opaque token stored only as a SHA-256 hash', async () => {
      const { user, refreshToken } = await loggedInUser();

      expect(refreshToken).not.toContain('.'); // not a JWT
      expect(refreshToken).toMatch(/^[A-Za-z0-9_-]{43}$/);

      const rows = await ctx.prisma.refreshToken.findMany({
        where: { userId: user.id },
      });
      expect(rows).toHaveLength(1);
      expect(rows[0].tokenHash).toBe(sha256(refreshToken));
      // A database leak must not hand over live sessions.
      expect(JSON.stringify(rows)).not.toContain(refreshToken);
    });

    it('starts a new token family per login', async () => {
      const { user, refreshToken } = await loggedInUser();
      const second = await new ApiClient(ctx.server)
        .post('/auth/login')
        .send({ email: user.email, password: PASSWORD })
        .expect(200);

      const rows = await ctx.prisma.refreshToken.findMany({
        where: { userId: user.id },
      });
      const families = new Set(rows.map((r) => r.familyId));
      expect(rows).toHaveLength(2);
      expect(families.size).toBe(2);
      expect(refreshCookieValue(second)).not.toBe(refreshToken);
    });
  });

  // ==========================================================================
  // Refresh — rotation and the breach tripwire
  // ==========================================================================

  describe('POST /auth/refresh', () => {
    it('rotates the token, keeping the successor in the same family', async () => {
      const { user, refreshToken } = await loggedInUser();

      const res = await new ApiClient(ctx.server)
        .post('/auth/refresh')
        .set('Cookie', cookieHeader(refreshToken))
        .expect(200);

      const rotated = refreshCookieValue(res);
      expect(rotated).not.toBe(refreshToken);

      const rows = await ctx.prisma.refreshToken.findMany({
        where: { userId: user.id },
        orderBy: { createdAt: 'asc' },
      });
      expect(rows).toHaveLength(2);
      expect(rows[0].tokenHash).toBe(sha256(refreshToken));
      expect(rows[0].revokedAt).not.toBeNull(); // the presented one is spent
      expect(rows[1].tokenHash).toBe(sha256(rotated));
      expect(rows[1].revokedAt).toBeNull();
      expect(rows[1].familyId).toBe(rows[0].familyId);
    });

    it('issues a working access token on rotation', async () => {
      const { user, refreshToken } = await loggedInUser();

      const res = await new ApiClient(ctx.server)
        .post('/auth/refresh')
        .set('Cookie', cookieHeader(refreshToken))
        .expect(200);

      const claims = jwt.verify<{ sub: string }>(
        asJson<SessionBody>(res).accessToken,
      );
      expect(claims.sub).toBe(user.id);
    });

    it('revokes the WHOLE family when a rotated token is replayed', async () => {
      const { user, refreshToken } = await loggedInUser();
      const rotated = refreshCookieValue(
        await new ApiClient(ctx.server)
          .post('/auth/refresh')
          .set('Cookie', cookieHeader(refreshToken))
          .expect(200),
      );

      // The stolen copy comes back. This is the §9 breach tripwire.
      const replay = await new ApiClient(ctx.server)
        .post('/auth/refresh')
        .set('Cookie', cookieHeader(refreshToken))
        .expect(401);

      expect(asError(replay).error.code).toBe('INVALID_REFRESH_TOKEN');

      const rows = await ctx.prisma.refreshToken.findMany({
        where: { userId: user.id },
      });
      expect(rows).toHaveLength(2);
      expect(rows.every((r) => r.revokedAt !== null)).toBe(true);

      // The legitimate successor dies with the family — the real user is
      // logged out, which is the point: their token is compromised.
      const successor = await new ApiClient(ctx.server)
        .post('/auth/refresh')
        .set('Cookie', cookieHeader(rotated))
        .expect(401);
      expect(asError(successor).error.code).toBe('INVALID_REFRESH_TOKEN');
    });

    it('logs the reuse with the family and user, and never the token', async () => {
      const { user, refreshToken } = await loggedInUser();
      await new ApiClient(ctx.server)
        .post('/auth/refresh')
        .set('Cookie', cookieHeader(refreshToken))
        .expect(200);

      // Only lines written by THIS replay: earlier tests trip the tripwire too,
      // and the whole-buffer search would find their warning instead.
      const from = ctx.logs.length;
      await new ApiClient(ctx.server)
        .post('/auth/refresh')
        .set('Cookie', cookieHeader(refreshToken))
        .expect(401);

      const warning = ctx.logs
        .slice(from)
        .find(
          (l) =>
            l.level === 'warn' &&
            l.message.includes('Refresh token reuse detected'),
        );
      expect(warning).toBeDefined();
      expect(warning?.message).toContain(user.id);
      expect(warning?.message).not.toContain(refreshToken);
    });

    it('answers an unknown token exactly like a missing one', async () => {
      const unknown = await new ApiClient(ctx.server)
        .post('/auth/refresh')
        .set('Cookie', cookieHeader('a'.repeat(43)))
        .expect(401);

      const missing = await new ApiClient(ctx.server)
        .post('/auth/refresh')
        .expect(401);

      expect(asError(unknown).error.code).toBe('INVALID_REFRESH_TOKEN');
      expect({ ...asError(unknown).error, correlationId: '' }).toEqual({
        ...asError(missing).error,
        correlationId: '',
      });
    });

    it('rejects an expired token without revoking the family', async () => {
      const { user, refreshToken } = await loggedInUser();
      await ctx.prisma.refreshToken.update({
        where: { tokenHash: sha256(refreshToken) },
        data: { expiresAt: new Date(Date.now() - 1000) },
      });

      const res = await new ApiClient(ctx.server)
        .post('/auth/refresh')
        .set('Cookie', cookieHeader(refreshToken))
        .expect(401);

      expect(asError(res).error.code).toBe('INVALID_REFRESH_TOKEN');
      // Expiry is not evidence of theft, so revokedAt stays null.
      const row = await ctx.prisma.refreshToken.findFirstOrThrow({
        where: { userId: user.id },
      });
      expect(row.revokedAt).toBeNull();
    });

    it('enforces a suspension that happened mid-session, and kills the family', async () => {
      const { user, refreshToken } = await loggedInUser();
      await ctx.prisma.user.update({
        where: { id: user.id },
        data: { status: UserStatus.SUSPENDED },
      });

      const res = await new ApiClient(ctx.server)
        .post('/auth/refresh')
        .set('Cookie', cookieHeader(refreshToken))
        .expect(403);

      expect(asError(res).error.code).toBe('ACCOUNT_SUSPENDED');
      const rows = await ctx.prisma.refreshToken.findMany({
        where: { userId: user.id },
      });
      expect(rows.every((r) => r.revokedAt !== null)).toBe(true);
    });
  });

  // ==========================================================================
  // Logout
  // ==========================================================================

  describe('POST /auth/logout', () => {
    it('returns 204, clears the cookie with matching attributes, and kills the session', async () => {
      const { session, refreshToken } = await loggedInUser();

      const res = await new ApiClient(ctx.server)
        .post('/auth/logout')
        .set('Authorization', `Bearer ${session.accessToken}`)
        .set('Cookie', cookieHeader(refreshToken))
        .expect(204);

      const cleared = refreshSetCookie(res);
      // A mismatched Path leaves the original cookie sitting in the browser.
      expect(cleared).toContain('Path=/api/v1/auth');
      expect(cleared).toContain('HttpOnly');
      expect(cleared).toContain('SameSite=Strict');

      await new ApiClient(ctx.server)
        .post('/auth/refresh')
        .set('Cookie', cookieHeader(refreshToken))
        .expect(401);
    });

    it('revokes only the family it was called with', async () => {
      const { user, session, refreshToken } = await loggedInUser();

      // A second device.
      const other = refreshCookieValue(
        await new ApiClient(ctx.server)
          .post('/auth/login')
          .send({ email: user.email, password: PASSWORD })
          .expect(200),
      );

      await new ApiClient(ctx.server)
        .post('/auth/logout')
        .set('Authorization', `Bearer ${session.accessToken}`)
        .set('Cookie', cookieHeader(refreshToken))
        .expect(204);

      // The other device is untouched.
      await new ApiClient(ctx.server)
        .post('/auth/refresh')
        .set('Cookie', cookieHeader(other))
        .expect(200);
    });

    it('needs authentication — it is not a @Public() route', async () => {
      const { refreshToken } = await loggedInUser();

      const res = await new ApiClient(ctx.server)
        .post('/auth/logout')
        .set('Cookie', cookieHeader(refreshToken))
        .expect(401);

      expect(asError(res).error.code).toBe('UNAUTHORIZED');
    });

    it('will not let one user revoke another user’s family', async () => {
      const victim = await loggedInUser();
      const attacker = await loggedInUser();

      await new ApiClient(ctx.server)
        .post('/auth/logout')
        .set('Authorization', `Bearer ${attacker.session.accessToken}`)
        .set('Cookie', cookieHeader(victim.refreshToken))
        .expect(204);

      // Silently a no-op — and the victim's session still works.
      await new ApiClient(ctx.server)
        .post('/auth/refresh')
        .set('Cookie', cookieHeader(victim.refreshToken))
        .expect(200);
    });
  });

  // ==========================================================================
  // Me
  // ==========================================================================

  describe('GET /auth/me', () => {
    it('returns the caller’s own record without passwordHash or phone', async () => {
      const { user, session } = await loggedInUser({ phone: '+201001234567' });

      const res = await new ApiClient(ctx.server)
        .get('/auth/me')
        .set('Authorization', `Bearer ${session.accessToken}`)
        .expect(200);

      const body = asJson<Record<string, unknown>>(res);
      expect(body.id).toBe(user.id);
      expect(body.email).toBe(user.email); // the one endpoint that may return it
      expect(body).not.toHaveProperty('passwordHash');
      expect(body).not.toHaveProperty('phone');
    });

    it('reads identity from the token only, never from the request', async () => {
      const { session } = await loggedInUser();
      const other = await loggedInUser();

      const res = await new ApiClient(ctx.server)
        .get(`/auth/me?sub=${other.user.id}&userId=${other.user.id}`)
        .set('Authorization', `Bearer ${session.accessToken}`)
        .set('X-User-Id', other.user.id)
        .expect(200);

      expect(asJson<{ id: string }>(res).id).not.toBe(other.user.id);
    });

    it('401s when the token is valid but the user is gone', async () => {
      const { user, session } = await loggedInUser();
      await ctx.prisma.user.delete({ where: { id: user.id } });

      const res = await new ApiClient(ctx.server)
        .get('/auth/me')
        .set('Authorization', `Bearer ${session.accessToken}`)
        .expect(401);

      expect(asError(res).error.code).toBe('UNAUTHORIZED');
    });
  });

  // ==========================================================================
  // §9: never log tokens, password hashes or cookies
  // ==========================================================================

  describe('logging', () => {
    it('leaks no credential into any log line', async () => {
      const { session, refreshToken } = await loggedInUser();
      const rotated = refreshCookieValue(
        await new ApiClient(ctx.server)
          .post('/auth/refresh')
          .set('Cookie', cookieHeader(refreshToken))
          .expect(200),
      );

      const everything = ctx.logs.map((l) => l.message).join('\n');
      expect(everything).not.toContain(refreshToken);
      expect(everything).not.toContain(rotated);
      expect(everything).not.toContain(session.accessToken);
      expect(everything).not.toContain(PASSWORD);
      expect(everything).not.toContain('$2b$12$');
      expect(everything).not.toContain('Set-Cookie');
    });

    it('confines the dev-only verification token to debug level', () => {
      const tokenLines = ctx.logs.filter((l) =>
        l.message.includes('verification token for'),
      );

      // The single deliberate exception to §9, and it is guarded by
      // NODE_ENV !== 'production'. Anything above debug would be a real leak.
      expect(tokenLines.length).toBeGreaterThan(0);
      expect(tokenLines.every((l) => l.level === 'debug')).toBe(true);
    });
  });
});
