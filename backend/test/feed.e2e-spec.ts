import { JwtService } from '@nestjs/jwt';
import type request from 'supertest';
import { UserRole, UserStatus } from '../src/generated/prisma/client';
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
 * The feed (FR-FEED-1, FR-FEED-2) against the real Postgres 16 container.
 *
 * The load-bearing test in here is the SUSPENDED-author one. The feed window
 * filters author status in the JOIN (Shape B) rather than dropping rows during
 * hydration, and the reason is page fill: with the filter applied afterwards, a
 * suspended prolific author holding the newest posts empties whole pages while
 * `nextCursor` stays non-null, and the client renders a blank default screen.
 * That test asserts the PAGE IS FULL, so the choice of shape is pinned by a
 * test rather than by a comment — swap the shape and it goes red.
 *
 * Response shapes are declared locally as wire types, never imported from the
 * module, so a change there cannot silently update the expectation.
 */

const SUITE = 'feed';
const COUNTRY_CODE = 'ZG';

interface Fixture {
  id: string;
  email: string;
  token: string;
  role: UserRole;
}

interface ListBody<T> {
  data: T[];
  nextCursor: string | null;
}

interface PostBody {
  id: string;
  content: string;
  author: {
    id: string;
    fullName: string;
    role: string;
    age: number;
    isFollowing: boolean;
  };
  club: { id: number; nameEn: string; nameAr: string | null } | null;
  images: unknown[];
  likesCount: number;
  isLiked: boolean;
  isSaved: boolean;
  createdAt: string;
}

describe('Feed (e2e, real Postgres)', () => {
  let ctx: E2eContext;
  let ref: ReferenceData;
  let jwt: JwtService;

  const client = () => new ApiClient(ctx.server);

  const tokenFor = (sub: string, role: UserRole) =>
    jwt.sign({ sub, role, status: UserStatus.ACTIVE });

  async function user(
    role: UserRole = UserRole.COACH,
    status: UserStatus = UserStatus.ACTIVE,
  ): Promise<Fixture> {
    const row = await ctx.prisma.user.create({
      data: {
        email: uniqueEmail(SUITE, 'fd'),
        passwordHash: '$2b$12$not.used.by.this.suite',
        fullName: 'Feed Fixture',
        role,
        dateOfBirth: new Date('1994-06-15'),
        countryId: ref.countryId,
        cityId: ref.cityId,
        status,
      },
      select: { id: true, email: true, role: true },
    });
    return { ...row, token: tokenFor(row.id, row.role) };
  }

  const get = (path: string, token: string) =>
    client().get(path).set('Authorization', `Bearer ${token}`);
  const put = (path: string, token: string) =>
    client().put(path).set('Authorization', `Bearer ${token}`);

  /**
   * Posts written straight to the table so timestamps are ours. `author_role`
   * is set from the author's real role, matching what the create path does.
   */
  async function seed(
    author: Fixture,
    rows: { content: string; createdAt: string; deleted?: boolean }[],
  ): Promise<void> {
    for (const row of rows) {
      await ctx.prisma.$executeRaw`
        INSERT INTO posts (id, author_id, author_role, post_type, content,
                           created_at, updated_at, deleted_at)
        VALUES (gen_random_uuid(), ${author.id}::uuid, ${author.role}::user_role,
                'STANDARD', ${row.content}, ${row.createdAt}::timestamptz, now(),
                ${row.deleted ? new Date() : null})
      `;
    }
  }

  /** Only this suite's posts — the feed is global, so everything else is noise. */
  async function mine(token: string, query = ''): Promise<PostBody[]> {
    const res: request.Response = await get(`/feed${query}`, token).expect(200);
    const body = asJson<ListBody<PostBody>>(res);
    return body.data.filter((row) => row.content.startsWith(SUITE));
  }

  async function walk(
    token: string,
    limit: number,
  ): Promise<{
    seen: string[];
    pages: { size: number; cursor: string | null }[];
  }> {
    const seen: string[] = [];
    const pages: { size: number; cursor: string | null }[] = [];
    let cursor: string | null = null;

    for (let guard = 0; guard < 200; guard += 1) {
      const query =
        `?limit=${limit}` +
        (cursor === null ? '' : `&cursor=${encodeURIComponent(cursor)}`);
      const res: request.Response = await get(`/feed${query}`, token).expect(
        200,
      );
      const body = asJson<ListBody<PostBody>>(res);

      seen.push(
        ...body.data
          .filter((r) => r.content.startsWith(SUITE))
          .map((r) => r.id),
      );
      pages.push({ size: body.data.length, cursor: body.nextCursor });

      cursor = body.nextCursor;
      if (cursor === null) return { seen, pages };
    }
    throw new Error('pagination did not terminate: cursor never went null');
  }

  async function clearSuitePosts(): Promise<void> {
    await ctx.prisma.post.deleteMany({
      where: { author: { email: { endsWith: `@${SUITE}.e2e.test` } } },
    });
  }

  beforeAll(async () => {
    ctx = await createE2eApp();
    jwt = ctx.app.get(JwtService);
    await clearSuitePosts();
    await clearE2eUsers(ctx.prisma, SUITE);
    await clearReferenceData(ctx.prisma, COUNTRY_CODE);
    ref = await seedReferenceData(ctx.prisma, COUNTRY_CODE);
  });

  afterAll(async () => {
    await clearSuitePosts();
    await clearE2eUsers(ctx.prisma, SUITE);
    await clearReferenceData(ctx.prisma, COUNTRY_CODE);
    await ctx.close();
  });

  // ==========================================================================
  // Ordering and pagination
  // ==========================================================================

  describe('ordering', () => {
    it('is strictly created_at DESC, id DESC across a two-page walk', async () => {
      const author = await user();
      const viewer = await user();
      await seed(author, [
        { content: `${SUITE} o1`, createdAt: '2026-03-01 10:00:00+00' },
        { content: `${SUITE} o2`, createdAt: '2026-03-01 11:00:00+00' },
        { content: `${SUITE} o3`, createdAt: '2026-03-01 12:00:00+00' },
        { content: `${SUITE} o4`, createdAt: '2026-03-01 13:00:00+00' },
      ]);

      const rows = await mine(viewer.token);
      expect(rows.map((r) => r.content)).toEqual([
        `${SUITE} o4`,
        `${SUITE} o3`,
        `${SUITE} o2`,
        `${SUITE} o1`,
      ]);

      const times = rows.map((r) => new Date(r.createdAt).getTime());
      expect([...times].sort((a, b) => b - a)).toEqual(times);

      const { seen } = await walk(viewer.token, 2);
      expect(new Set(seen).size).toBe(seen.length);
    });

    it('does not drop rows separated by microseconds inside one millisecond', async () => {
      const author = await user();
      const viewer = await user();

      // Dated into 2027 ON PURPOSE: the feed is global, so these must be the
      // three newest rows in the whole table for the walk below to be
      // deterministic. Same millisecond (.123), different microseconds.
      //
      // A cursor encoded through a JavaScript Date truncates .123789 to
      // .123000, and the two earlier rows are then GREATER than the cursor —
      // they fail the comparison on page 2 and on every page after it, and are
      // never returned to anyone.
      await seed(author, [
        { content: `${SUITE} m1`, createdAt: '2027-04-01 08:00:00.123111+00' },
        { content: `${SUITE} m2`, createdAt: '2027-04-01 08:00:00.123456+00' },
        { content: `${SUITE} m3`, createdAt: '2027-04-01 08:00:00.123789+00' },
      ]);

      // Walked one row at a time and asserted BY CONTENT, in order. An earlier
      // version of this test counted rows instead, and source mutation showed
      // the count passed even with two of the three silently skipped, because
      // the walk also picked up this suite's other posts. The identities are
      // what matter, not the tally.
      const seenInOrder: string[] = [];
      let cursor: string | null = null;
      for (let page = 0; page < 3; page += 1) {
        const query =
          '?limit=1' +
          (cursor === null ? '' : `&cursor=${encodeURIComponent(cursor)}`);
        const res: request.Response = await get(
          `/feed${query}`,
          viewer.token,
        ).expect(200);
        const body = asJson<ListBody<PostBody>>(res);
        expect(body.data).toHaveLength(1);
        seenInOrder.push(body.data[0].content);
        cursor = body.nextCursor;
        expect(cursor).not.toBeNull();
      }

      expect(seenInOrder).toEqual([
        `${SUITE} m3`,
        `${SUITE} m2`,
        `${SUITE} m1`,
      ]);
    });
  });

  // ==========================================================================
  // Exclusions — and the page-fill guarantee
  // ==========================================================================

  describe('exclusions', () => {
    it('never shows soft-deleted posts', async () => {
      const author = await user();
      const viewer = await user();
      await seed(author, [
        { content: `${SUITE} live`, createdAt: '2026-05-01 10:00:00+00' },
        {
          content: `${SUITE} gone`,
          createdAt: '2026-05-01 11:00:00+00',
          deleted: true,
        },
      ]);

      const contents = (await mine(viewer.token)).map((r) => r.content);
      expect(contents).toContain(`${SUITE} live`);
      expect(contents).not.toContain(`${SUITE} gone`);
    });

    it('never shows posts by a SUSPENDED author, AND still fills the page', async () => {
      const viewer = await user();
      const active = await user();
      const suspended = await user(UserRole.COACH, UserStatus.SUSPENDED);

      // 25 older posts by an ACTIVE author...
      await seed(
        active,
        Array.from({ length: 25 }, (_, i) => ({
          content: `${SUITE} active ${i}`,
          createdAt: `2026-07-01 10:${String(i).padStart(2, '0')}:00+00`,
        })),
      );
      // ...and 30 NEWER ones by the suspended author, a contiguous run at the
      // head of the feed. This is the arrangement that empties whole pages if
      // the status filter is applied after the window instead of inside it.
      await seed(
        suspended,
        Array.from({ length: 30 }, (_, i) => ({
          content: `${SUITE} suspended ${i}`,
          createdAt: `2026-08-01 10:${String(i).padStart(2, '0')}:00+00`,
        })),
      );

      const res: request.Response = await get(
        '/feed?limit=20',
        viewer.token,
      ).expect(200);
      const body = asJson<ListBody<PostBody>>(res);

      // No suspended-author post anywhere.
      expect(
        body.data.filter((r) => r.content.startsWith(`${SUITE} suspended`)),
      ).toHaveLength(0);

      // THE PAGE IS FULL. This is what pins Shape B: with the filter applied
      // during hydration instead, this page would contain ZERO rows while
      // nextCursor stayed non-null.
      expect(body.data).toHaveLength(20);
    });
  });

  // ==========================================================================
  // FR-FEED-2 — role filter
  // ==========================================================================

  describe('?role=', () => {
    it('returns only posts authored by that role', async () => {
      const viewer = await user();
      const coach = await user(UserRole.COACH);
      const scout = await user(UserRole.SCOUT);
      await seed(coach, [
        { content: `${SUITE} by-coach`, createdAt: '2026-09-01 10:00:00+00' },
      ]);
      await seed(scout, [
        { content: `${SUITE} by-scout`, createdAt: '2026-09-01 11:00:00+00' },
      ]);

      const contents = (await mine(viewer.token, '?role=COACH&limit=50')).map(
        (r) => r.content,
      );
      expect(contents).toContain(`${SUITE} by-coach`);
      expect(contents).not.toContain(`${SUITE} by-scout`);

      // Asserted against the author's role, not just the filter echoing back.
      const rows = await mine(viewer.token, '?role=COACH&limit=50');
      expect(rows.every((r) => r.author.role === 'COACH')).toBe(true);
    });

    it('400s an unknown role', async () => {
      const viewer = await user();
      const res = await get('/feed?role=WIZARD', viewer.token).expect(400);
      expect(asError(res).error.code).toBe('VALIDATION_ERROR');
    });

    it('400s a malformed cursor', async () => {
      const viewer = await user();
      const res = await get('/feed?cursor=not-a-cursor', viewer.token).expect(
        400,
      );
      expect(asError(res).error.code).toBe('VALIDATION_ERROR');
    });
  });

  // ==========================================================================
  // Viewer state — the D-010 arrangement, three times
  // ==========================================================================

  describe('viewer state', () => {
    it('isLiked, isSaved and isFollowing all reflect the VIEWER, not someone else', async () => {
      const viewer = await user();
      const other = await user();
      const author = await user();
      await seed(author, [
        {
          content: `${SUITE} viewerstate`,
          createdAt: '2026-10-01 10:00:00+00',
        },
      ]);

      const post = (await mine(viewer.token, '?limit=50')).find(
        (r) => r.content === `${SUITE} viewerstate`,
      );
      expect(post).toBeDefined();

      // Every piece of state belongs to SOMEONE ELSE. A test where the viewer
      // holds the state cannot distinguish a correct filter from a missing one
      // — that is precisely how the D-010 bug survived 185 green tests.
      await put(`/posts/${post!.id}/like`, other.token).expect(204);
      await put(`/posts/${post!.id}/save`, other.token).expect(204);
      await put(`/users/${author.id}/follow`, other.token).expect(204);

      const asViewer = (await mine(viewer.token, '?limit=50')).find(
        (r) => r.id === post!.id,
      );
      expect(asViewer?.isLiked).toBe(false);
      expect(asViewer?.isSaved).toBe(false);
      expect(asViewer?.author.isFollowing).toBe(false);
      expect(asViewer?.likesCount).toBe(1);

      const asOther = (await mine(other.token, '?limit=50')).find(
        (r) => r.id === post!.id,
      );
      expect(asOther?.isLiked).toBe(true);
      expect(asOther?.isSaved).toBe(true);
      expect(asOther?.author.isFollowing).toBe(true);
    });
  });

  // ==========================================================================
  // Shape parity with the other read paths
  // ==========================================================================

  describe('item shape', () => {
    it('carries the club block for a club-admin post and null for a normal one', async () => {
      const viewer = await user();
      const admin = await user(UserRole.CLUB_ADMIN);
      const club = await ctx.prisma.club.create({
        data: {
          nameEn: 'Feed FC',
          nameAr: 'Feed FC AR',
          countryId: ref.countryId,
        },
        select: { id: true },
      });
      await ctx.prisma.clubAdminProfile.create({
        data: { userId: admin.id, clubId: club.id },
      });

      const asClub = asJson<PostBody>(
        await client()
          .post('/posts')
          .set('Authorization', `Bearer ${admin.token}`)
          .send({ content: `${SUITE} club post`, postAsClub: true })
          .expect(201),
      );
      const plain = asJson<PostBody>(
        await client()
          .post('/posts')
          .set('Authorization', `Bearer ${admin.token}`)
          .send({ content: `${SUITE} plain post` })
          .expect(201),
      );

      const rows = await mine(viewer.token, '?limit=50');
      const clubRow = rows.find((r) => r.id === asClub.id);
      const plainRow = rows.find((r) => r.id === plain.id);

      expect(clubRow?.club?.id).toBe(club.id);
      expect(clubRow?.club?.nameEn).toBe('Feed FC');
      expect(clubRow?.club?.nameAr).toBe('Feed FC AR');
      expect(plainRow?.club).toBeNull();
      expect(clubRow?.images).toEqual([]);
    });
  });
});
