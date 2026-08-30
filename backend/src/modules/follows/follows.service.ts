import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ErrorCode } from '../../common/errors/error-codes';
import {
  decodeTimeUuidCursor,
  encodeTimeUuidCursor,
  type TimeUuidCursor,
} from '../../common/pagination/cursor';
import { Prisma, UserStatus } from '../../generated/prisma/client';
import { PrismaService } from '../../common/prisma/prisma.service';
import {
  PROFILE_SUMMARY_SELECT,
  mapProfileSummary,
} from '../profiles/profile-summary.map';
import { followedSubset, type FollowAwareSummary } from './follows.map';
import { ProfilesService } from '../profiles/profiles.service';
import { ListFollowsQueryDto } from './dto/list-follows.dto';

const DEFAULT_PAGE = 20;

/** One row of the keyset window: the follows table only, no join. */
interface WindowRow {
  userId: string;
  /** `created_at::text` — Postgres' own rendering, never a Date. See cursor.ts. */
  createdAt: string;
}

/**
 * Re-exported under this module's own name: the shape is defined once in
 * follows.map.ts so `posts` renders a post author identically (D-010).
 */
export type FollowRow = FollowAwareSummary;

type Direction = 'followers' | 'following';

/**
 * The social graph (FR-FOLW): asymmetric follows, no approvals, no pending
 * state. Four routes, and the first real keyset pagination in the codebase —
 * `career` is capped at 100 rows with no cursor (§17 D-005) and is explicitly
 * not a precedent.
 *
 * Both writes are IDEMPOTENT and neither reads before writing. A follow is a
 * state assertion ("I follow this person"), not an event ("I pressed follow"),
 * so asserting it twice is not a conflict. A 409 would force every caller to
 * handle a race it cannot prevent, and find-then-write IS that race.
 */
@Injectable()
export class FollowsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly profiles: ProfilesService,
  ) {}

  // ===========================================================================
  // Writes
  // ===========================================================================

  /**
   * `INSERT ... ON CONFLICT DO NOTHING`, which is what `createMany` +
   * `skipDuplicates` compiles to. Following someone already followed is a 204.
   *
   * The counter correctness falls out of this rather than being maintained: on
   * conflict no row is inserted, so `trg_follow_counts` does not fire, so a
   * second follow cannot double the count. `upsert` would be wrong here — with
   * an empty `update` it does not reliably compile to `ON CONFLICT`, leaving a
   * P2002 race, and an `update` that touched `createdAt` would silently move the
   * row to the front of everyone's keyset.
   */
  async follow(followerId: string, followingId: string): Promise<void> {
    this.assertNotSelf(followerId, followingId);

    // Unknown, suspended, deleted and both PENDING_* targets are all 404 — the
    // profiles seam owns that rule (§4), so it is not restated here.
    await this.profiles.assertUserVisible(followingId);

    try {
      await this.prisma.follow.createMany({
        data: [{ followerId, followingId }],
        skipDuplicates: true,
      });
    } catch (error) {
      // The target was deleted between the visibility check and the insert.
      // Same answer as if it had never existed.
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2003'
      ) {
        throw this.notFound();
      }
      throw error;
    }
  }

  /**
   * Idempotent by construction: `deleteMany` matching nothing is not an error,
   * so unfollowing someone you never followed is a 204.
   *
   * DELIBERATELY does NOT call `assertUserVisible`. Gating an unfollow on the
   * target being visible would make a suspended user impossible to unfollow —
   * the row would be stranded and the caller's `followingCount` permanently
   * inflated with no path to correct it. The caller must always be able to
   * withdraw their own edge, whatever happened to the other end of it.
   *
   * A uniform 204 is also not an existence oracle: it reveals nothing about
   * whether the target exists, and neither does any other outcome.
   */
  async unfollow(followerId: string, followingId: string): Promise<void> {
    await this.prisma.follow.deleteMany({ where: { followerId, followingId } });
  }

  // ===========================================================================
  // Reads
  // ===========================================================================

  /** Who follows `targetId`. Ordered newest-first over `idx_follows_following`. */
  async listFollowers(
    targetId: string,
    viewerId: string,
    query: ListFollowsQueryDto,
  ) {
    return this.listEdges(targetId, viewerId, query, 'followers');
  }

  /** Who `targetId` follows. Ordered newest-first over `idx_follows_follower`. */
  async listFollowing(
    targetId: string,
    viewerId: string,
    query: ListFollowsQueryDto,
  ) {
    return this.listEdges(targetId, viewerId, query, 'following');
  }

  /**
   * One page of the graph, in exactly three queries regardless of page size:
   *
   *   1. the keyset window over `follows` alone (raw — see `fetchWindow`)
   *   2. one hydration of the page's users
   *   3. one follow-back lookup for the whole page
   *
   * Step 3 is the N+1 that is NOT here, and the shape every later module should
   * copy: fetch the viewer's edges for the page's ids in a single query and map
   * them, never one probe per row.
   */
  private async listEdges(
    targetId: string,
    viewerId: string,
    query: ListFollowsQueryDto,
    direction: Direction,
  ): Promise<{ data: FollowRow[]; nextCursor: string | null }> {
    await this.profiles.assertUserVisible(targetId);

    const limit = query.limit ?? DEFAULT_PAGE;
    const cursor = this.decodeCursor(query.cursor);

    const window = await this.fetchWindow(targetId, cursor, limit, direction);

    // The extra row is a probe for "is there a next page", never returned. This
    // is what stops a cursor being handed out for an empty next page.
    const page = window.slice(0, limit);
    const last = page[page.length - 1];
    const nextCursor =
      window.length > limit && last
        ? encodeTimeUuidCursor({ createdAt: last.createdAt, id: last.userId })
        : null;

    return { data: await this.hydrate(page, viewerId), nextCursor };
  }

  /**
   * The keyset window. `$queryRaw` rather than the typed API, and this is the
   * one place in the module where that is not a shortcut.
   *
   * Prisma cannot express a row-value comparison. It renders a composite cursor
   * as `a < ? OR (a = ? AND b < ?)`, and Postgres plans that as a Bitmap Heap
   * Scan with the comparison under FILTER, plus a Sort — it reads every edge the
   * user has and sorts them to return twenty. The row-value form
   * `(a, b) < (?, ?)` plans as an Index Only Scan with the comparison under
   * INDEX COND and no Sort at all. Both forms were EXPLAINed before this was
   * written; `ReferenceService.listClubs` still uses the first (§17 D-007).
   *
   * `created_at::text` on the way out and `::timestamptz` on the way back keep
   * the microseconds intact; see `TimeUuidCursor` for what a Date costs here.
   *
   * Every value is a bound parameter via the tagged template — the only
   * interpolated SQL is the column identifiers, which are chosen from this
   * function's own two-branch literal and never come from a request.
   *
   * EVERY COLUMN IS QUALIFIED WITH `f.`. This was NOT a bug before — the alias
   * is `"createdAt"` while the ORDER BY said `created_at`, so the sort bound to
   * the table column correctly. But it bound correctly because the two names
   * happened to differ, not because anything made them differ. An unqualified
   * identifier in ORDER BY resolves against OUTPUT column names first, so the
   * day someone writes `AS created_at` in a new keyset — or copies this one and
   * renames the alias — the sort silently moves onto a text cast and the Index
   * Only Scan becomes a Sort over the whole set. `f.created_at` cannot mean
   * anything but the column. Qualification makes that class of slip unwritable
   * rather than merely absent; see PostsService.fetchWindow for the measurement.
   */
  private fetchWindow(
    targetId: string,
    cursor: TimeUuidCursor | null,
    limit: number,
    direction: Direction,
  ): Promise<WindowRow[]> {
    // Which column anchors and which breaks ties swaps with the direction; both
    // indexes are (anchor, created_at DESC, tiebreak DESC).
    const [anchor, tiebreak] =
      direction === 'followers'
        ? [Prisma.sql`f.following_id`, Prisma.sql`f.follower_id`]
        : [Prisma.sql`f.follower_id`, Prisma.sql`f.following_id`];

    const keyset = cursor
      ? Prisma.sql`AND (f.created_at, ${tiebreak}) < (${cursor.createdAt}::timestamptz, ${cursor.id}::uuid)`
      : Prisma.empty;

    return this.prisma.$queryRaw<WindowRow[]>`
      SELECT ${tiebreak} AS "userId", f.created_at::text AS "createdAt"
      FROM follows f
      WHERE ${anchor} = ${targetId}::uuid
      ${keyset}
      ORDER BY f.created_at DESC, ${tiebreak} DESC
      LIMIT ${limit + 1}
    `;
  }

  /**
   * Window → wire, in two queries.
   *
   * Non-ACTIVE users are dropped, matching every other public read (§5). The
   * page can therefore be SHORTER than `limit` while `nextCursor` is non-null.
   * That is correct and deliberate: the cursor tracks the follow window, not the
   * rendered rows, so nothing is skipped or repeated — but it means a client
   * must treat `nextCursor === null` as the only end-of-list signal and never
   * infer the end from page length.
   */
  private async hydrate(
    page: WindowRow[],
    viewerId: string,
  ): Promise<FollowRow[]> {
    if (page.length === 0) return [];
    const ids = page.map((row) => row.userId);

    const [users, followedByViewer] = await Promise.all([
      this.prisma.user.findMany({
        where: { id: { in: ids }, status: UserStatus.ACTIVE },
        select: PROFILE_SUMMARY_SELECT,
      }),
      // THE anti-N+1 query: the viewer's own edges into this page, once.
      // Shared with the profile embed and with post authors — D-010's
      // consolidation, so this field has one implementation and not three.
      followedSubset(this.prisma, viewerId, ids),
    ]);

    const byId = new Map(users.map((user) => [user.id, user]));
    const now = new Date();

    // Re-ordered from the window, not from `users`: an `IN` list comes back in
    // whatever order the planner produced, which would scramble the page.
    return ids.flatMap((id) => {
      const user = byId.get(id);
      if (!user) return [];
      return [
        {
          ...mapProfileSummary(user, now),
          isFollowing: followedByViewer.has(id),
        },
      ];
    });
  }

  // ===========================================================================
  // Internals
  // ===========================================================================

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

  /**
   * `chk_no_self_follow` enforces this too, and that constraint is the real
   * line — it cannot be bypassed by a second write path. This check exists so
   * the caller gets a 400 with a code instead of a raw 23514 surfacing as a 500.
   */
  private assertNotSelf(followerId: string, followingId: string): void {
    if (followerId === followingId) {
      throw new BadRequestException({
        code: ErrorCode.VALIDATION_ERROR,
        message: 'You cannot follow yourself.',
      });
    }
  }

  private notFound(): NotFoundException {
    return new NotFoundException({
      code: ErrorCode.NOT_FOUND,
      message: 'User not found.',
    });
  }
}
