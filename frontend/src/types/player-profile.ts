/**
 * The player profile wire contract.
 *
 * This is the complete set of fields the UI may render. Nothing outside it
 * exists - in particular there are no statistics anywhere in the product: no
 * goals, assists, appearances, minutes, ratings, match history or charts.
 *
 * Age is public; date of birth is not. Players may be as young as twelve, the
 * API never exposes a birth date, and the UI must not derive or display one.
 */

/**
 * Twelve values, matching `PlayerPosition` in `backend/prisma/schema.prisma`.
 *
 * LEFT_MIDFIELDER and RIGHT_MIDFIELDER are deliberately present: a left
 * midfielder is not a left winger, and collapsing the two corrupts scout
 * position filtering, which is the core value loop. See root CLAUDE.md D-008.
 *
 * The order below is footballing order for display. It is NOT the database
 * enum order, which is a fixed historical artefact - nothing may ORDER BY an
 * enum column to produce a user-facing order.
 */
export type PlayerPosition =
  | "GOALKEEPER"
  | "RIGHT_BACK"
  | "CENTER_BACK"
  | "LEFT_BACK"
  | "DEFENSIVE_MIDFIELDER"
  | "CENTRAL_MIDFIELDER"
  | "ATTACKING_MIDFIELDER"
  | "LEFT_MIDFIELDER"
  | "RIGHT_MIDFIELDER"
  | "LEFT_WINGER"
  | "RIGHT_WINGER"
  | "STRIKER";

export type PreferredFoot = "LEFT" | "RIGHT" | "BOTH";

export type LeagueLevel =
  | "PREMIER"
  | "SECOND_DIVISION"
  | "THIRD_DIVISION"
  | "YOUTH_ACADEMY"
  | "AMATEUR";

export type UserRole =
  | "PLAYER"
  | "COACH"
  | "SCOUT"
  | "ANALYST"
  | "PHYSICAL_THERAPIST"
  | "CLUB_ADMIN";

export type PlayerProfile = {
  // identity
  id: string;
  fullName: string;
  avatarUrl: string | null;
  headline: string | null;
  bio: string | null;
  /** Integer. Never a date of birth. */
  age: number;
  city: string;
  country: string;
  followersCount: number;
  followingCount: number;

  // player attributes
  primaryPosition: PlayerPosition;
  secondaryPosition: PlayerPosition | null;
  preferredFoot: PreferredFoot;
  leagueLevel: LeagueLevel;
  heightCm: number | null;
  weightKg: number | null;
  jerseyNumber: number | null;
  portfolioLink: string | null;

  // viewer context
  isOwnProfile: boolean;
  isFollowing: boolean;
};

/**
 * Affiliations are date ranges, never a scalar `current_club`.
 * `endDate === null` means the player is there now.
 */
export type ClubAffiliation = {
  id: string;
  clubName: string;
  clubCrestUrl: string | null;
  roleAtClub: string;
  /** ISO date. */
  startDate: string;
  /** ISO date, or null for the current club. */
  endDate: string | null;
};

export type Certification = {
  id: string;
  name: string;
  issuer: string | null;
  issueDate: string | null;
  expiryDate: string | null;
  isVerified: boolean;
};

export type PostImage = {
  url: string;
  width: number;
  height: number;
};

/** Text and images only. There is no video anywhere in the product. */
export type Post = {
  id: string;
  /** 1-3000 characters. */
  content: string;
  /** 0-4 images. */
  images: PostImage[];
  likesCount: number;
  commentsCount: number;
  createdAt: string;
  editedAt: string | null;
};

/**
 * Who wrote a post.
 *
 * Not a field on `Post`. On a profile page the author is always the profile
 * owner, but in the feed it is not, so `PostCard` takes this as a prop rather
 * than deriving it from surrounding profile context - identical work today,
 * and no rewrite when the feed lands.
 */
export type PostAuthor = {
  name: string;
  avatarUrl: string | null;
  role: UserRole;
  /** e.g. "Striker - Al Ahly". Already localised by the caller. */
  subtitle: string | null;
};

/** Everything one profile page renders. */
export type PlayerProfilePage = {
  profile: PlayerProfile;
  affiliations: ClubAffiliation[];
  certifications: Certification[];
  posts: Post[];
};
