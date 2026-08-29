import { Prisma } from '../../generated/prisma/client';
import {
  CLUB_SUMMARY_SELECT,
  type ClubSummaryView,
} from '../reference/club-summary.map';
import {
  PROFILE_SUMMARY_SELECT,
  mapProfileSummary,
} from '../profiles/profile-summary.map';
import type { FollowAwareSummary } from '../follows/follows.map';

/**
 * The wire shape of a post, in one place.
 *
 * A constant and a function, matching `career.map.ts` and
 * `profile-summary.map.ts`. NOT a mapper class — §4 forbids the layer, not the
 * file, and the distinction is that this has no state, no injection and no
 * lifecycle: it is the select and the transform that belong to it, sitting
 * together so neither can be changed without the other in view.
 *
 * The author block comes from `PROFILE_SUMMARY_SELECT` and the club block from
 * `CLUB_SUMMARY_SELECT`. Neither is re-declared here: both already exist
 * because a hand-written whitelist in a second module is exactly how two
 * renderings of the same entity drift apart, and `PROFILE_SUMMARY_SELECT`
 * additionally drops `dateOfBirth` in favour of a computed `age` (§5), which a
 * local select would silently fail to do.
 */
export const POST_SELECT = {
  id: true,
  content: true,
  postType: true,
  // Trigger-maintained (PRD A.4). READ here, never written, and never
  // recomputed with COUNT(*) — the triggers are the only writer, and a service
  // that counted would disagree with them the moment one stopped firing.
  likesCount: true,
  commentsCount: true,
  editedAt: true,
  createdAt: true,
  authorId: true,
  author: { select: PROFILE_SUMMARY_SELECT },
  club: { select: CLUB_SUMMARY_SELECT },
} satisfies Prisma.PostSelect;

export type PostRow = Prisma.PostGetPayload<{ select: typeof POST_SELECT }>;

export interface PostView {
  id: string;
  content: string;
  postType: PostRow['postType'];
  /**
   * The author, plus whether the VIEWER follows them. Identical on all three
   * read paths — GET /posts/:id, GET /users/:id/posts and GET /feed — because a
   * field present on one listing of posts and absent from another is precisely
   * the drift PROFILE_SUMMARY_SELECT exists to prevent.
   */
  author: FollowAwareSummary;
  club: ClubSummaryView | null;
  /**
   * ALWAYS EMPTY in this commit — posts are text-only until the image commit.
   * The key is on the wire from day one so adding images is additive rather
   * than a breaking change to every client that has already shipped.
   */
  images: never[];
  likesCount: number;
  commentsCount: number;
  /** The VIEWER's state, not the author's. */
  isLiked: boolean;
  isSaved: boolean;
  editedAt: Date | null;
  createdAt: Date;
}

/** The viewer's own state for a page of posts, resolved once per page. */
export interface ViewerPostState {
  liked: Set<string>;
  saved: Set<string>;
  /** Author ids the viewer follows — from followedSubset, never recomputed. */
  followedAuthors: Set<string>;
}

/**
 * Row → wire. Field by field, never a spread: a spread would put `authorId` on
 * the wire today and every future column on it automatically. `authorId` is
 * selected because ownership and visibility need it, and is deliberately not
 * returned — the author block already carries the id a client can use.
 *
 * `canManage` is NOT returned (D-018). The caller computes it from viewer id
 * against author id, which it already holds; a derived boolean on every row is
 * redundant and invites a client to treat it as authorisation, which it is not.
 * Ownership is enforced server-side on PATCH/DELETE regardless.
 */
export function mapPost(
  row: PostRow,
  viewer: ViewerPostState,
  now: Date = new Date(),
): PostView {
  return {
    id: row.id,
    content: row.content,
    postType: row.postType,
    author: {
      ...mapProfileSummary(row.author, now),
      isFollowing: viewer.followedAuthors.has(row.authorId),
    },
    club: row.club,
    images: [],
    likesCount: row.likesCount,
    commentsCount: row.commentsCount,
    isLiked: viewer.liked.has(row.id),
    isSaved: viewer.saved.has(row.id),
    editedAt: row.editedAt,
    createdAt: row.createdAt,
  };
}
