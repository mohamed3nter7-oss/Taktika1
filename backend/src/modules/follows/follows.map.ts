import { Prisma } from '../../generated/prisma/client';

/**
 * The `follows` shapes other modules embed. Owned here because `follows` is
 * this module's table (§4).
 *
 * This file is the reason `profiles` does not import `FollowsModule`.
 * `FollowsModule` imports `ProfilesModule` for `assertUserVisible`, so the
 * reverse import would close a cycle — the identical problem `career.map.ts`
 * solves, resolved the identical way: `profiles` selects `followers` as a
 * relation of its own `users` aggregate root, using a constant defined here.
 */

/**
 * "Does the viewer follow this user?" as a relation filter.
 *
 * `take: 1` because the composite PK makes at most one row possible — this is
 * an existence probe, not a list, and it must never widen into one.
 *
 * The `viewerId` parameter is REQUIRED and is checked by the caller before this
 * is built. Prisma drops an `undefined` value from a `where` clause entirely,
 * so `{ followerId: undefined }` here would not mean "matches nobody" — it
 * would mean "no filter at all", matching the target's FIRST follower and
 * reporting `isFollowing: true` for every user who has one. That failure is
 * silent, plausible-looking, and wrong in the direction that leaks a
 * relationship, so the guard is not optional.
 */
export const viewerFollowSelect = (viewerId: string) =>
  ({
    where: { followerId: viewerId },
    select: { followerId: true },
    take: 1,
  }) satisfies Prisma.User$followersArgs;
