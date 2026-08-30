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
 * Posts (FR-POST) against the real Postgres 16 container.
 *
 * Three rules this suite follows, the same three `follows.e2e-spec.ts` states:
 *
 * 1. **Counters are the database's job.** Every counter assertion reads
 *    `posts.likes_count` as a COLUMN. Trusting the API response would let a
 *    service that computed the number on the fly pass a suite for a trigger
 *    that no longer fires.
 * 2. **The denormalised column is proved against its source.**
 *    `posts.author_role` is asserted EQUAL to `users.role`, as a column, for
 *    two different roles. NOT NULL catches a forgotten write; only this catches
 *    a wrong one, and a wrong one voids the entire justification for the column.
 * 3. **Response shapes are declared locally as wire types**, never imported
 *    from the module, so a change there cannot silently update the expectation.
 */

const SUITE = 'posts';
const COUNTRY_CODE = 'ZP';

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

interface ClubBody {
  id: number;
  nameEn: string;
  nameAr: string | null;
  shortNameEn: string | null;
  shortNameAr: string | null;
  logoUrl: string | null;
}

interface PostBody {
  id: string;
  content: string;
  postType: string;
  author: {
    id: string;
    fullName: string;
    role: string;
    age: number;
    isFollowing: boolean;
  };
  club: ClubBody | null;
  images: unknown[];
  likesCount: number;
  commentsCount: number;
  isLiked: boolean;
  isSaved: boolean;
  editedAt: string | null;
  createdAt: string;
}

describe('Posts (e2e, real Postgres)', () => {
  let ctx: E2eContext;
  let ref: ReferenceData;
  let jwt: JwtService;

  const client = () => new ApiClient(ctx.server);

  const tokenFor = (
    sub: string,
    role: UserRole,
    status: UserStatus = UserStatus.ACTIVE,
  ) => jwt.sign({ sub, role, status });

  async function activeUser(
    role: UserRole = UserRole.COACH,
    name = 'Post Fixture',
  ): Promise<Fixture> {
    const user = await ctx.prisma.user.create({
      data: {
        email: uniqueEmail(SUITE, 'pst'),
        passwordHash: '$2b$12$not.used.by.this.suite',
        fullName: name,
        role,
        dateOfBirth: new Date('1994-06-15'),
        countryId: ref.countryId,
        cityId: ref.cityId,
        status: UserStatus.ACTIVE,
      },
      select: { id: true, email: true, role: true },
    });
    return { ...user, token: tokenFor(user.id, user.role) };
  }

  /** A club admin plus the club they administer. One admin per club (A.2). */
  async function clubAdmin(
    clubName: string,
  ): Promise<Fixture & { clubId: number }> {
    const user = await activeUser(UserRole.CLUB_ADMIN, `${clubName} Admin`);
    const club = await ctx.prisma.club.create({
      data: {
        nameEn: clubName,
        nameAr: `${clubName} AR`,
        shortNameEn: clubName.slice(0, 3).toUpperCase(),
        countryId: ref.countryId,
      },
      select: { id: true },
    });
    await ctx.prisma.clubAdminProfile.create({
      data: { userId: user.id, clubId: club.id },
    });
    return { ...user, clubId: club.id };
  }

  const get = (path: string, token: string) =>
    client().get(path).set('Authorization', `Bearer ${token}`);
  const post = (path: string, token: string) =>
    client().post(path).set('Authorization', `Bearer ${token}`);
  const patch = (path: string, token: string) =>
    client().patch(path).set('Authorization', `Bearer ${token}`);
  const put = (path: string, token: string) =>
    client().put(path).set('Authorization', `Bearer ${token}`);
  const del = (path: string, token: string) =>
    client().delete(path).set('Authorization', `Bearer ${token}`);

  /** Straight from the row the trigger writes — never the response body. */
  const postRow = (id: string) =>
    ctx.prisma.post.findUniqueOrThrow({
      where: { id },
      select: {
        likesCount: true,
        commentsCount: true,
        authorRole: true,
        clubId: true,
        deletedAt: true,
        editedAt: true,
      },
    });

  async function createPost(
    author: Fixture,
    content = 'hello',
  ): Promise<string> {
    const res = await post('/posts', author.token)
      .send({ content })
      .expect(201);
    return asJson<PostBody>(res).id;
  }

  /** Posts written straight to the table, with timestamps we control. */
  async function seedPosts(
    author: Fixture,
    rows: { content: string; createdAt: string }[],
  ): Promise<void> {
    for (const row of rows) {
      await ctx.prisma.$executeRaw`
        INSERT INTO posts (id, author_id, author_role, post_type, content, created_at, updated_at)
        VALUES (gen_random_uuid(), ${author.id}::uuid, ${author.role}::user_role,
                'STANDARD', ${row.content}, ${row.createdAt}::timestamptz, now())
      `;
    }
  }

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
      const body = asJson<ListBody<PostBody>>(res);

      seen.push(...body.data.map((row) => row.id));
      pages.push({ size: body.data.length, cursor: body.nextCursor });

      cursor = body.nextCursor;
      if (cursor === null) return { seen, pages };
    }
    throw new Error('pagination did not terminate: cursor never went null');
  }

  /**
   * `posts.author_id` and `posts.club_id` are both onDelete: Restrict, so posts
   * must be removed BEFORE their authors and before the suite's clubs.
   * `post_likes` and `saved_posts` cascade from `posts`.
   */
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
  // POST /posts — content validation
  // ==========================================================================

  describe('POST /posts content validation', () => {
    it('accepts a single character', async () => {
      const author = await activeUser();
      const res = await post('/posts', author.token).send({ content: 'x' });
      expect(res.status).toBe(201);
      expect(asJson<PostBody>(res).content).toBe('x');
    });

    it('accepts exactly 3000 characters', async () => {
      const author = await activeUser();
      const content = 'a'.repeat(3000);
      const res = await post('/posts', author.token).send({ content });
      expect(res.status).toBe(201);
      expect(asJson<PostBody>(res).content).toHaveLength(3000);
    });

    it('rejects 3001 characters', async () => {
      const author = await activeUser();
      const res = await post('/posts', author.token)
        .send({ content: 'a'.repeat(3001) })
        .expect(400);
      expect(asError(res).error.code).toBe('VALIDATION_ERROR');
    });

    it('rejects whitespace-only content', async () => {
      const author = await activeUser();
      // The DTO trims BEFORE @Length, so this fails at the pipe with a 400
      // rather than reaching chk_post_content_not_blank and surfacing as a 500.
      const res = await post('/posts', author.token)
        .send({ content: '   \n\t  ' })
        .expect(400);
      expect(asError(res).error.code).toBe('VALIDATION_ERROR');
    });

    it('trims surrounding whitespace rather than storing it', async () => {
      const author = await activeUser();
      const res = await post('/posts', author.token).send({
        content: '  padded  ',
      });
      expect(asJson<PostBody>(res).content).toBe('padded');
    });
  });

  // ==========================================================================
  // author_role — the denormalisation, proved against its source
  // ==========================================================================

  describe('posts.author_role', () => {
    it.each([UserRole.PLAYER, UserRole.SCOUT])(
      'equals users.role for a %s author, read as a column',
      async (role) => {
        const author = await activeUser(role);
        const id = await createPost(author, `written by a ${role}`);

        const row = await postRow(id);
        const user = await ctx.prisma.user.findUniqueOrThrow({
          where: { id: author.id },
          select: { role: true },
        });

        // Asserted against users.role, not against the literal: a test that
        // hardcodes the expected role passes for a service that hardcodes it too.
        expect(row.authorRole).toBe(user.role);
        expect(row.authorRole).toBe(role);
      },
    );
  });

  // ==========================================================================
  // Club attribution (AC-06) — the escalation surface
  // ==========================================================================

  describe('club attribution', () => {
    it('sets club_id from the caller’s OWN admin profile', async () => {
      const admin = await clubAdmin('Zamalek E2E');
      const res = await post('/posts', admin.token)
        .send({ content: 'from the club', postAsClub: true })
        .expect(201);

      const body = asJson<PostBody>(res);
      expect(body.club?.id).toBe(admin.clubId);
      // Bilingual on the wire — an Arabic reader must not need a second fetch.
      expect(body.club?.nameEn).toBe('Zamalek E2E');
      expect(body.club?.nameAr).toBe('Zamalek E2E AR');

      expect((await postRow(body.id)).clubId).toBe(admin.clubId);
    });

    it('REFUSES a clubId in the body — it is never a source', async () => {
      const mine = await clubAdmin('Ahly E2E');
      const theirs = await clubAdmin('Ismaily E2E');

      // The escalation attempt: my token, my postAsClub, THEIR club id.
      const res = await post('/posts', mine.token).send({
        content: 'escalation',
        postAsClub: true,
        clubId: theirs.clubId,
      });

      // Both facts are gathered BEFORE either is asserted, deliberately. With
      // `.expect(400)` inline, a globally relaxed forbidNonWhitelisted would
      // fail on the status and never reach the rows check — and the rows check
      // is the half that still matters if the refusal ever becomes an ignore.
      const written = await ctx.prisma.post.count({
        where: { content: 'escalation' },
      });

      // forbidNonWhitelisted refuses the unknown property outright. This is
      // STRONGER than ignoring it: an ignored field is silently dropped, and a
      // client cannot tell whether it was honoured.
      expect(res.status).toBe(400);
      expect(asError(res).error.code).toBe('VALIDATION_ERROR');
      // Nothing written under EITHER club, whatever the status was.
      expect(written).toBe(0);
    });

    it('gives an admin their own club even when another club exists', async () => {
      const mine = await clubAdmin('Pyramids E2E');
      const theirs = await clubAdmin('Masry E2E');

      const res = await post('/posts', mine.token)
        .send({ content: 'mine only', postAsClub: true })
        .expect(201);

      const body = asJson<PostBody>(res);
      expect(body.club?.id).toBe(mine.clubId);
      expect(body.club?.id).not.toBe(theirs.clubId);
    });

    it('403s a non-CLUB_ADMIN sending postAsClub', async () => {
      const player = await activeUser(UserRole.PLAYER);
      const res = await post('/posts', player.token)
        .send({ content: 'not allowed', postAsClub: true })
        .expect(403);
      expect(asError(res).error.code).toBe('FORBIDDEN');
    });

    it('403s a CLUB_ADMIN with no club_admin_profiles row — not a 500', async () => {
      // The row IS the authorisation, so a token claiming CLUB_ADMIN without a
      // row must be refused, and refused cleanly. Gating on the JWT role first
      // and then dereferencing a null club is how this becomes a 500.
      const rowless = await activeUser(UserRole.CLUB_ADMIN);
      const res = await post('/posts', rowless.token)
        .send({ content: 'no profile row', postAsClub: true })
        .expect(403);
      expect(asError(res).error.code).toBe('FORBIDDEN');
    });

    it('leaves club null on an ordinary post', async () => {
      const admin = await clubAdmin('Smouha E2E');
      const res = await post('/posts', admin.token)
        .send({ content: 'as myself' })
        .expect(201);
      expect(asJson<PostBody>(res).club).toBeNull();
    });
  });

  // ==========================================================================
  // GET /posts/:id
  // ==========================================================================

  describe('GET /posts/:id', () => {
    it('returns the post with an empty images array', async () => {
      const author = await activeUser();
      const id = await createPost(author, 'readable');

      const body = asJson<PostBody>(
        await get(`/posts/${id}`, author.token).expect(200),
      );
      expect(body.id).toBe(id);
      expect(body.images).toEqual([]);
      expect(body.postType).toBe('STANDARD');
      expect(body.editedAt).toBeNull();
      expect(body.author.id).toBe(author.id);
    });

    it('404s a soft-deleted post', async () => {
      const author = await activeUser();
      const id = await createPost(author);
      await del(`/posts/${id}`, author.token).expect(204);

      const res = await get(`/posts/${id}`, author.token).expect(404);
      expect(asError(res).error.code).toBe('NOT_FOUND');
    });

    it('404s a post whose author is SUSPENDED', async () => {
      const author = await activeUser();
      const viewer = await activeUser();
      const id = await createPost(author);

      await ctx.prisma.user.update({
        where: { id: author.id },
        data: { status: UserStatus.SUSPENDED },
      });

      const res = await get(`/posts/${id}`, viewer.token).expect(404);
      expect(asError(res).error.code).toBe('NOT_FOUND');
    });

    it('never returns canManage', async () => {
      const author = await activeUser();
      const id = await createPost(author);
      const body = asJson<Record<string, unknown>>(
        await get(`/posts/${id}`, author.token).expect(200),
      );
      expect(body).not.toHaveProperty('canManage');
    });
  });

  // ==========================================================================
  // PATCH /posts/:id
  // ==========================================================================

  describe('PATCH /posts/:id', () => {
    it('sets editedAt, which is null until edited', async () => {
      const author = await activeUser();
      const id = await createPost(author, 'before');
      expect((await postRow(id)).editedAt).toBeNull();

      const body = asJson<PostBody>(
        await patch(`/posts/${id}`, author.token)
          .send({ content: 'after' })
          .expect(200),
      );
      expect(body.content).toBe('after');
      expect(body.editedAt).not.toBeNull();
      expect((await postRow(id)).editedAt).not.toBeNull();
    });

    it('404s someone else’s post — NOT 403', async () => {
      const author = await activeUser();
      const stranger = await activeUser();
      const id = await createPost(author, 'not yours');

      const res = await patch(`/posts/${id}`, stranger.token)
        .send({ content: 'hijacked' })
        .expect(404);
      expect(asError(res).error.code).toBe('NOT_FOUND');

      // A 403 would confirm the post exists. Prove nothing changed, too.
      const unchanged = await ctx.prisma.post.findUniqueOrThrow({
        where: { id },
        select: { content: true },
      });
      expect(unchanged.content).toBe('not yours');
    });

    it('404s your OWN soft-deleted post — a deleted post is not editable', async () => {
      const author = await activeUser();
      const id = await createPost(author, 'original');
      await del(`/posts/${id}`, author.token).expect(204);

      const res = await patch(`/posts/${id}`, author.token)
        .send({ content: 'resurrected' })
        .expect(404);
      expect(asError(res).error.code).toBe('NOT_FOUND');

      // The 404 alone does NOT prove the post was left alone. Source mutation
      // found this: dropping `deletedAt: null` from the update's WHERE still
      // yields a 404, because the row IS edited and the follow-up read then
      // filters it out. The write happened; only the response hid it. So the
      // row itself is asserted, not just the status code.
      const row = await ctx.prisma.post.findUniqueOrThrow({
        where: { id },
        select: { content: true, editedAt: true },
      });
      expect(row.content).toBe('original');
      expect(row.editedAt).toBeNull();
    });

    it('does not accept postAsClub on an edit', async () => {
      const admin = await clubAdmin('Ittihad E2E');
      const id = await createPost(admin, 'plain');
      // UpdatePostDto is deliberately not PartialType(CreatePostDto):
      // attribution is fixed at creation (AC-06).
      await patch(`/posts/${id}`, admin.token)
        .send({ content: 'edited', postAsClub: true })
        .expect(400);
    });
  });

  // ==========================================================================
  // DELETE /posts/:id
  // ==========================================================================

  describe('DELETE /posts/:id', () => {
    it('is idempotent: 204 both times', async () => {
      const author = await activeUser();
      const id = await createPost(author);

      await del(`/posts/${id}`, author.token).expect(204);
      // The surprising one. The caller asserts a STATE, not an event, so a
      // second delete is a no-op rather than a 404 the client must handle.
      await del(`/posts/${id}`, author.token).expect(204);

      expect((await postRow(id)).deletedAt).not.toBeNull();
    });

    it('404s someone else’s post', async () => {
      const author = await activeUser();
      const stranger = await activeUser();
      const id = await createPost(author);

      const res = await del(`/posts/${id}`, stranger.token).expect(404);
      expect(asError(res).error.code).toBe('NOT_FOUND');
      expect((await postRow(id)).deletedAt).toBeNull();
    });

    it('404s an id that belongs to nobody', async () => {
      const author = await activeUser();
      await del(
        '/posts/00000000-0000-4000-8000-000000000000',
        author.token,
      ).expect(404);
    });
  });

  // ==========================================================================
  // Likes and saves
  // ==========================================================================

  describe('likes', () => {
    it('liking twice leaves likes_count at 1 — asserted as a COLUMN', async () => {
      const author = await activeUser();
      const liker = await activeUser();
      const id = await createPost(author);

      await put(`/posts/${id}/like`, liker.token).expect(204);
      await put(`/posts/${id}/like`, liker.token).expect(204);

      // The trigger test. On conflict no row is inserted, so
      // trg_post_likes_count never fires a second time.
      expect((await postRow(id)).likesCount).toBe(1);
      expect(await ctx.prisma.postLike.count({ where: { postId: id } })).toBe(
        1,
      );
    });

    it('unliking a post never liked is 204 and leaves the count at 0', async () => {
      const author = await activeUser();
      const stranger = await activeUser();
      const id = await createPost(author);

      await del(`/posts/${id}/like`, stranger.token).expect(204);
      expect((await postRow(id)).likesCount).toBe(0);
    });

    it('unlike decrements the counter', async () => {
      const author = await activeUser();
      const liker = await activeUser();
      const id = await createPost(author);

      await put(`/posts/${id}/like`, liker.token).expect(204);
      expect((await postRow(id)).likesCount).toBe(1);
      await del(`/posts/${id}/like`, liker.token).expect(204);
      expect((await postRow(id)).likesCount).toBe(0);
    });

    it('permits liking your own post', async () => {
      const author = await activeUser();
      const id = await createPost(author);
      await put(`/posts/${id}/like`, author.token).expect(204);
      expect((await postRow(id)).likesCount).toBe(1);
    });

    it('404s a like on a soft-deleted post', async () => {
      const author = await activeUser();
      const liker = await activeUser();
      const id = await createPost(author);
      await del(`/posts/${id}`, author.token).expect(204);

      await put(`/posts/${id}/like`, liker.token).expect(404);
      // Unlike DELETE /users/:id/follow, this 404s too: here the POST's
      // existence is what is being asserted, not the caller's own edge.
      await del(`/posts/${id}/like`, liker.token).expect(404);
    });
  });

  describe('saves', () => {
    it('saving twice is 204 and writes one row', async () => {
      const author = await activeUser();
      const saver = await activeUser();
      const id = await createPost(author);

      await put(`/posts/${id}/save`, saver.token).expect(204);
      await put(`/posts/${id}/save`, saver.token).expect(204);

      expect(await ctx.prisma.savedPost.count({ where: { postId: id } })).toBe(
        1,
      );
    });

    it('unsaving something never saved is 204', async () => {
      const author = await activeUser();
      const stranger = await activeUser();
      const id = await createPost(author);
      await del(`/posts/${id}/save`, stranger.token).expect(204);
    });
  });

  // ==========================================================================
  // isLiked / isSaved — the D-010 arrangement
  // ==========================================================================

  describe('viewer state', () => {
    it('reports the VIEWER’s like, not somebody else’s', async () => {
      const author = await activeUser();
      const viewer = await activeUser();
      const other = await activeUser();
      const id = await createPost(author);

      // The arrangement source mutation exposed in D-010: the ONLY liker is
      // someone OTHER than the viewer. A test whose only liker is the viewer
      // cannot tell a correct filter from a missing one — both return true.
      await put(`/posts/${id}/like`, other.token).expect(204);
      await put(`/posts/${id}/save`, other.token).expect(204);

      const body = asJson<PostBody>(
        await get(`/posts/${id}`, viewer.token).expect(200),
      );
      expect(body.isLiked).toBe(false);
      expect(body.isSaved).toBe(false);
      expect(body.likesCount).toBe(1);

      const asOther = asJson<PostBody>(
        await get(`/posts/${id}`, other.token).expect(200),
      );
      expect(asOther.isLiked).toBe(true);
      expect(asOther.isSaved).toBe(true);
    });

    it('reports the viewer’s follow state for the AUTHOR, not anyone else’s', async () => {
      const author = await activeUser();
      const viewer = await activeUser();
      const other = await activeUser();
      const id = await createPost(author);

      // The D-010 arrangement, applied to isFollowing: the author's ONLY
      // follower is someone OTHER than the viewer. A test where the viewer is
      // the only follower cannot tell a correct filter from a missing one.
      await put(`/users/${author.id}/follow`, other.token).expect(204);

      const seen = asJson<PostBody>(
        await get(`/posts/${id}`, viewer.token).expect(200),
      );
      expect(seen.author.isFollowing).toBe(false);

      await put(`/users/${author.id}/follow`, viewer.token).expect(204);
      const after = asJson<PostBody>(
        await get(`/posts/${id}`, viewer.token).expect(200),
      );
      expect(after.author.isFollowing).toBe(true);

      // And on the list path, which must agree — one shape, not two.
      const list = asJson<ListBody<PostBody>>(
        await get(`/users/${author.id}/posts`, viewer.token).expect(200),
      );
      expect(list.data.find((row) => row.id === id)?.author.isFollowing).toBe(
        true,
      );
    });

    it('reports isFollowing false on your OWN post (no self-follow exists)', async () => {
      const author = await activeUser();
      const id = await createPost(author);
      const own = asJson<PostBody>(
        await get(`/posts/${id}`, author.token).expect(200),
      );
      expect(own.author.isFollowing).toBe(false);
    });

    it('reports the viewer’s state on the LIST route too', async () => {
      const author = await activeUser();
      const viewer = await activeUser();
      const other = await activeUser();
      const id = await createPost(author);

      await put(`/posts/${id}/like`, other.token).expect(204);

      const list = asJson<ListBody<PostBody>>(
        await get(`/users/${author.id}/posts`, viewer.token).expect(200),
      );
      const row = list.data.find((item) => item.id === id);
      expect(row?.isLiked).toBe(false);

      const asOther = asJson<ListBody<PostBody>>(
        await get(`/users/${author.id}/posts`, other.token).expect(200),
      );
      expect(asOther.data.find((item) => item.id === id)?.isLiked).toBe(true);
    });
  });

  // ==========================================================================
  // GET /users/:id/posts
  // ==========================================================================

  describe('GET /users/:id/posts', () => {
    it('omits soft-deleted posts', async () => {
      const author = await activeUser();
      const viewer = await activeUser();
      const kept = await createPost(author, 'kept');
      const gone = await createPost(author, 'gone');
      await del(`/posts/${gone}`, author.token).expect(204);

      const { seen } = await walk(
        `/users/${author.id}/posts`,
        viewer.token,
        20,
      );
      expect(seen).toContain(kept);
      expect(seen).not.toContain(gone);
    });

    it('404s an unknown author', async () => {
      const viewer = await activeUser();
      await get(
        '/users/00000000-0000-4000-8000-000000000000/posts',
        viewer.token,
      ).expect(404);
    });

    it('404s a SUSPENDED author', async () => {
      const author = await activeUser();
      const viewer = await activeUser();
      await createPost(author);
      await ctx.prisma.user.update({
        where: { id: author.id },
        data: { status: UserStatus.SUSPENDED },
      });
      await get(`/users/${author.id}/posts`, viewer.token).expect(404);
    });

    it('rejects a malformed cursor with 400', async () => {
      const author = await activeUser();
      const res = await get(
        `/users/${author.id}/posts?cursor=not-a-cursor`,
        author.token,
      ).expect(400);
      expect(asError(res).error.code).toBe('VALIDATION_ERROR');
    });

    it('does not drop rows separated by microseconds inside one millisecond', async () => {
      const author = await activeUser();
      const viewer = await activeUser();

      // Same millisecond (.123), different microseconds. A cursor encoded
      // through a JavaScript Date truncates to .123000, and the two later rows
      // then fail the comparison on this page and every page after it —
      // silently, and invisibly to any boundary-collision test.
      await seedPosts(author, [
        { content: 'micro-a', createdAt: '2026-04-01 08:00:00.123111+00' },
        { content: 'micro-b', createdAt: '2026-04-01 08:00:00.123456+00' },
        { content: 'micro-c', createdAt: '2026-04-01 08:00:00.123789+00' },
      ]);

      const { seen, pages } = await walk(
        `/users/${author.id}/posts`,
        viewer.token,
        1,
      );

      expect(seen).toHaveLength(3);
      expect(new Set(seen).size).toBe(3);
      // Four pages at limit=1: three rows then the empty terminating page.
      expect(pages.length).toBeGreaterThanOrEqual(3);
    });

    it('walks two pages without repeating or skipping', async () => {
      const author = await activeUser();
      const viewer = await activeUser();

      await seedPosts(author, [
        { content: 'p1', createdAt: '2026-05-01 10:00:00.000001+00' },
        { content: 'p2', createdAt: '2026-05-01 10:00:00.000002+00' },
        { content: 'p3', createdAt: '2026-05-01 10:00:00.000003+00' },
        { content: 'p4', createdAt: '2026-05-01 10:00:00.000004+00' },
      ]);

      const { seen, pages } = await walk(
        `/users/${author.id}/posts`,
        viewer.token,
        2,
      );

      expect(seen).toHaveLength(4);
      expect(new Set(seen).size).toBe(4);
      expect(pages[0].size).toBe(2);
      expect(pages[0].cursor).not.toBeNull();
    });

    it('returns newest first', async () => {
      const author = await activeUser();
      const viewer = await activeUser();

      await seedPosts(author, [
        { content: 'older', createdAt: '2026-06-01 10:00:00+00' },
        { content: 'newer', createdAt: '2026-06-02 10:00:00+00' },
      ]);

      const body = asJson<ListBody<PostBody>>(
        await get(`/users/${author.id}/posts`, viewer.token).expect(200),
      );
      expect(body.data[0].content).toBe('newer');
      expect(body.data[1].content).toBe('older');
      expect(body.nextCursor).toBeNull();
    });
  });
});
