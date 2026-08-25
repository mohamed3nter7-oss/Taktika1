import { JwtService } from '@nestjs/jwt';
import {
  AnalystType,
  CoachType,
  Gender,
  LeagueLevel,
  PlayerPosition,
  PreferredFoot,
  UserRole,
  UserStatus,
} from '../src/generated/prisma/client';
import {
  ApiClient,
  asError,
  asJson,
  clearE2eUsers,
  clearReferenceData,
  createE2eApp,
  seedReferenceData,
  uniqueEmail,
  type E2eContext,
  type ReferenceData,
} from './support/e2e';

/**
 * FR-PROF-1 / FR-PROF-2 and registration step 2 (FR-AUTH-2), against the real
 * database.
 *
 * Every assertion here reads the BODY OF A LIVE RESPONSE. None is written from
 * a DTO, a Swagger decorator or a doc comment — a `{ items }` / `{ data }`
 * mismatch once survived review precisely because a comment asserting
 * conformance was read as evidence of it, and a test written from that comment
 * would have gone green on the wrong contract.
 */

const SUITE = 'profiles';
const COUNTRY_CODE = 'ZP';
const FOREIGN_COUNTRY_CODE = 'ZQ';

/** Every key at every depth, so "absent" can mean absent, not merely unequal. */
function allKeys(value: unknown, acc = new Set<string>()): Set<string> {
  if (Array.isArray(value)) {
    for (const v of value) allKeys(v, acc);
    return acc;
  }
  if (value !== null && typeof value === 'object') {
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      acc.add(k);
      allKeys(v, acc);
    }
  }
  return acc;
}

interface Fixture {
  id: string;
  email: string;
  token: string;
}

describe('Profiles (e2e, real Postgres)', () => {
  let ctx: E2eContext;
  let ref: ReferenceData;
  let jwt: JwtService;
  let clubId: number;
  /** A city in a DIFFERENT country, for a genuine cross-country pair. */
  let foreignCityId: number;

  /**
   * Born 30 years and 6 months ago: the birthday is half a year past, so the
   * computed age is 30 under any timezone reading of a DATE column. A date of
   * birth near today's month and day would make this assertion flap.
   */
  const DOB_AGE = 30;
  const dob = (() => {
    const now = new Date();
    return new Date(
      Date.UTC(now.getUTCFullYear() - DOB_AGE, now.getUTCMonth() - 6, 15),
    );
  })();

  const tokenFor = (sub: string, role: UserRole, status: UserStatus) =>
    jwt.sign({ sub, role, status });

  const client = () => new ApiClient(ctx.server);

  const authed = (path: string, token: string) =>
    client().get(path).set('Authorization', `Bearer ${token}`);

  /**
   * Inserted directly rather than through /auth/register: this suite is about
   * profiles, and a bcrypt cost-12 hash per fixture would dominate its runtime
   * without exercising anything under test here.
   */
  async function userWith(
    role: UserRole,
    status: UserStatus = UserStatus.PENDING_PROFILE,
  ): Promise<Fixture> {
    const user = await ctx.prisma.user.create({
      data: {
        email: uniqueEmail(SUITE, role.toLowerCase()),
        passwordHash: '$2b$12$not.used.by.this.suite',
        fullName: 'Profile Fixture',
        role,
        dateOfBirth: dob,
        countryId: ref.countryId,
        cityId: ref.cityId,
        gender: Gender.MALE,
        phone: '+201005554433',
        status,
      },
      select: { id: true, email: true },
    });
    return { ...user, token: tokenFor(user.id, role, status) };
  }

  const complete = (token: string, body: object) =>
    client()
      .post('/auth/register/profile')
      .set('Authorization', `Bearer ${token}`)
      .send(body);

  /** Completes a profile and returns a token carrying the resulting ACTIVE. */
  async function activated(role: UserRole, block: object): Promise<Fixture> {
    const user = await userWith(role);
    await complete(user.token, block).expect(201);
    return { ...user, token: tokenFor(user.id, role, UserStatus.ACTIVE) };
  }

  beforeAll(async () => {
    ctx = await createE2eApp();
    jwt = ctx.app.get(JwtService);

    await clearE2eUsers(ctx.prisma, SUITE);
    await clearReferenceData(ctx.prisma, COUNTRY_CODE);
    await clearReferenceData(ctx.prisma, FOREIGN_COUNTRY_CODE);

    ref = await seedReferenceData(ctx.prisma, COUNTRY_CODE);

    const club = await ctx.prisma.club.create({
      data: { nameEn: 'ZP Alpha FC', countryId: ref.countryId },
      select: { id: true },
    });
    clubId = club.id;

    const foreign = await seedReferenceData(ctx.prisma, FOREIGN_COUNTRY_CODE);
    foreignCityId = foreign.cityId;
  });

  afterAll(async () => {
    // Users FIRST: a club_admin_profiles row references a club, and the club
    // delete inside clearReferenceData is onDelete: Restrict.
    await clearE2eUsers(ctx.prisma, SUITE);
    await clearReferenceData(ctx.prisma, COUNTRY_CODE);
    await clearReferenceData(ctx.prisma, FOREIGN_COUNTRY_CODE);
    await ctx.close();
  });

  // ==========================================================================
  // Registration step 2 — POST /auth/register/profile (FR-AUTH-2)
  // ==========================================================================

  describe('POST /auth/register/profile', () => {
    it('creates the PLAYER row and flips the account ACTIVE', async () => {
      const user = await userWith(UserRole.PLAYER);

      const res = await complete(user.token, {
        player: {
          primaryPosition: PlayerPosition.STRIKER,
          secondaryPosition: PlayerPosition.LEFT_WINGER,
          preferredFoot: PreferredFoot.RIGHT,
          leagueLevel: LeagueLevel.PREMIER,
          heightCm: 181,
        },
      }).expect(201);

      expect(res.body).toMatchObject({
        status: 'ACTIVE',
        profile: {
          primaryPosition: 'STRIKER',
          secondaryPosition: 'LEFT_WINGER',
          preferredFoot: 'RIGHT',
          leagueLevel: 'PREMIER',
          heightCm: 181,
        },
      });

      // The transition is real, not merely reported.
      await expect(
        ctx.prisma.user.findUnique({
          where: { id: user.id },
          select: { status: true },
        }),
      ).resolves.toEqual({ status: UserStatus.ACTIVE });
    });

    it('creates the COACH row with its own field set', async () => {
      const user = await userWith(UserRole.COACH);

      const res = await complete(user.token, {
        coach: {
          coachType: CoachType.HEAD,
          yearsExperience: 9,
          preferredFormation: '4-2-3-1',
        },
      }).expect(201);

      expect(res.body).toMatchObject({
        status: 'ACTIVE',
        profile: {
          coachType: 'HEAD',
          yearsExperience: 9,
          preferredFormation: '4-2-3-1',
        },
      });
    });

    it('creates the ANALYST row with its own field set', async () => {
      const user = await userWith(UserRole.ANALYST);

      const res = await complete(user.token, {
        analyst: {
          analystType: AnalystType.DATA,
          toolsUsed: 'Python, Tableau',
          yearsExperience: 4,
        },
      }).expect(201);

      expect(res.body).toMatchObject({
        status: 'ACTIVE',
        profile: {
          analystType: 'DATA',
          toolsUsed: 'Python, Tableau',
          yearsExperience: 4,
        },
      });
    });

    it('rejects a block that is not the caller role with ROLE_MISMATCH', async () => {
      const user = await userWith(UserRole.PLAYER);

      const res = await complete(user.token, {
        coach: { coachType: CoachType.HEAD },
      }).expect(400);

      expect(asError(res).error.code).toBe('ROLE_MISMATCH');

      // Rejected before any write: no coach row, and the account stays pending.
      await expect(
        ctx.prisma.coachProfile.count({ where: { userId: user.id } }),
      ).resolves.toBe(0);
      await expect(
        ctx.prisma.user.findUnique({
          where: { id: user.id },
          select: { status: true },
        }),
      ).resolves.toEqual({ status: UserStatus.PENDING_PROFILE });
    });

    it('rejects an empty body with ROLE_MISMATCH', async () => {
      const user = await userWith(UserRole.PLAYER);

      const res = await complete(user.token, {}).expect(400);

      expect(asError(res).error.code).toBe('ROLE_MISMATCH');
    });

    it('rejects a second completion with PROFILE_ALREADY_COMPLETED', async () => {
      const user = await userWith(UserRole.COACH);
      const body = { coach: { coachType: CoachType.ASSISTANT } };

      await complete(user.token, body).expect(201);
      const res = await complete(user.token, body).expect(409);

      expect(asError(res).error.code).toBe('PROFILE_ALREADY_COMPLETED');
    });

    it('rejects a club that already has an administrator', async () => {
      const first = await userWith(UserRole.CLUB_ADMIN);
      const second = await userWith(UserRole.CLUB_ADMIN);

      await complete(first.token, {
        clubAdmin: { clubId, positionTitle: 'Sporting Director' },
      }).expect(201);

      const res = await complete(second.token, { clubAdmin: { clubId } }).expect(
        409,
      );

      expect(asError(res).error.code).toBe('CLUB_ALREADY_MANAGED');

      // The loser must NOT have been flipped ACTIVE with no role row — that is
      // the branch recoverCompletion exists to keep apart.
      await expect(
        ctx.prisma.user.findUnique({
          where: { id: second.id },
          select: { status: true },
        }),
      ).resolves.toEqual({ status: UserStatus.PENDING_PROFILE });
    });

    /**
     * The caller's OWN account is suspended, so 403 is correct and is NOT a
     * breach of the 404 rule: that rule conceals somebody else's resource.
     * Telling callers their own account is suspended reveals nothing they do
     * not already have.
     */
    it('returns 403 ACCOUNT_SUSPENDED for the caller own suspended account', async () => {
      const user = await userWith(UserRole.COACH, UserStatus.SUSPENDED);
      // Token minted PENDING_PROFILE so ProfileCompleteGuard lets it reach the
      // service; the database is the thing that says SUSPENDED.
      const token = tokenFor(user.id, UserRole.COACH, UserStatus.PENDING_PROFILE);

      const res = await complete(token, {
        coach: { coachType: CoachType.YOUTH },
      }).expect(403);

      expect(asError(res).error.code).toBe('ACCOUNT_SUSPENDED');

      // The role row created inside the transaction was rolled back.
      await expect(
        ctx.prisma.coachProfile.count({ where: { userId: user.id } }),
      ).resolves.toBe(0);
    });

    it('rejects a secondaryPosition equal to the primary', async () => {
      const user = await userWith(UserRole.PLAYER);

      const res = await complete(user.token, {
        player: {
          primaryPosition: PlayerPosition.STRIKER,
          secondaryPosition: PlayerPosition.STRIKER,
          preferredFoot: PreferredFoot.LEFT,
          leagueLevel: LeagueLevel.AMATEUR,
        },
      }).expect(400);

      expect(asError(res).error.code).toBe('VALIDATION_ERROR');
    });
  });

  // ==========================================================================
  // GET /users/:id — the public profile (FR-PROF-1)
  // ==========================================================================

  describe('GET /users/:id', () => {
    let subject: Fixture;
    let viewer: Fixture;

    beforeAll(async () => {
      subject = await activated(UserRole.PLAYER, {
        player: {
          primaryPosition: PlayerPosition.GOALKEEPER,
          preferredFoot: PreferredFoot.BOTH,
          leagueLevel: LeagueLevel.SECOND_DIVISION,
        },
      });
      viewer = await userWith(UserRole.SCOUT, UserStatus.ACTIVE);
    });

    it('returns a computed integer age', async () => {
      const res = await authed(`/users/${subject.id}`, viewer.token).expect(200);
      const body = asJson<{ age: unknown }>(res);

      expect(body.age).toBe(DOB_AGE);
      expect(Number.isInteger(body.age)).toBe(true);
    });

    it('does not carry dateOfBirth anywhere in the body', async () => {
      const res = await authed(`/users/${subject.id}`, viewer.token).expect(200);

      // Absent, not merely different: a nested null would still disclose the
      // field, and a wrong value would still be a birth date on the wire.
      expect([...allKeys(res.body)]).not.toContain('dateOfBirth');
      expect(JSON.stringify(res.body)).not.toContain('dateOfBirth');
    });

    it('does not carry email, phone, passwordHash or status', async () => {
      const res = await authed(`/users/${subject.id}`, viewer.token).expect(200);
      const keys = [...allKeys(res.body)];

      for (const forbidden of ['email', 'phone', 'passwordHash', 'status']) {
        expect(keys).not.toContain(forbidden);
      }
    });

    it('returns the PLAYER role block and no other role block', async () => {
      const res = await authed(`/users/${subject.id}`, viewer.token).expect(200);
      const body = asJson<{ role: string; profile: Record<string, unknown> }>(
        res,
      );

      expect(body.role).toBe('PLAYER');
      expect(body.profile).toMatchObject({
        primaryPosition: 'GOALKEEPER',
        preferredFoot: 'BOTH',
        leagueLevel: 'SECOND_DIVISION',
      });
      expect(Object.keys(body.profile)).not.toContain('coachType');
    });

    it('returns the COACH role block for a coach', async () => {
      const coach = await activated(UserRole.COACH, {
        coach: { coachType: CoachType.GOALKEEPING },
      });

      const res = await authed(`/users/${coach.id}`, viewer.token).expect(200);
      const body = asJson<{ role: string; profile: Record<string, unknown> }>(
        res,
      );

      expect(body.role).toBe('COACH');
      expect(body.profile).toMatchObject({ coachType: 'GOALKEEPING' });
      expect(Object.keys(body.profile)).not.toContain('primaryPosition');
    });

    it('returns the ANALYST role block for an analyst', async () => {
      const analyst = await activated(UserRole.ANALYST, {
        analyst: { analystType: AnalystType.TACTICAL },
      });

      const res = await authed(`/users/${analyst.id}`, viewer.token).expect(200);
      const body = asJson<{ role: string; profile: Record<string, unknown> }>(
        res,
      );

      expect(body.role).toBe('ANALYST');
      expect(body.profile).toMatchObject({ analystType: 'TACTICAL' });
      expect(Object.keys(body.profile)).not.toContain('coachType');
    });

    it('marks the caller own profile with viewer.isSelf', async () => {
      const own = await authed(`/users/${subject.id}`, subject.token).expect(200);
      expect(asJson<{ viewer: unknown }>(own).viewer).toEqual({ isSelf: true });

      const foreign = await authed(`/users/${subject.id}`, viewer.token).expect(
        200,
      );
      expect(asJson<{ viewer: unknown }>(foreign).viewer).toEqual({
        isSelf: false,
      });
    });

    it('404s a suspended user rather than 403 — existence must not leak', async () => {
      const suspended = await userWith(UserRole.COACH, UserStatus.SUSPENDED);

      const res = await authed(`/users/${suspended.id}`, viewer.token);

      expect(res.status).toBe(404);
      expect(res.status).not.toBe(403);
      expect(asError(res).error.code).toBe('NOT_FOUND');
    });

    it('404s a user who has not completed their profile', async () => {
      const pending = await userWith(UserRole.SCOUT);

      await authed(`/users/${pending.id}`, viewer.token).expect(404);
    });

    it('404s an id that belongs to nobody', async () => {
      await authed(
        '/users/00000000-0000-4000-8000-000000000000',
        viewer.token,
      ).expect(404);
    });
  });

  // ==========================================================================
  // PATCH /users/me (FR-PROF-2)
  // ==========================================================================

  describe('PATCH /users/me', () => {
    let user: Fixture;

    beforeAll(async () => {
      user = await userWith(UserRole.SCOUT, UserStatus.ACTIVE);
    });

    const patch = (token: string, body: object) =>
      client()
        .patch('/users/me')
        .set('Authorization', `Bearer ${token}`)
        .send(body);

    it('updates the caller own headline', async () => {
      const res = await patch(user.token, {
        headline: 'Scouting the Delta region',
      }).expect(200);

      expect(asJson<{ headline: string }>(res).headline).toBe(
        'Scouting the Delta region',
      );
    });

    it('rejects countryId without cityId', async () => {
      const res = await patch(user.token, { countryId: ref.countryId }).expect(
        400,
      );

      expect(asError(res).error.code).toBe('VALIDATION_ERROR');
    });

    it('rejects a city that belongs to another country', async () => {
      const res = await patch(user.token, {
        countryId: ref.countryId,
        cityId: foreignCityId,
      }).expect(400);

      expect(asError(res).error.code).toBe('VALIDATION_ERROR');

      // Nothing was written.
      await expect(
        ctx.prisma.user.findUnique({
          where: { id: user.id },
          select: { cityId: true },
        }),
      ).resolves.toEqual({ cityId: ref.cityId });
    });

    it('accepts a genuinely matching country and city pair', async () => {
      await patch(user.token, {
        countryId: ref.countryId,
        cityId: ref.cityId,
      }).expect(200);
    });

    it('rejects an undeclared field rather than silently dropping it', async () => {
      const res = await patch(user.token, {
        role: UserRole.CLUB_ADMIN,
      }).expect(400);

      expect(asError(res).error.code).toBe('VALIDATION_ERROR');
    });
  });

  // ==========================================================================
  // PATCH /users/me/profile — the merged-row invariant
  // ==========================================================================

  describe('PATCH /users/me/profile', () => {
    it('checks secondaryPosition against the STORED primary, not the patch', async () => {
      const player = await activated(UserRole.PLAYER, {
        player: {
          primaryPosition: PlayerPosition.CENTER_BACK,
          preferredFoot: PreferredFoot.LEFT,
          leagueLevel: LeagueLevel.PREMIER,
        },
      });

      // The patch alone looks fine — only the merged row is a conflict.
      const res = await client()
        .patch('/users/me/profile')
        .set('Authorization', `Bearer ${player.token}`)
        .send({ player: { secondaryPosition: PlayerPosition.CENTER_BACK } })
        .expect(400);

      expect(asError(res).error.code).toBe('VALIDATION_ERROR');
    });

    it('applies a legitimate patch to the caller own role block', async () => {
      const player = await activated(UserRole.PLAYER, {
        player: {
          primaryPosition: PlayerPosition.RIGHT_BACK,
          preferredFoot: PreferredFoot.RIGHT,
          leagueLevel: LeagueLevel.PREMIER,
        },
      });

      const res = await client()
        .patch('/users/me/profile')
        .set('Authorization', `Bearer ${player.token}`)
        .send({ player: { jerseyNumber: 2, heightCm: 176 } })
        .expect(200);

      expect(res.body).toMatchObject({ jerseyNumber: 2, heightCm: 176 });
    });

    it('rejects a role block that is not the caller own', async () => {
      const coach = await activated(UserRole.COACH, {
        coach: { coachType: CoachType.FITNESS },
      });

      const res = await client()
        .patch('/users/me/profile')
        .set('Authorization', `Bearer ${coach.token}`)
        .send({ player: { heightCm: 190 } })
        .expect(400);

      expect(asError(res).error.code).toBe('ROLE_MISMATCH');
    });
  });

  // ==========================================================================
  // ProfileCompleteGuard — the PENDING_PROFILE gate (§9)
  // ==========================================================================

  describe('ProfileCompleteGuard', () => {
    it('blocks a PENDING_PROFILE caller on a guarded profiles route', async () => {
      const pending = await userWith(UserRole.COACH);

      const res = await client()
        .patch('/users/me')
        .set('Authorization', `Bearer ${pending.token}`)
        .send({ headline: 'should never land' })
        .expect(403);

      expect(asError(res).error.code).toBe('PROFILE_INCOMPLETE');
    });

    it('blocks a PENDING_PROFILE caller on GET /users/:id too', async () => {
      const pending = await userWith(UserRole.COACH);

      const res = await authed(`/users/${pending.id}`, pending.token).expect(403);

      expect(asError(res).error.code).toBe('PROFILE_INCOMPLETE');
    });

    /**
     * The one exemption. If @AllowIncompleteProfile() ever came off this route,
     * registration would deadlock: the only way out of PENDING_PROFILE is the
     * endpoint the guard would then be blocking.
     */
    it('lets a PENDING_PROFILE caller through the one exempt route', async () => {
      const pending = await userWith(UserRole.ANALYST);

      await complete(pending.token, {
        analyst: { analystType: AnalystType.VIDEO },
      }).expect(201);
    });
  });
});
