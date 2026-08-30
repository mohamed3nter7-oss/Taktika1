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
 * FR-FOLW (asymmetric follows) against the real database.
 *
 * The rules this suite exists to hold, in order of how quietly they can break:
 *
 * 1. **Pagination loses nothing and repeats nothing.** Asserted by walking
 *    every page and comparing the collected id set against what was seeded —
 *    not by eyeballing one page. Three separate timestamp regimes are covered
 *    (distinct, identical, and microsecond-adjacent inside one millisecond)
 *    because each defeats a different wrong cursor.
 * 2. **Counters are the database's job.** Every counter assertion reads the
 *    `users` row directly. Trusting the API response here would let a service
 *    that computes the number on the fly pass a suite for a trigger that no
 *    longer fires.
 * 3. **Constraints are proved where they live.** `chk_no_self_follow` is
 *    checked through HTTP *and* by a direct write that bypasses the service,
 *    the way `career.e2e-spec.ts` proves `uq_affiliation_one_current_per_club`.
 *
 * No assertion here reads a DTO, a select constant, or a doc comment. Response
 * shapes are declared locally as wire types so a change in the module cannot
 * silently update the expectation with it.
 */

const SUITE = 'follows';
const COUNTRY_CODE = 'ZW';

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

interface FollowRowBody {
  id: string;
  fullName: string;
  role: string;
  headline: string | null;
  avatarUrl: string | null;
  age: number;
  isFollowing: boolean;
}

describe('Follows (e2e, real Postgres)', () => {
  let ctx: E2eContext;
  let ref: ReferenceData;
  let jwt: JwtService;

  const client = () => new ApiClient(ctx.server);

  const tokenFor = (sub: string, status: UserStatus = UserStatus.ACTIVE) =>
    jwt.sign({ sub, role: UserRole.COACH, status });

  /**
   * Follows is role-agnostic, so every fixture is a COACH with no role profile
   * row. Users are ACTIVE because ProfileCompleteGuard gates all four routes
   * and `assertUserVisible` gates the reads.
   */
  async function activeUser(name = 'Follow Fixture'): Promise<Fixture> {
    const user = await ctx.prisma.user.create({
      data: {
        email: uniqueEmail(SUITE, 'fol'),
        passwordHash: '$2b$12$not.used.by.this.suite',
        fullName: name,
        role: UserRole.COACH,
        dateOfBirth: new Date('1994-06-15'),
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
  const put = (path: string, token: string) =>
    client().put(path).set('Authorization', `Bearer ${token}`);
  const del = (path: string, token: string) =>
    client().delete(path).set('Authorization', `Bearer ${token}`);

  /** Counters straight from the row the trigger writes. */
  const counters = (id: string) =>
    ctx.prisma.user.findUniqueOrThrow({
      where: { id },
      select: { followersCount: true, followingCount: true },
    });

  const followRowCount = (followerId: string, followingId: string) =>
    ctx.prisma.follow.count({ where: { followerId, followingId } });

  const setStatus = (id: string, status: UserStatus) =>
    ctx.prisma.user.update({ where: { id }, data: { status } });

  /**
   * Walks every page of a list route and returns what it saw.
   *
   * The iteration cap is an assertion in disguise: a cursor that fails to
   * advance produces an infinite walk, which would otherwise hang the suite
   * rather than fail it.
   */
  async function walk(
    path: string,
    token: string,
    limit: number,
  ): Promise<{
    seen: string[];
    pages: { size: number; cursor: string | null }[];
  }> {
    const seen: string[] = [];
    const pages: { size: number; cursor: string | null }[] = [];
    let cursor: string | null = null;

    for (let guard = 0; guard < 100; guard += 1) {
      const query =
        `?limit=${limit}` +
        (cursor === null ? '' : `&cursor=${encodeURIComponent(cursor)}`);
      // Annotated because the supertest chain infers as `any` here, which
      // would make every field access on the body unchecked.
      const res: request.Response = await get(`${path}${query}`, token).expect(
        200,
      );
      const body = asJson<ListBody<FollowRowBody>>(res);

      seen.push(...body.data.map((row) => row.id));
      pages.push({ size: body.data.length, cursor: body.nextCursor });

      cursor = body.nextCursor;
      if (cursor === null) return { seen, pages };
    }
    throw new Error('pagination did not terminate: cursor never went null');
  }

  /** Follow rows written straight to the table, with timestamps we control. */
  async function seedFollows(
    followingId: string,
    followers: { id: string; createdAt: string }[],
  ): Promise<void> {
    for (const follower of followers) {
      await ctx.prisma.$executeRaw`
        INSERT INTO follows (follower_id, following_id, created_at)
        VALUES (${follower.id}::uuid, ${followingId}::uuid, ${follower.createdAt}::timestamptz)
      `;
    }
  }

  beforeAll(async () => {
    ctx = await createE2eApp();
    jwt = ctx.app.get(JwtService);

    await clearE2eUsers(ctx.prisma, SUITE);
    await clearReferenceData(ctx.prisma, COUNTRY_CODE);
    ref = await seedReferenceData(ctx.prisma, COUNTRY_CODE);
  });

  afterAll(async () => {
    await clearE2eUsers(ctx.prisma, SUITE);
    await clearReferenceData(ctx.prisma, COUNTRY_CODE);
    await ctx.close();
  });

  // ==========================================================================
  // PUT /users/:id/follow
  // ==========================================================================

  describe('PUT /users/:id/follow', () => {
    it('follows a user and creates exactly one row', async () => {
      const [viewer, target] = await Promise.all([activeUser(), activeUser()]);

      await put(`/users/${target.id}/follow`, viewer.token).expect(204);

      await expect(followRowCount(viewer.id, target.id)).resolves.toBe(1);
    });

    it('is idempotent: following twice is 204 and still one row', async () => {
      const [viewer, target] = await Promise.all([activeUser(), activeUser()]);

      await put(`/users/${target.id}/follow`, viewer.token).expect(204);
      await put(`/users/${target.id}/follow`, viewer.token).expect(204);

      // Not a 409: a follow is a state assertion, not an event.
      await expect(followRowCount(viewer.id, target.id)).resolves.toBe(1);
    });

    it('rejects a self-follow with 400 VALIDATION_ERROR', async () => {
      const viewer = await activeUser();

      const res = await put(`/users/${viewer.id}/follow`, viewer.token);

      expect(res.status).toBe(400);
      expect(asError(res).error.code).toBe('VALIDATION_ERROR');
      await expect(followRowCount(viewer.id, viewer.id)).resolves.toBe(0);
    });

    /**
     * The constraint, not the guard clause. A direct insert bypasses the
     * service entirely — this is what proves the 400 above is defence in depth
     * rather than the only thing standing between the table and a self-edge.
     */
    it('rejects a self-follow at the database even when the service is bypassed', async () => {
      const viewer = await activeUser();

      await expect(
        ctx.prisma.follow.create({
          data: { followerId: viewer.id, followingId: viewer.id },
        }),
      ).rejects.toThrow();
    });

    it('404s an id that belongs to nobody', async () => {
      const viewer = await activeUser();

      const res = await put(
        '/users/00000000-0000-4000-8000-000000000000/follow',
        viewer.token,
      );

      expect(res.status).toBe(404);
      expect(asError(res).error.code).toBe('NOT_FOUND');
    });

    it('404s a suspended target rather than 403 — existence must not leak', async () => {
      const [viewer, target] = await Promise.all([activeUser(), activeUser()]);
      await setStatus(target.id, UserStatus.SUSPENDED);

      const res = await put(`/users/${target.id}/follow`, viewer.token);

      expect(res.status).toBe(404);
      expect(res.status).not.toBe(403);
      expect(asError(res).error.code).toBe('NOT_FOUND');
    });
  });

  // ==========================================================================
  // DELETE /users/:id/follow
  // ==========================================================================

  describe('DELETE /users/:id/follow', () => {
    it('unfollows and is idempotent', async () => {
      const [viewer, target] = await Promise.all([activeUser(), activeUser()]);
      await put(`/users/${target.id}/follow`, viewer.token).expect(204);

      await del(`/users/${target.id}/follow`, viewer.token).expect(204);
      await expect(followRowCount(viewer.id, target.id)).resolves.toBe(0);

      // Not a 404: withdrawing an assertion that is not there is a no-op.
      await del(`/users/${target.id}/follow`, viewer.token).expect(204);
    });

    /**
     * The reason unfollow deliberately does NOT call `assertUserVisible`.
     *
     * If it did, suspending a user would strand every edge pointing at them:
     * the follower could never remove the row, and their `followingCount`
     * would stay inflated permanently with no path to correct it.
     */
    it('unfollows a suspended target and decrements the counter', async () => {
      const [viewer, target] = await Promise.all([activeUser(), activeUser()]);
      await put(`/users/${target.id}/follow`, viewer.token).expect(204);
      await expect(counters(viewer.id)).resolves.toMatchObject({
        followingCount: 1,
      });

      await setStatus(target.id, UserStatus.SUSPENDED);

      await del(`/users/${target.id}/follow`, viewer.token).expect(204);

      await expect(followRowCount(viewer.id, target.id)).resolves.toBe(0);
      await expect(counters(viewer.id)).resolves.toMatchObject({
        followingCount: 0,
      });
    });

    it('204s for an id that belongs to nobody', async () => {
      const viewer = await activeUser();

      await del(
        '/users/00000000-0000-4000-8000-000000000000/follow',
        viewer.token,
      ).expect(204);
    });
  });

  // ==========================================================================
  // Counters — read from the users row, never from the API
  // ==========================================================================

  describe('counters (trigger-maintained)', () => {
    it('moves both sides on follow and on unfollow', async () => {
      const [viewer, target] = await Promise.all([activeUser(), activeUser()]);

      await put(`/users/${target.id}/follow`, viewer.token).expect(204);

      expect(await counters(viewer.id)).toMatchObject({
        followingCount: 1,
        followersCount: 0,
      });
      expect(await counters(target.id)).toMatchObject({
        followersCount: 1,
        followingCount: 0,
      });

      await del(`/users/${target.id}/follow`, viewer.token).expect(204);

      expect(await counters(viewer.id)).toMatchObject({ followingCount: 0 });
      expect(await counters(target.id)).toMatchObject({ followersCount: 0 });
    });

    /**
     * Counter integrity across a re-follow. The second follow hits
     * ON CONFLICT DO NOTHING, so no row is inserted and the AFTER INSERT
     * trigger never fires — which is what keeps this at 1 rather than 2.
     */
    it('follow, unfollow, follow again leaves the count at 1', async () => {
      const [viewer, target] = await Promise.all([activeUser(), activeUser()]);

      await put(`/users/${target.id}/follow`, viewer.token).expect(204);
      await del(`/users/${target.id}/follow`, viewer.token).expect(204);
      await put(`/users/${target.id}/follow`, viewer.token).expect(204);

      expect(await counters(target.id)).toMatchObject({ followersCount: 1 });
      expect(await counters(viewer.id)).toMatchObject({ followingCount: 1 });
      await expect(followRowCount(viewer.id, target.id)).resolves.toBe(1);
    });

    it('a repeated follow does not inflate the count', async () => {
      const [viewer, target] = await Promise.all([activeUser(), activeUser()]);

      await put(`/users/${target.id}/follow`, viewer.token).expect(204);
      await put(`/users/${target.id}/follow`, viewer.token).expect(204);
      await put(`/users/${target.id}/follow`, viewer.token).expect(204);

      expect(await counters(target.id)).toMatchObject({ followersCount: 1 });
    });

    /**
     * CASCADE plus trigger, together. Deleting a user must remove their edges
     * AND leave the survivor's counter correct — the FK does the first half,
     * the DELETE trigger the second, and only checking both proves the pair.
     */
    it('cascades a deleted user and decrements the survivor counter', async () => {
      const [leaver, survivor] = await Promise.all([
        activeUser(),
        activeUser(),
      ]);

      await put(`/users/${survivor.id}/follow`, leaver.token).expect(204);
      await put(`/users/${leaver.id}/follow`, survivor.token).expect(204);

      expect(await counters(survivor.id)).toMatchObject({
        followersCount: 1,
        followingCount: 1,
      });

      await ctx.prisma.user.delete({ where: { id: leaver.id } });

      // Edges in BOTH directions are gone.
      await expect(
        ctx.prisma.follow.count({
          where: {
            OR: [{ followerId: leaver.id }, { followingId: leaver.id }],
          },
        }),
      ).resolves.toBe(0);

      // ...and the trigger moved the survivor's counters as the rows went.
      expect(await counters(survivor.id)).toMatchObject({
        followersCount: 0,
        followingCount: 0,
      });
    });
  });

  // ==========================================================================
  // Pagination — the one that matters
  // ==========================================================================

  describe('GET /users/:id/followers — keyset pagination', () => {
    it('pages through 25 followers losing and repeating nothing', async () => {
      const target = await activeUser('Popular');
      const viewer = await activeUser('Viewer');

      const followers = await Promise.all(
        Array.from({ length: 25 }, () => activeUser()),
      );
      // Distinct, descending-friendly timestamps: one per minute.
      await seedFollows(
        target.id,
        followers.map((follower, i) => ({
          id: follower.id,
          createdAt: `2026-01-01 10:${String(i).padStart(2, '0')}:00+00`,
        })),
      );

      const { seen, pages } = await walk(
        `/users/${target.id}/followers`,
        viewer.token,
        10,
      );

      // No duplicates.
      expect(new Set(seen).size).toBe(seen.length);
      // No omissions.
      expect(new Set(seen)).toEqual(new Set(followers.map((f) => f.id)));
      expect(seen).toHaveLength(25);

      // 10 / 10 / 5, and a cursor on every page except the last.
      expect(pages.map((p) => p.size)).toEqual([10, 10, 5]);
      expect(pages.slice(0, -1).every((p) => p.cursor !== null)).toBe(true);
      expect(pages[pages.length - 1].cursor).toBeNull();
    });

    it('orders newest first', async () => {
      const target = await activeUser();
      const viewer = await activeUser();
      const [oldest, middle, newest] = await Promise.all([
        activeUser(),
        activeUser(),
        activeUser(),
      ]);

      await seedFollows(target.id, [
        { id: oldest.id, createdAt: '2026-02-01 09:00:00+00' },
        { id: middle.id, createdAt: '2026-02-02 09:00:00+00' },
        { id: newest.id, createdAt: '2026-02-03 09:00:00+00' },
      ]);

      const { seen } = await walk(
        `/users/${target.id}/followers`,
        viewer.token,
        10,
      );

      expect(seen).toEqual([newest.id, middle.id, oldest.id]);
    });

    /**
     * What the composite cursor exists for. With a `created_at`-only cursor the
     * next page asks for rows strictly older than a timestamp three rows share,
     * so two of them vanish. Passing this with a single-column cursor is
     * impossible, which is the point.
     */
    it('pages across rows sharing an identical createdAt', async () => {
      const target = await activeUser();
      const viewer = await activeUser();

      const tied = await Promise.all([
        activeUser(),
        activeUser(),
        activeUser(),
        activeUser(),
      ]);
      const SAME = '2026-03-01 12:00:00.500000+00';
      await seedFollows(
        target.id,
        tied.map((f) => ({ id: f.id, createdAt: SAME })),
      );

      // limit 1 forces a page boundary between every pair of tied rows.
      const { seen } = await walk(
        `/users/${target.id}/followers`,
        viewer.token,
        1,
      );

      expect(new Set(seen).size).toBe(seen.length);
      expect(new Set(seen)).toEqual(new Set(tied.map((f) => f.id)));
      expect(seen).toHaveLength(4);
    });

    /**
     * What the TEXT cursor exists for, and what the collision test above cannot
     * reach.
     *
     * `created_at` is timestamptz(6); a JS Date is millisecond. Encoding the
     * cursor through a Date truncates DOWNWARD, so a cursor taken from the row
     * at .123789 reads .123000 — and the sibling at .123456, being GREATER than
     * that, fails `< cursor` on this page and on every page after it. It is
     * never returned to anyone.
     *
     * The collision test cannot catch this because truncation preserves
     * equality: rows sharing a timestamp still page correctly. Only distinct
     * sub-millisecond values inside one millisecond expose the loss.
     */
    it('does not drop rows separated by microseconds inside one millisecond', async () => {
      const target = await activeUser();
      const viewer = await activeUser();

      const near = await Promise.all([
        activeUser(),
        activeUser(),
        activeUser(),
      ]);
      // Same millisecond (.123), different microseconds.
      await seedFollows(target.id, [
        { id: near[0].id, createdAt: '2026-04-01 08:00:00.123111+00' },
        { id: near[1].id, createdAt: '2026-04-01 08:00:00.123456+00' },
        { id: near[2].id, createdAt: '2026-04-01 08:00:00.123789+00' },
      ]);

      const { seen } = await walk(
        `/users/${target.id}/followers`,
        viewer.token,
        1,
      );

      expect(seen).toHaveLength(3);
      expect(new Set(seen)).toEqual(new Set(near.map((f) => f.id)));
      // Newest microsecond first.
      expect(seen).toEqual([near[2].id, near[1].id, near[0].id]);
    });

    it('rejects a malformed cursor with 400 VALIDATION_ERROR', async () => {
      const [target, viewer] = await Promise.all([activeUser(), activeUser()]);

      const res = await get(
        `/users/${target.id}/followers?cursor=not-a-real-cursor`,
        viewer.token,
      );

      expect(res.status).toBe(400);
      expect(asError(res).error.code).toBe('VALIDATION_ERROR');
    });

    it.each([
      ['zero', 0],
      ['negative', -1],
      ['above the maximum', 51],
    ])('rejects a %s limit', async (_label, limit) => {
      const [target, viewer] = await Promise.all([activeUser(), activeUser()]);

      await get(
        `/users/${target.id}/followers?limit=${limit}`,
        viewer.token,
      ).expect(400);
    });

    it('returns an empty page and a null cursor for a user nobody follows', async () => {
      const [target, viewer] = await Promise.all([activeUser(), activeUser()]);

      const res = await get(
        `/users/${target.id}/followers`,
        viewer.token,
      ).expect(200);
      const body = asJson<ListBody<FollowRowBody>>(res);

      expect(body.data).toEqual([]);
      expect(body.nextCursor).toBeNull();
    });

    it('404s a suspended target', async () => {
      const [target, viewer] = await Promise.all([activeUser(), activeUser()]);
      await setStatus(target.id, UserStatus.SUSPENDED);

      await get(`/users/${target.id}/followers`, viewer.token).expect(404);
    });
  });

  // ==========================================================================
  // GET /users/:id/following — the direction the PK does NOT order
  // ==========================================================================

  describe('GET /users/:id/following', () => {
    it('pages through 25 followed users losing and repeating nothing', async () => {
      const subject = await activeUser('Follows Many');
      const viewer = await activeUser();

      const targets = await Promise.all(
        Array.from({ length: 25 }, () => activeUser()),
      );
      for (const [i, target] of targets.entries()) {
        await ctx.prisma.$executeRaw`
          INSERT INTO follows (follower_id, following_id, created_at)
          VALUES (${subject.id}::uuid, ${target.id}::uuid,
                  ${`2026-05-01 10:${String(i).padStart(2, '0')}:00+00`}::timestamptz)
        `;
      }

      const { seen, pages } = await walk(
        `/users/${subject.id}/following`,
        viewer.token,
        10,
      );

      expect(new Set(seen).size).toBe(seen.length);
      expect(new Set(seen)).toEqual(new Set(targets.map((t) => t.id)));
      expect(pages.map((p) => p.size)).toEqual([10, 10, 5]);
      expect(pages[pages.length - 1].cursor).toBeNull();
    });
  });

  // ==========================================================================
  // isFollowing
  // ==========================================================================

  describe('isFollowing (viewer follow-back state)', () => {
    it('is true for a mutual follow and false one-way', async () => {
      const [alice, bob] = await Promise.all([activeUser(), activeUser()]);

      // bob follows alice; alice follows bob back => mutual.
      await put(`/users/${alice.id}/follow`, bob.token).expect(204);
      await put(`/users/${bob.id}/follow`, alice.token).expect(204);

      const mutual = asJson<ListBody<FollowRowBody>>(
        await get(`/users/${alice.id}/followers`, alice.token).expect(200),
      );
      expect(mutual.data).toHaveLength(1);
      expect(mutual.data[0]).toMatchObject({ id: bob.id, isFollowing: true });

      // A third party who follows nobody sees the same row as not-followed.
      const stranger = await activeUser();
      const oneWay = asJson<ListBody<FollowRowBody>>(
        await get(`/users/${alice.id}/followers`, stranger.token).expect(200),
      );
      expect(oneWay.data[0]).toMatchObject({ id: bob.id, isFollowing: false });
    });

    /**
     * The variant that catches an undefined viewer id.
     *
     * Prisma drops an `undefined` value from a `where` clause instead of
     * matching nothing, so a lost viewer id turns "does the viewer follow this
     * row" into "does ANYONE follow this row". A stranger looking at a row with
     * no other followers would still read false, so the ordinary stranger case
     * above passes with the bug intact. This row has a follower who is not the
     * viewer, which is the only shape that separates the two.
     */
    it('is false for a stranger even when the row has other followers', async () => {
      const [subject, target, stranger] = await Promise.all([
        activeUser(),
        activeUser(),
        activeUser(),
      ]);
      const otherFollower = await activeUser();

      // target's follower list will contain `subject`...
      await put(`/users/${target.id}/follow`, subject.token).expect(204);
      // ...and `subject` has a follower of their own, who is NOT the stranger.
      await put(`/users/${subject.id}/follow`, otherFollower.token).expect(204);

      const body = asJson<ListBody<FollowRowBody>>(
        await get(`/users/${target.id}/followers`, stranger.token).expect(200),
      );

      expect(body.data).toHaveLength(1);
      expect(body.data[0].id).toBe(subject.id);
      expect(body.data[0].isFollowing).toBe(false);
    });
  });

  // ==========================================================================
  // Short pages — hydration filters, the cursor does not
  // ==========================================================================

  describe('short pages', () => {
    /**
     * The window comes from `follows`; the ACTIVE filter is applied when the
     * users are hydrated. A page can therefore be shorter than `limit` while
     * more pages remain. Pagination stays exact — the cursor tracks the follow
     * window, not the rendered rows — but a client that treats
     * `data.length < limit` as end-of-list stops early and silently.
     */
    it('returns fewer rows than the limit without ending the list', async () => {
      const target = await activeUser();
      const viewer = await activeUser();

      const followers = await Promise.all(
        Array.from({ length: 10 }, () => activeUser()),
      );
      await seedFollows(
        target.id,
        followers.map((follower, i) => ({
          id: follower.id,
          createdAt: `2026-06-01 10:${String(i).padStart(2, '0')}:00+00`,
        })),
      );

      // Suspend three that sit inside the FIRST page (newest are last-indexed).
      const suspended = [followers[9], followers[8], followers[7]];
      for (const user of suspended) {
        await setStatus(user.id, UserStatus.SUSPENDED);
      }

      const firstPage = asJson<ListBody<FollowRowBody>>(
        await get(`/users/${target.id}/followers?limit=5`, viewer.token).expect(
          200,
        ),
      );

      // 5 rows in the window, 3 of them suspended => 2 rendered, cursor live.
      expect(firstPage.data).toHaveLength(2);
      expect(firstPage.data.length).toBeLessThan(5);
      expect(firstPage.nextCursor).not.toBeNull();

      // And the walk still reaches every remaining follower exactly once.
      const { seen } = await walk(
        `/users/${target.id}/followers`,
        viewer.token,
        5,
      );
      const expected = followers
        .filter((f) => !suspended.some((s) => s.id === f.id))
        .map((f) => f.id);

      expect(new Set(seen).size).toBe(seen.length);
      expect(new Set(seen)).toEqual(new Set(expected));
      expect(seen).toHaveLength(7);
    });
  });

  // ==========================================================================
  // Row shape and auth
  // ==========================================================================

  describe('row shape', () => {
    it('carries a profile summary with a computed age and no dateOfBirth', async () => {
      const [target, follower] = await Promise.all([
        activeUser(),
        activeUser('Ahmed Hassan'),
      ]);
      await put(`/users/${target.id}/follow`, follower.token).expect(204);

      const res = await get(
        `/users/${target.id}/followers`,
        target.token,
      ).expect(200);
      const body = asJson<ListBody<FollowRowBody>>(res);

      expect(body.data[0]).toEqual({
        id: follower.id,
        fullName: 'Ahmed Hassan',
        role: 'COACH',
        headline: null,
        avatarUrl: null,
        // `expect.any` is typed `any`; narrowed so the object literal does not
        // poison the whole assertion's type.
        age: expect.any(Number) as unknown,
        isFollowing: false,
      });
      expect(Number.isInteger(body.data[0].age)).toBe(true);

      // Absent, not merely different — a birth date on a list endpoint is the
      // same disclosure as one on a profile (§5).
      expect(JSON.stringify(res.body)).not.toContain('dateOfBirth');
      expect(JSON.stringify(res.body)).not.toContain('email');
    });
  });

  describe('authentication', () => {
    it.each([
      ['followers', (id: string) => `/users/${id}/followers`],
      ['following', (id: string) => `/users/${id}/following`],
    ])('401s an unauthenticated %s request', async (_label, path) => {
      const target = await activeUser();

      const res = await client()
        .get(`${path(target.id)}`)
        .expect(401);

      expect(asError(res).error.code).toBe('UNAUTHORIZED');
    });

    it('401s an unauthenticated follow', async () => {
      const target = await activeUser();

      await client().put(`/users/${target.id}/follow`).expect(401);
    });

    it('403s a PENDING_PROFILE caller — ProfileCompleteGuard covers all four routes', async () => {
      const [caller, target] = await Promise.all([activeUser(), activeUser()]);
      const pendingToken = tokenFor(caller.id, UserStatus.PENDING_PROFILE);

      const res = await put(`/users/${target.id}/follow`, pendingToken);

      expect(res.status).toBe(403);
      expect(asError(res).error.code).toBe('PROFILE_INCOMPLETE');

      await get(`/users/${target.id}/followers`, pendingToken).expect(403);
      await get(`/users/${target.id}/following`, pendingToken).expect(403);
      await del(`/users/${target.id}/follow`, pendingToken).expect(403);
    });
  });

  // ==========================================================================
  // GET /users/:id — viewer.isFollowing (Part 3)
  // ==========================================================================

  describe('GET /users/:id viewer block', () => {
    /**
     * The profile embed. Counters are read from the trigger-maintained columns
     * rather than counted at read time, so they are asserted against the same
     * `users` row the trigger writes.
     */
    it('reports isFollowing and the counters on a public profile', async () => {
      const [viewer, target] = await Promise.all([activeUser(), activeUser()]);

      const before = asJson<{
        viewer: { isSelf: boolean; isFollowing: boolean };
        followersCount: number;
      }>(await get(`/users/${target.id}`, viewer.token).expect(200));

      expect(before.viewer).toEqual({ isSelf: false, isFollowing: false });
      expect(before.followersCount).toBe(0);

      await put(`/users/${target.id}/follow`, viewer.token).expect(204);

      const after = asJson<{
        viewer: { isSelf: boolean; isFollowing: boolean };
        followersCount: number;
      }>(await get(`/users/${target.id}`, viewer.token).expect(200));

      expect(after.viewer).toEqual({ isSelf: false, isFollowing: true });
      expect(after.followersCount).toBe(1);
      expect(after.followersCount).toBe(
        (await counters(target.id)).followersCount,
      );
    });

    /**
     * The profile embed resolves `isFollowing` through a different query from
     * the list routes — `viewerFollowSelect` filters a relation, `hydrate`
     * runs a separate lookup — so the list-route equivalent of this test does
     * not cover it. Found by mutation testing: dropping `followerId` from the
     * relation filter left every other assertion in both suites green, because
     * they all use a target whose only follower IS the viewer.
     *
     * The target here has a follower who is NOT the viewer, which is the only
     * arrangement that separates "does the viewer follow them" from "does
     * anyone follow them".
     */
    it('reports isFollowing false when the target has a follower who is not the viewer', async () => {
      const [viewer, target, otherFollower] = await Promise.all([
        activeUser(),
        activeUser(),
        activeUser(),
      ]);

      await put(`/users/${target.id}/follow`, otherFollower.token).expect(204);

      const body = asJson<{
        viewer: { isSelf: boolean; isFollowing: boolean };
        followersCount: number;
      }>(await get(`/users/${target.id}`, viewer.token).expect(200));

      expect(body.followersCount).toBe(1);
      expect(body.viewer.isFollowing).toBe(false);
    });

    it('reports isFollowing false on the caller own profile', async () => {
      const viewer = await activeUser();

      const body = asJson<{ viewer: unknown }>(
        await get(`/users/${viewer.id}`, viewer.token).expect(200),
      );

      expect(body.viewer).toEqual({ isSelf: true, isFollowing: false });
    });
  });
});
