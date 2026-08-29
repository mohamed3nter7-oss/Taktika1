import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ErrorCode } from '../../common/errors/error-codes';
import {
  decodeTimeUuidCursor,
  encodeTimeUuidCursor,
  type TimeUuidCursor,
} from '../../common/pagination/cursor';
import { PrismaService } from '../../common/prisma/prisma.service';
import { Prisma } from '../../generated/prisma/client';
import type { AuthenticatedUser } from '../../common/types/authenticated-user';
import { ProfilesService } from '../profiles/profiles.service';
import { CreatePostDto } from './dto/create-post.dto';
import { ListPostsQueryDto } from './dto/list-posts.dto';
import { UpdatePostDto } from './dto/update-post.dto';
import {
  POST_SELECT,
  mapPost,
  type PostView,
  type ViewerPostState,
} from './post.map';

const DEFAULT_PAGE = 20;

/** One row of the keyset window: `posts` alone, no join. */
interface WindowRow {
  id: string;
  /** `created_at::text` — Postgres' own rendering, never a Date. See cursor.ts. */
  createdAt: string;
}

/**
 * Posts (FR-POST): the `posts` table plus `post_images`, `post_likes` and
 * `saved_posts` (§4 — this module's tables).
 *
 * Likes and saves are NOT separate modules. D-006's boundary test is whether a
 * table has routes with their own identity; `post_likes` has no id, no
 * standalone route and no lifecycle apart from its post. `comments` passes that
 * test and gets its own module.
 *
 * Text-only in this commit. `images` is always `[]` on the wire.
 */
@Injectable()
export class PostsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly profiles: ProfilesService,
  ) {}

  // ===========================================================================
  // Writes
  // ===========================================================================

  /**
   * `author_role` is set from the VERIFIED JWT claim, and that is a deliberate
   * choice recorded in D-022 rather than a shortcut.
   *
   * The column is a denormalisation of `users.role`, justified entirely by role
   * being IMMUTABLE (root §5) — chosen at registration, no UI path, no API
   * path. The same invariant is what makes the claim trustworthy: a 15-minute
   * token cannot carry a stale value for a field nothing can change, and
   * `AuthenticatedUser` is already the only identity source in the application
   * (§9). Reading `users.role` here would add a round trip to buy a guarantee
   * immutability already provides.
   *
   * NOT NULL catches a write that FORGETS this. It cannot catch a write that
   * gets it WRONG — a hardcoded role satisfies the constraint and is silently
   * wrong forever. The e2e assertion that `posts.author_role` equals
   * `users.role`, read as a column, is the only guard against that.
   */
  async create(user: AuthenticatedUser, dto: CreatePostDto): Promise<PostView> {
    const clubId = dto.postAsClub ? await this.resolveOwnClub(user.sub) : null;

    const post = await this.prisma.post.create({
      data: {
        authorId: user.sub,
        authorRole: user.role,
        clubId,
        content: dto.content,
      },
      select: POST_SELECT,
    });

    // A brand-new post cannot be liked or saved by anyone, including its author
    // — so this is the one read that can skip the viewer-state query without
    // introducing a second way of computing those two fields.
    return mapPost(post, { liked: new Set(), saved: new Set() });
  }

  /**
   * Club attribution (AC-06), the highest-risk path in this module.
   *
   * THE `club_admin_profiles` ROW IS THE AUTHORISATION. There is deliberately
   * no `user.role === CLUB_ADMIN` check in front of this lookup: that would be
   * two sources of truth for one decision, and the token is the weaker of them.
   * One lookup answers both failure modes — not a club admin at all, and a club
   * admin whose profile row is missing — and the second is the one that would
   * otherwise be a 500 on a null dereference rather than a 403.
   *
   * The club is read from the caller's OWN profile and never from the request.
   * `CreatePostDto` declares no `clubId`, so `forbidNonWhitelisted` already
   * refuses a body carrying one with a 400 before this runs.
   *
   * FORBIDDEN, not a new error code: a legitimate client never reaches this
   * path because the UI does not offer the control to non-admins, so it needs
   * no dedicated user-facing message.
   */
  private async resolveOwnClub(userId: string): Promise<number> {
    const clubId = await this.profiles.clubIdForAdmin(userId);
    if (clubId === null) {
      throw new ForbiddenException({
        code: ErrorCode.FORBIDDEN,
        message: 'Only a club administrator can post as a club.',
      });
    }
    return clubId;
  }

  /**
   * Ownership is the WHERE clause, not a read followed by a comparison.
   *
   * `updateMany` matching zero rows covers "not yours", "does not exist" and
   * "already deleted" with one query and no read-then-write race. All three
   * answer 404, never 403: a 403 would confirm the post exists, which is the
   * existence oracle root §5 forbids.
   *
   * A soft-deleted post of the caller's OWN is also 404 here, and that is
   * SPECIFIED rather than incidental — a deleted post is not editable. Note the
   * asymmetry with `remove` below, which has a fallback branch for exactly that
   * case; PATCH deliberately has none.
   */
  async update(
    viewerId: string,
    id: string,
    dto: UpdatePostDto,
  ): Promise<PostView> {
    const { count } = await this.prisma.post.updateMany({
      where: { id, authorId: viewerId, deletedAt: null },
      data: { content: dto.content, editedAt: new Date() },
    });
    if (count === 0) throw this.notFound();

    // No time window on editing (D-025): a post is editable at any age.
    return this.findOne(viewerId, id);
  }

  /**
   * Soft delete, and IDEMPOTENT — deleting an already-deleted post is a 204.
   *
   * This is the surprising choice, so: the caller is asserting a STATE ("this
   * post is gone"), not an event ("I pressed delete"). Asserting it twice is
   * not a conflict, and a 404 on the second call would force every client to
   * handle a double-tap race it cannot prevent. Same reasoning as
   * `FollowsService.unfollow`.
   *
   * It is NOT a blanket 204 though, and that is where it differs from unfollow:
   * a post belonging to someone else, or to nobody, is still a 404. The
   * fallback query below is what separates "already yours and gone" from those.
   * It runs only when the update matched nothing, so the happy path stays one
   * query.
   */
  async remove(viewerId: string, id: string): Promise<void> {
    const { count } = await this.prisma.post.updateMany({
      where: { id, authorId: viewerId, deletedAt: null },
      data: { deletedAt: new Date() },
    });
    if (count > 0) return;

    const own = await this.prisma.post.findFirst({
      where: { id, authorId: viewerId },
      select: { id: true },
    });
    if (!own) throw this.notFound();
    // Found, therefore already soft-deleted by this same caller: 204.
  }

  // ===========================================================================
  // Likes and saves
  // ===========================================================================

  /**
   * `INSERT ... ON CONFLICT DO NOTHING`, which is what `createMany` +
   * `skipDuplicates` compiles to. Liking an already-liked post is a 204.
   *
   * COUNTER CORRECTNESS FALLS OUT OF THIS rather than being maintained: on
   * conflict no row is inserted, so `trg_post_likes_count` never fires, so a
   * double-like cannot double `likes_count`. Nothing in this module writes that
   * column, and nothing should.
   *
   * `upsert` would be wrong. With an empty `update` it does not reliably
   * compile to `ON CONFLICT`, leaving a P2002 race; and an `update` that
   * touched `createdAt` would silently reorder the row in any future listing
   * keyed on it.
   *
   * Self-like is permitted. No CHECK, no guard.
   */
  async like(viewerId: string, postId: string): Promise<void> {
    await this.assertPostVisible(postId);
    await this.prisma.postLike.createMany({
      data: [{ userId: viewerId, postId }],
      skipDuplicates: true,
    });
  }

  /** Idempotent: `deleteMany` matching nothing is not an error. */
  async unlike(viewerId: string, postId: string): Promise<void> {
    await this.assertPostVisible(postId);
    await this.prisma.postLike.deleteMany({
      where: { userId: viewerId, postId },
    });
  }

  /** Same construction as `like`. `saved_posts` has no counter trigger. */
  async save(viewerId: string, postId: string): Promise<void> {
    await this.assertPostVisible(postId);
    await this.prisma.savedPost.createMany({
      data: [{ userId: viewerId, postId }],
      skipDuplicates: true,
    });
  }

  async unsave(viewerId: string, postId: string): Promise<void> {
    await this.assertPostVisible(postId);
    await this.prisma.savedPost.deleteMany({
      where: { userId: viewerId, postId },
    });
  }

  // ===========================================================================
  // Reads
  // ===========================================================================

  async findOne(viewerId: string, id: string): Promise<PostView> {
    const post = await this.prisma.post.findFirst({
      where: { id, deletedAt: null },
      select: POST_SELECT,
    });
    if (!post) throw this.notFound();

    // The author's visibility is the profiles module's rule, not this one's
    // (§4). A post by a SUSPENDED or DELETED author reads as 404, matching
    // GET /users/:id.
    await this.profiles.assertUserVisible(post.authorId);

    return mapPost(post, await this.viewerStateFor(viewerId, [post.id]));
  }

  /**
   * One page of an author's posts, newest first, over `idx_posts_author`.
   *
   * Three queries regardless of page size: the keyset window, the hydration,
   * and one viewer-state lookup for the whole page.
   */
  async listByAuthor(
    authorId: string,
    viewerId: string,
    query: ListPostsQueryDto,
  ): Promise<{ data: PostView[]; nextCursor: string | null }> {
    await this.profiles.assertUserVisible(authorId);

    const limit = query.limit ?? DEFAULT_PAGE;
    const window = await this.fetchWindow(
      authorId,
      this.decodeCursor(query.cursor),
      limit,
    );

    // The extra row is a probe for "is there a next page", never returned —
    // this is what stops a cursor being handed out for an empty next page.
    const page = window.slice(0, limit);
    const last = page[page.length - 1];
    const nextCursor =
      window.length > limit && last
        ? encodeTimeUuidCursor({ createdAt: last.createdAt, id: last.id })
        : null;

    return { data: await this.hydrate(page, viewerId), nextCursor };
  }

  /**
   * The keyset window. `$queryRaw` rather than the typed API, for the reason
   * D-007 records: Prisma cannot express a row-value comparison, and the
   * OR-decomposed form it does emit plans as a Bitmap Heap Scan with the
   * comparison under FILTER plus a Sort.
   *
   * EVERY COLUMN IS QUALIFIED WITH `p.`, AND THAT IS LOAD-BEARING RATHER THAN
   * TIDY. An UNQUALIFIED identifier in ORDER BY resolves against the OUTPUT
   * column names before the input columns, so a bare `created_at` beside
   * `SELECT created_at::text AS "createdAt"` is one rename away from binding
   * the sort to a TEXT CAST. `p.created_at` cannot: a qualified name can only
   * mean the table's column.
   *
   * That matters because the failure it prevents is INVISIBLE TO TESTS.
   * Measured, not reasoned — ordering by the text cast on 5,000 rows gives a
   * Sort node reading 802 rows to return 21, where the correct binding is an
   * Index Only Scan reading exactly 21. All 40 tests still pass either way,
   * because `timestamptz::text` renders `YYYY-MM-DD HH:MM:SS.ffffff+00`, whose
   * lexical order agrees with chronological order in every practical case: the
   * query returns THE SAME ROWS IN THE SAME ORDER while reading an author's
   * entire history to produce twenty of them.
   *
   * So the protection here is the SYNTAX, not the suite. Qualification makes
   * the bug unwritable by accident; nothing would catch it if someone wrote it
   * deliberately.
   *
   * Deleting the `AS "createdAt"` alias is a different matter and IS caught:
   * `WindowRow.createdAt` becomes undefined, the cursor encodes garbage, and
   * two keyset tests fail on the second page.
   *
   * `created_at::text` out and `::timestamptz` back in keep the microseconds
   * intact; see `TimeUuidCursor` for what a JavaScript Date costs here.
   *
   * Every value is a bound parameter via the tagged template.
   */
  private fetchWindow(
    authorId: string,
    cursor: TimeUuidCursor | null,
    limit: number,
  ): Promise<WindowRow[]> {
    const keyset = cursor
      ? Prisma.sql`AND (p.created_at, p.id) < (${cursor.createdAt}::timestamptz, ${cursor.id}::uuid)`
      : Prisma.empty;

    return this.prisma.$queryRaw<WindowRow[]>`
      SELECT p.id, p.created_at::text AS "createdAt"
      FROM posts p
      WHERE p.author_id = ${authorId}::uuid
        AND p.deleted_at IS NULL
      ${keyset}
      ORDER BY p.created_at DESC, p.id DESC
      LIMIT ${limit + 1}
    `;
  }

  /** Window → wire, preserving the window's order. */
  private async hydrate(
    page: WindowRow[],
    viewerId: string,
  ): Promise<PostView[]> {
    if (page.length === 0) return [];
    const ids = page.map((row) => row.id);

    const [posts, viewer] = await Promise.all([
      this.prisma.post.findMany({
        where: { id: { in: ids } },
        select: POST_SELECT,
      }),
      this.viewerStateFor(viewerId, ids),
    ]);

    const byId = new Map(posts.map((post) => [post.id, post]));
    const now = new Date();

    // Re-ordered from the window, not from `posts`: an `IN` list comes back in
    // whatever order the planner produced, which would scramble the page.
    return ids.flatMap((id) => {
      const post = byId.get(id);
      return post ? [mapPost(post, viewer, now)] : [];
    });
  }

  /**
   * The viewer's like and save state for a set of posts — ONE implementation,
   * used by both `findOne` (a one-element array) and `hydrate`.
   *
   * That is the whole point. D-010 records `isFollowing` being computed in two
   * places as standing debt, and the divergence there was found only by source
   * mutation AFTER 185 tests passed green. Paying `findOne` two extra queries
   * is cheaper than owning that shape twice.
   *
   * `Promise.all`, not two sequential awaits: the lookups are independent, and
   * two round-trips of latency where one would do is the easiest thing in this
   * module to get wrong and the hardest to notice.
   *
   * This is also the anti-N+1 shape — one query per relation for the whole
   * page, never one probe per row.
   */
  private async viewerStateFor(
    viewerId: string,
    postIds: string[],
  ): Promise<ViewerPostState> {
    if (postIds.length === 0) {
      return { liked: new Set(), saved: new Set() };
    }

    const [likes, saves] = await Promise.all([
      this.prisma.postLike.findMany({
        where: { userId: viewerId, postId: { in: postIds } },
        select: { postId: true },
      }),
      this.prisma.savedPost.findMany({
        where: { userId: viewerId, postId: { in: postIds } },
        select: { postId: true },
      }),
    ]);

    return {
      liked: new Set(likes.map((row) => row.postId)),
      saved: new Set(saves.map((row) => row.postId)),
    };
  }

  // ===========================================================================
  // Internals
  // ===========================================================================

  /**
   * A post must exist, be live, and have a visible author before it can be
   * liked or saved.
   *
   * Note the asymmetry with `FollowsService.unfollow`, which never 404s: there
   * the caller is withdrawing THEIR OWN edge and must always be able to, or the
   * row is stranded and their following count is permanently wrong. Here the
   * POST's existence is the thing being asserted, so a soft-deleted post is a
   * 404 on unlike and unsave too.
   */
  private async assertPostVisible(postId: string): Promise<void> {
    const post = await this.prisma.post.findFirst({
      where: { id: postId, deletedAt: null },
      select: { authorId: true },
    });
    if (!post) throw this.notFound();
    await this.profiles.assertUserVisible(post.authorId);
  }

  private decodeCursor(raw: string | undefined): TimeUuidCursor | null {
    if (raw === undefined) return null;
    const cursor = decodeTimeUuidCursor(raw);
    if (!cursor) {
      throw new BadRequestException({
        code: ErrorCode.VALIDATION_ERROR,
        message: 'cursor is not a valid pagination token.',
      });
    }
    return cursor;
  }

  private notFound(): NotFoundException {
    return new NotFoundException({
      code: ErrorCode.NOT_FOUND,
      message: 'Post not found.',
    });
  }
}
