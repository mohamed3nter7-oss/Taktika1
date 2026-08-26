import { JwtService } from '@nestjs/jwt';
import {
  ClubRole,
  Prisma,
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
 * FR-PROF-4 (certifications) and FR-PROF-5 (club affiliations), against the
 * real database.
 *
 * Two things this suite refuses to do:
 *
 * 1. Assert a shape a DTO or a doc comment claims. Every envelope assertion
 *    below reads a live response body. The `{ items }` / `{ data }` mismatch
 *    survived review because a comment asserting conformance was read as
 *    evidence of it; a test written from that comment would have gone green on
 *    the wrong contract.
 * 2. Assert an application guard clause where a database constraint is the
 *    real enforcement. AFFILIATION_ALREADY_OPEN is produced by the partial
 *    unique index `uq_affiliation_one_current_per_club`, so it is proved both
 *    through HTTP and by a direct write that bypasses the service entirely.
 */

const SUITE = 'career';
const COUNTRY_CODE = 'ZC';

interface Fixture {
  id: string;
  email: string;
  token: string;
}

/** The wire envelope, read from responses — never imported from the module. */
interface ListBody<T> {
  data: T[];
  nextCursor: string | null;
}

interface CertificationBody {
  id: string;
  name: string;
  issuer: string | null;
  issueDate: string | null;
  expiryDate: string | null;
  isVerified: boolean;
}

interface AffiliationBody {
  id: string;
  clubId: number;
  roleAtClub: string;
  startDate: string;
  endDate: string | null;
  isCurrent: boolean;
  club: { id: number; nameEn: string };
}

/** A date `days` before today, as the YYYY-MM-DD the DATE columns store. */
function daysAgo(days: number): string {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() - days);
  return d.toISOString().slice(0, 10);
}

function daysAhead(days: number): string {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

describe('Career (e2e, real Postgres)', () => {
  let ctx: E2eContext;
  let ref: ReferenceData;
  let jwt: JwtService;
  /** Several distinct clubs: the open-affiliation rule is per (user, club). */
  let clubs: number[];

  const client = () => new ApiClient(ctx.server);

  const tokenFor = (sub: string, status: UserStatus = UserStatus.ACTIVE) =>
    jwt.sign({ sub, role: UserRole.COACH, status });

  /**
   * Career is role-agnostic — every one of the six roles holds credentials and
   * club history — so every fixture here is a COACH and no role profile row is
   * created. Users are ACTIVE because ProfileCompleteGuard gates these routes
   * and `assertUserVisible` gates the public affiliation read.
   */
  async function activeUser(): Promise<Fixture> {
    const user = await ctx.prisma.user.create({
      data: {
        email: uniqueEmail(SUITE, 'career'),
        passwordHash: '$2b$12$not.used.by.this.suite',
        fullName: 'Career Fixture',
        role: UserRole.COACH,
        dateOfBirth: new Date('1992-03-04'),
        countryId: ref.countryId,
        cityId: ref.cityId,
        status: UserStatus.ACTIVE,
      },
      select: { id: true, email: true },
    });
    return { ...user, token: tokenFor(user.id) };
  }

  const get = (path: string, token: string) =>
    client().get(path).set('Authorization', `Bearer ${token}`);
  const post = (path: string, token: string, body: object) =>
    client().post(path).set('Authorization', `Bearer ${token}`).send(body);
  const patch = (path: string, token: string, body: object) =>
    client().patch(path).set('Authorization', `Bearer ${token}`).send(body);
  const del = (path: string, token: string) =>
    client().delete(path).set('Authorization', `Bearer ${token}`);

  beforeAll(async () => {
    ctx = await createE2eApp();
    jwt = ctx.app.get(JwtService);

    await clearE2eUsers(ctx.prisma, SUITE);
    await clearReferenceData(ctx.prisma, COUNTRY_CODE);
    ref = await seedReferenceData(ctx.prisma, COUNTRY_CODE);

    clubs = [];
    for (const name of ['ZC Alpha', 'ZC Beta', 'ZC Gamma', 'ZC Delta']) {
      const club = await ctx.prisma.club.create({
        data: { nameEn: `${name} FC`, countryId: ref.countryId },
        select: { id: true },
      });
      clubs.push(club.id);
    }
  });

  afterAll(async () => {
    // Users FIRST. clearReferenceData deletes clubs, and club_affiliations
    // references clubs with onDelete: Restrict — deleting the user cascades
    // the affiliation rows that would otherwise block it.
    await clearE2eUsers(ctx.prisma, SUITE);
    await clearReferenceData(ctx.prisma, COUNTRY_CODE);
    await ctx.close();
  });

  // ==========================================================================
  // Certifications (FR-PROF-4)
  // ==========================================================================

  describe('certifications', () => {
    it('creates one and returns it without a userId or timestamps', async () => {
      const user = await activeUser();

      const res = await post('/users/me/certifications', user.token, {
        name: 'UEFA B Licence',
        issuer: 'Egyptian Football Association',
        issueDate: '2021-07-01',
        expiryDate: '2026-07-01',
      }).expect(201);

      const body = asJson<CertificationBody>(res);
      expect(body).toMatchObject({
        name: 'UEFA B Licence',
        issuer: 'Egyptian Football Association',
        isVerified: false,
      });
      expect(body.id).toEqual(expect.any(String));
      expect(Object.keys(body)).not.toContain('userId');
      expect(Object.keys(body)).not.toContain('createdAt');
    });

    it('lists them in a { data, nextCursor } envelope', async () => {
      const user = await activeUser();
      await post('/users/me/certifications', user.token, {
        name: 'CAF A Licence',
      }).expect(201);

      const res = await get('/users/me/certifications', user.token).expect(200);
      const body = asJson<ListBody<CertificationBody>>(res);

      // Read off the live body, not off any declared type.
      expect(Object.keys(body).sort()).toEqual(['data', 'nextCursor']);
      expect(Array.isArray(body.data)).toBe(true);
      expect(body.data.map((c) => c.name)).toContain('CAF A Licence');
    });

    it('returns nextCursor null when the list is complete', async () => {
      const user = await activeUser();
      for (const name of ['One', 'Two', 'Three']) {
        await post('/users/me/certifications', user.token, { name }).expect(201);
      }

      const res = await get('/users/me/certifications', user.token).expect(200);
      const body = asJson<ListBody<CertificationBody>>(res);

      expect(body.data).toHaveLength(3);
      expect(body.nextCursor).toBeNull();
    });

    it('scopes the list to the caller and nobody else', async () => {
      const mine = await activeUser();
      const theirs = await activeUser();

      await post('/users/me/certifications', mine.token, {
        name: 'Mine Only',
      }).expect(201);
      await post('/users/me/certifications', theirs.token, {
        name: 'Theirs Only',
      }).expect(201);

      const res = await get('/users/me/certifications', mine.token).expect(200);
      const names = asJson<ListBody<CertificationBody>>(res).data.map(
        (c) => c.name,
      );

      expect(names).toContain('Mine Only');
      expect(names).not.toContain('Theirs Only');
    });

    it('rejects isVerified — it is admin-only, never client-set', async () => {
      const user = await activeUser();

      const res = await post('/users/me/certifications', user.token, {
        name: 'Self Certified',
        isVerified: true,
      }).expect(400);

      expect(asError(res).error.code).toBe('VALIDATION_ERROR');
    });

    it('rejects an expiryDate that is not later than the issueDate', async () => {
      const user = await activeUser();

      const res = await post('/users/me/certifications', user.token, {
        name: 'Backwards',
        issueDate: '2024-01-01',
        expiryDate: '2023-01-01',
      }).expect(400);

      expect(asError(res).error.code).toBe('VALIDATION_ERROR');
    });

    it('checks the date rule against the MERGED row on patch', async () => {
      const user = await activeUser();
      const created = await post('/users/me/certifications', user.token, {
        name: 'Merged Check',
        issueDate: '2024-01-01',
      }).expect(201);
      const id = asJson<CertificationBody>(created).id;

      // The patch carries only expiryDate; the conflict exists only against
      // the STORED issueDate.
      const res = await patch(`/users/me/certifications/${id}`, user.token, {
        expiryDate: '2023-06-01',
      }).expect(400);

      expect(asError(res).error.code).toBe('VALIDATION_ERROR');
    });

    it('updates the caller own row', async () => {
      const user = await activeUser();
      const created = await post('/users/me/certifications', user.token, {
        name: 'Before',
        issuer: 'Old Body',
      }).expect(201);
      const id = asJson<CertificationBody>(created).id;

      const res = await patch(`/users/me/certifications/${id}`, user.token, {
        name: 'After',
      }).expect(200);

      expect(asJson<CertificationBody>(res)).toMatchObject({
        id,
        name: 'After',
        issuer: 'Old Body',
      });
    });

    it('clears a nullable field with an explicit null', async () => {
      const user = await activeUser();
      const created = await post('/users/me/certifications', user.token, {
        name: 'Nullable',
        issuer: 'Somebody',
      }).expect(201);
      const id = asJson<CertificationBody>(created).id;

      const res = await patch(`/users/me/certifications/${id}`, user.token, {
        issuer: null,
      }).expect(200);

      expect(asJson<CertificationBody>(res).issuer).toBeNull();
    });

    it('deletes the caller own row and returns 204', async () => {
      const user = await activeUser();
      const created = await post('/users/me/certifications', user.token, {
        name: 'Doomed',
      }).expect(201);
      const id = asJson<CertificationBody>(created).id;

      await del(`/users/me/certifications/${id}`, user.token).expect(204);

      await expect(
        ctx.prisma.certification.count({ where: { id } }),
      ).resolves.toBe(0);
    });

    // ------------------------------------------------------------------
    // Ownership: somebody else's row is indistinguishable from no row.
    // ------------------------------------------------------------------

    it('404s on updating another user certification, never 403', async () => {
      const owner = await activeUser();
      const stranger = await activeUser();
      const created = await post('/users/me/certifications', owner.token, {
        name: 'Not Yours',
      }).expect(201);
      const id = asJson<CertificationBody>(created).id;

      const res = await patch(`/users/me/certifications/${id}`, stranger.token, {
        name: 'Hijacked',
      });

      expect(res.status).toBe(404);
      expect(res.status).not.toBe(403);
      expect(asError(res).error.code).toBe('NOT_FOUND');

      // And the row is untouched.
      await expect(
        ctx.prisma.certification.findUnique({
          where: { id },
          select: { name: true },
        }),
      ).resolves.toEqual({ name: 'Not Yours' });
    });

    it('404s on deleting another user certification, never 403', async () => {
      const owner = await activeUser();
      const stranger = await activeUser();
      const created = await post('/users/me/certifications', owner.token, {
        name: 'Also Not Yours',
      }).expect(201);
      const id = asJson<CertificationBody>(created).id;

      const res = await del(`/users/me/certifications/${id}`, stranger.token);

      expect(res.status).toBe(404);
      expect(res.status).not.toBe(403);

      await expect(
        ctx.prisma.certification.count({ where: { id } }),
      ).resolves.toBe(1);
    });

    it('404s a certification id that belongs to nobody', async () => {
      const user = await activeUser();

      await del(
        '/users/me/certifications/00000000-0000-4000-8000-000000000000',
        user.token,
      ).expect(404);
    });
  });

  // ==========================================================================
  // Club affiliations (FR-PROF-5)
  // ==========================================================================

  describe('affiliations', () => {
    it('creates one and derives isCurrent from a null endDate', async () => {
      const user = await activeUser();

      const res = await post('/users/me/affiliations', user.token, {
        clubId: clubs[0],
        roleAtClub: ClubRole.COACH,
        startDate: daysAgo(400),
      }).expect(201);

      const body = asJson<AffiliationBody>(res);
      expect(body).toMatchObject({
        clubId: clubs[0],
        roleAtClub: 'COACH',
        endDate: null,
        isCurrent: true,
      });
      // The club is joined as an entity, never flattened to a name string.
      expect(body.club).toMatchObject({ id: clubs[0] });
    });

    it('derives isCurrent false once an endDate exists', async () => {
      const user = await activeUser();

      const res = await post('/users/me/affiliations', user.token, {
        clubId: clubs[0],
        roleAtClub: ClubRole.PLAYER,
        startDate: daysAgo(800),
        endDate: daysAgo(400),
      }).expect(201);

      expect(asJson<AffiliationBody>(res).isCurrent).toBe(false);
    });

    it('rejects a client-supplied isCurrent — it is derived, never stored', async () => {
      const user = await activeUser();

      const res = await post('/users/me/affiliations', user.token, {
        clubId: clubs[0],
        roleAtClub: ClubRole.STAFF,
        startDate: daysAgo(10),
        isCurrent: true,
      }).expect(400);

      expect(asError(res).error.code).toBe('VALIDATION_ERROR');
    });

    it('rejects a free-text club name', async () => {
      const user = await activeUser();

      const res = await post('/users/me/affiliations', user.token, {
        clubName: 'Some Unlisted FC',
        roleAtClub: ClubRole.PLAYER,
        startDate: daysAgo(10),
      }).expect(400);

      expect(asError(res).error.code).toBe('VALIDATION_ERROR');
    });

    it('rejects an unknown clubId through assertClubExists', async () => {
      const user = await activeUser();

      const res = await post('/users/me/affiliations', user.token, {
        clubId: 2147483000,
        roleAtClub: ClubRole.PLAYER,
        startDate: daysAgo(10),
      }).expect(400);

      expect(asError(res).error.code).toBe('VALIDATION_ERROR');
    });

    it('rejects a startDate in the future', async () => {
      const user = await activeUser();

      const res = await post('/users/me/affiliations', user.token, {
        clubId: clubs[0],
        roleAtClub: ClubRole.PLAYER,
        startDate: daysAhead(1),
      }).expect(400);

      expect(asError(res).error.code).toBe('VALIDATION_ERROR');
    });

    it('rejects an endDate that is not later than the startDate', async () => {
      const user = await activeUser();

      const res = await post('/users/me/affiliations', user.token, {
        clubId: clubs[0],
        roleAtClub: ClubRole.PLAYER,
        startDate: daysAgo(10),
        endDate: daysAgo(10),
      }).expect(400);

      expect(asError(res).error.code).toBe('VALIDATION_ERROR');
    });

    // ------------------------------------------------------------------
    // The partial unique index is the enforcement point, not a guard clause.
    // ------------------------------------------------------------------

    it('409s a second OPEN affiliation at the same club', async () => {
      const user = await activeUser();
      const body = {
        clubId: clubs[1],
        roleAtClub: ClubRole.PLAYER,
        startDate: daysAgo(500),
      };

      await post('/users/me/affiliations', user.token, body).expect(201);
      const res = await post('/users/me/affiliations', user.token, {
        ...body,
        startDate: daysAgo(100),
      }).expect(409);

      expect(asError(res).error.code).toBe('AFFILIATION_ALREADY_OPEN');
    });

    /**
     * Proves the 409 above comes from `uq_affiliation_one_current_per_club`
     * and not from application code: this write bypasses the service, the
     * controller and the DTOs entirely. If the index were dropped, the HTTP
     * test would keep passing against a check-then-insert while THIS one
     * failed — which is the whole point of asserting it here.
     */
    it('is enforced by the database, not the service', async () => {
      const user = await activeUser();
      const row = {
        userId: user.id,
        clubId: clubs[2],
        roleAtClub: ClubRole.SCOUT,
        startDate: new Date(daysAgo(300)),
        endDate: null,
      };

      await ctx.prisma.clubAffiliation.create({ data: row });

      await expect(
        ctx.prisma.clubAffiliation.create({
          data: { ...row, startDate: new Date(daysAgo(50)) },
        }),
      ).rejects.toMatchObject({
        code: 'P2002',
        constructor: Prisma.PrismaClientKnownRequestError,
      });
    });

    it('allows a CLOSED and an OPEN stint at the same club', async () => {
      const user = await activeUser();

      await post('/users/me/affiliations', user.token, {
        clubId: clubs[3],
        roleAtClub: ClubRole.PLAYER,
        startDate: daysAgo(2000),
        endDate: daysAgo(1000),
      }).expect(201);

      await post('/users/me/affiliations', user.token, {
        clubId: clubs[3],
        roleAtClub: ClubRole.COACH,
        startDate: daysAgo(500),
      }).expect(201);
    });

    it('allows two OPEN stints at DIFFERENT clubs', async () => {
      const user = await activeUser();

      await post('/users/me/affiliations', user.token, {
        clubId: clubs[0],
        roleAtClub: ClubRole.PLAYER,
        startDate: daysAgo(300),
      }).expect(201);

      // Dual roles genuinely exist; only same-club overlap is refused.
      await post('/users/me/affiliations', user.token, {
        clubId: clubs[1],
        roleAtClub: ClubRole.ANALYST,
        startDate: daysAgo(200),
      }).expect(201);
    });

    it('re-opens a closed stint when endDate is set back to null', async () => {
      const user = await activeUser();
      const created = await post('/users/me/affiliations', user.token, {
        clubId: clubs[2],
        roleAtClub: ClubRole.PLAYER,
        startDate: daysAgo(900),
        endDate: daysAgo(300),
      }).expect(201);
      const id = asJson<AffiliationBody>(created).id;
      expect(asJson<AffiliationBody>(created).isCurrent).toBe(false);

      const res = await patch(`/users/me/affiliations/${id}`, user.token, {
        endDate: null,
      }).expect(200);

      const body = asJson<AffiliationBody>(res);
      expect(body.endDate).toBeNull();
      expect(body.isCurrent).toBe(true);
    });

    it('404s on updating another user affiliation, never 403', async () => {
      const owner = await activeUser();
      const stranger = await activeUser();
      const created = await post('/users/me/affiliations', owner.token, {
        clubId: clubs[0],
        roleAtClub: ClubRole.PLAYER,
        startDate: daysAgo(60),
      }).expect(201);
      const id = asJson<AffiliationBody>(created).id;

      const res = await patch(`/users/me/affiliations/${id}`, stranger.token, {
        roleAtClub: ClubRole.STAFF,
      });

      expect(res.status).toBe(404);
      expect(res.status).not.toBe(403);
      expect(asError(res).error.code).toBe('NOT_FOUND');
    });

    it('404s on deleting another user affiliation, never 403', async () => {
      const owner = await activeUser();
      const stranger = await activeUser();
      const created = await post('/users/me/affiliations', owner.token, {
        clubId: clubs[1],
        roleAtClub: ClubRole.PLAYER,
        startDate: daysAgo(70),
      }).expect(201);
      const id = asJson<AffiliationBody>(created).id;

      const res = await del(`/users/me/affiliations/${id}`, stranger.token);

      expect(res.status).toBe(404);
      expect(res.status).not.toBe(403);

      await expect(
        ctx.prisma.clubAffiliation.count({ where: { id } }),
      ).resolves.toBe(1);
    });

    it('deletes the caller own affiliation and returns 204', async () => {
      const user = await activeUser();
      const created = await post('/users/me/affiliations', user.token, {
        clubId: clubs[3],
        roleAtClub: ClubRole.PLAYER,
        startDate: daysAgo(80),
      }).expect(201);
      const id = asJson<AffiliationBody>(created).id;

      await del(`/users/me/affiliations/${id}`, user.token).expect(204);

      await expect(
        ctx.prisma.clubAffiliation.count({ where: { id } }),
      ).resolves.toBe(0);
    });
  });

  // ==========================================================================
  // GET /users/:id/affiliations — the one public read in this module
  // ==========================================================================

  describe('GET /users/:id/affiliations', () => {
    it('uses the same { data, nextCursor } envelope', async () => {
      const owner = await activeUser();
      const viewer = await activeUser();
      await post('/users/me/affiliations', owner.token, {
        clubId: clubs[0],
        roleAtClub: ClubRole.PLAYER,
        startDate: daysAgo(120),
      }).expect(201);

      const res = await get(
        `/users/${owner.id}/affiliations`,
        viewer.token,
      ).expect(200);
      const body = asJson<ListBody<AffiliationBody>>(res);

      expect(Object.keys(body).sort()).toEqual(['data', 'nextCursor']);
      expect(body.nextCursor).toBeNull();
      expect(body.data).toHaveLength(1);
      expect(body.data[0]).toMatchObject({ clubId: clubs[0], isCurrent: true });
    });

    /**
     * CHARACTERIZATION TEST — documents what the code does today, NOT what it
     * should do. Read D-005 before changing it.
     *
     * Career lists are unpaginated: neither route declares a cursor or limit
     * parameter, both cap at CAREER_LIST_CAP rows, and both return nextCursor
     * null unconditionally. That is a known, logged divergence from §5's
     * "cursor pagination everywhere", not a design this suite endorses.
     *
     * IF THIS TEST FAILS, the most likely cause is that somebody implemented
     * pagination — which is the intended end state, not a regression. In that
     * case delete this test and replace it with real boundary coverage: page
     * through more than one page, assert no duplicates and no gaps across the
     * boundary, and assert nextCursor is null only on the final page. The
     * model to copy is the keyset walk over GET /reference/clubs in
     * reference.e2e-spec.ts.
     *
     * What this test does NOT cover: the cap itself. Nothing here creates 101
     * rows, so a change to `take` would not be caught.
     */
    it('CHARACTERIZATION (D-005): unpaginated today — cursor and limit are ignored', async () => {
      const owner = await activeUser();
      const viewer = await activeUser();

      for (let i = 0; i < clubs.length; i += 1) {
        await post('/users/me/affiliations', owner.token, {
          clubId: clubs[i],
          roleAtClub: ClubRole.PLAYER,
          startDate: daysAgo(1000 + i * 100),
          endDate: daysAgo(900 + i * 100),
        }).expect(201);
      }

      const full = await get(
        `/users/${owner.id}/affiliations`,
        viewer.token,
      ).expect(200);
      const all = asJson<ListBody<AffiliationBody>>(full);

      expect(all.data).toHaveLength(clubs.length);
      expect(all.nextCursor).toBeNull();

      // Every id exactly once — no duplicate, no omission.
      const ids = all.data.map((a) => a.id);
      expect(new Set(ids).size).toBe(ids.length);

      const paged = await get(
        `/users/${owner.id}/affiliations?limit=2&cursor=whatever`,
        viewer.token,
      ).expect(200);
      const same = asJson<ListBody<AffiliationBody>>(paged);

      expect(same.data.map((a) => a.id)).toEqual(ids);
      expect(same.nextCursor).toBeNull();
    });

    it('puts current stints before closed ones', async () => {
      const owner = await activeUser();
      const viewer = await activeUser();

      await post('/users/me/affiliations', owner.token, {
        clubId: clubs[0],
        roleAtClub: ClubRole.PLAYER,
        startDate: daysAgo(3000),
        endDate: daysAgo(2000),
      }).expect(201);
      await post('/users/me/affiliations', owner.token, {
        clubId: clubs[1],
        roleAtClub: ClubRole.COACH,
        startDate: daysAgo(100),
      }).expect(201);

      const res = await get(
        `/users/${owner.id}/affiliations`,
        viewer.token,
      ).expect(200);
      const rows = asJson<ListBody<AffiliationBody>>(res).data;

      expect(rows[0].isCurrent).toBe(true);
      expect(rows[rows.length - 1].isCurrent).toBe(false);
    });

    it('404s a suspended target rather than 403', async () => {
      const viewer = await activeUser();
      const hidden = await activeUser();
      await ctx.prisma.user.update({
        where: { id: hidden.id },
        data: { status: UserStatus.SUSPENDED },
      });

      const res = await get(`/users/${hidden.id}/affiliations`, viewer.token);

      expect(res.status).toBe(404);
      expect(res.status).not.toBe(403);
      expect(asError(res).error.code).toBe('NOT_FOUND');
    });

    it('404s a user id that belongs to nobody', async () => {
      const viewer = await activeUser();

      await get(
        '/users/00000000-0000-4000-8000-000000000000/affiliations',
        viewer.token,
      ).expect(404);
    });
  });
});
