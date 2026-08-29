import { PrismaService } from '../../common/prisma/prisma.service';
import type { ProfileSummaryView } from '../profiles/profile-summary.map';

/**
 * The `follows` shapes and queries other modules need. Owned here because
 * `follows` is this module's table (§4).
 *
 * This file is the reason `profiles` does not import `FollowsModule`.
 * `FollowsModule` imports `ProfilesModule` for `assertUserVisible`, so the
 * reverse import would close a cycle — the identical problem `career.map.ts`
 * solves, resolved the identical way.
 *
 * Note what that constraint rules out: `followedSubset` below CANNOT be a
 * method on `FollowsService`, because `profiles` is one of its three callers
 * and cannot inject that service without closing the cycle. A function taking
 * the caller's own `PrismaService` reaches every caller with no DI edge at all,
 * the same way `posts` uses `PROFILE_SUMMARY_SELECT` and `CLUB_SUMMARY_SELECT`
 * without importing their modules. This is one exported query beside the table
 * that owns it, not a repository layer — §4 forbids a class per entity
 * abstracting the database, which this is not.
 */

/** A profile summary plus the VIEWER's follow state for that person. */
export interface FollowAwareSummary extends ProfileSummaryView {
  /** Does the VIEWER follow this person? Never the other direction. */
  isFollowing: boolean;
}

/**
 * Which of `ids` does `viewerId` follow? ONE query, whatever the page size.
 *
 * THE SINGLE IMPLEMENTATION OF `isFollowing`, and that is the point (D-010).
 * Before this existed the field was computed two ways — a filtered relation on
 * the `users` root for the profile embed, and a Set built in
 * `FollowsService.hydrate` for the list routes — and the two drifted. Source
 * mutation caught it only after 185 tests had passed green.
 *
 * THE `followerId` FILTER IS THE WHOLE QUERY. Prisma DROPS an `undefined`
 * value from a `where` clause rather than matching nothing, so
 * `{ followerId: undefined }` here would not mean "matches nobody" — it would
 * mean "no filter at all", and every id with ANY follower would come back as
 * followed by the viewer. That failure is silent, plausible-looking, and wrong
 * in the direction that leaks a relationship. There is now exactly one place it
 * can happen, which is why the mutation test lives on this function.
 *
 * Self is naturally absent: `chk_no_self_follow` makes a self-edge impossible,
 * so a viewer never appears in their own subset.
 */
export async function followedSubset(
  prisma: PrismaService,
  viewerId: string,
  ids: string[],
): Promise<Set<string>> {
  if (ids.length === 0) return new Set();

  const edges = await prisma.follow.findMany({
    where: { followerId: viewerId, followingId: { in: ids } },
    select: { followingId: true },
  });

  return new Set(edges.map((edge) => edge.followingId));
}
