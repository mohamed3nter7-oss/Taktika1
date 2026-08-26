import type {
  Certification,
  ClubAffiliation,
  PlayerProfile,
  PlayerProfilePage,
  Post,
} from "@/types/player-profile";

/**
 * A fixed "now".
 *
 * Relative post times are computed against this rather than `Date.now()`. In a
 * Server Component `Date.now()` is evaluated once at render and, for a
 * statically rendered route, frozen at build time - so the page would ship
 * saying "2h ago" forever. A fixed reference makes the output deterministic
 * and identical on every render.
 */
export const MOCK_NOW = new Date("2026-08-23T10:40:00.000Z");

const AL_AHLY = "/mock/crest-ahly.png";
const PYRAMIDS = "/mock/crest-pyramids.png";
const WADI_DEGLA = "/mock/crest-degla.png";

const COMPLETE_PROFILE: PlayerProfile = {
  id: "complete",
  fullName: "Youssef Abdelrahman",
  avatarUrl: "/mock/avatar.png",
  headline:
    "Striker in the Al Ahly first-team squad, open to a loan in the winter window",
  bio: "Left-footed striker, comfortable dropping between the lines and playing off a second forward. Came through the Wadi Degla academy and joined Al Ahly in 2023. Available for trials outside Egypt during the winter break \u2014 my agent's details are on the portfolio link.",
  age: 24,
  city: "Cairo",
  country: "Egypt",
  followersCount: 1240,
  followingCount: 318,
  primaryPosition: "STRIKER",
  secondaryPosition: "LEFT_WINGER",
  preferredFoot: "LEFT",
  leagueLevel: "PREMIER",
  heightCm: 178,
  weightKg: 74,
  jerseyNumber: 9,
  portfolioLink: "https://youssefabdelrahman.com/football",
  isOwnProfile: false,
  isFollowing: false,
};

const COMPLETE_AFFILIATIONS: ClubAffiliation[] = [
  {
    id: "aff-1",
    clubName: "Al Ahly",
    clubCrestUrl: AL_AHLY,
    roleAtClub: "Striker, first-team squad",
    startDate: "2023-07-01",
    endDate: null,
  },
  {
    id: "aff-2",
    clubName: "Pyramids FC",
    clubCrestUrl: PYRAMIDS,
    roleAtClub: "Striker, U21 squad",
    startDate: "2021-08-01",
    endDate: "2023-06-30",
  },
  {
    id: "aff-3",
    clubName: "Wadi Degla Academy",
    clubCrestUrl: WADI_DEGLA,
    roleAtClub: "Forward, U18",
    startDate: "2018-09-01",
    endDate: "2021-07-31",
  },
];

const COMPLETE_CERTIFICATIONS: Certification[] = [
  {
    id: "cert-1",
    name: "Anti-doping essentials",
    issuer: "Egyptian Anti-Doping Organisation",
    issueDate: "2025-03-01",
    expiryDate: "2027-03-01",
    isVerified: true,
  },
  {
    id: "cert-2",
    name: "First aid, level 1",
    issuer: "Egyptian Red Crescent",
    issueDate: "2023-11-01",
    expiryDate: null,
    isVerified: false,
  },
];

/** Each post lands in a different relative-time branch against MOCK_NOW. */
const COMPLETE_POSTS: Post[] = [
  {
    id: "post-1",
    content:
      "Back in full training after three weeks out with a calf strain. Grateful to the medical staff for the rehab work \u2014 available for selection from Saturday.",
    images: [],
    likesCount: 96,
    commentsCount: 14,
    createdAt: "2026-08-23T08:40:00.000Z",
    editedAt: null,
  },
  {
    id: "post-2",
    content:
      "Pre-season camp in Ain Sokhna finished today. Two sessions a day, mostly pressing patterns and finishing under fatigue. The U21 group trained with us for the second week and none of them looked out of place. The staff have been clear that places in the matchday squad are open, and the intensity in every session has reflected that.",
    images: [
      { url: "/mock/photo-1.png", width: 1200, height: 1200 },
      { url: "/mock/photo-2.png", width: 1200, height: 1200 },
      { url: "/mock/photo-3.png", width: 1200, height: 1200 },
      { url: "/mock/photo-4.png", width: 1200, height: 1200 },
    ],
    likesCount: 231,
    commentsCount: 27,
    createdAt: "2026-08-20T17:10:00.000Z",
    editedAt: "2026-08-20T18:02:00.000Z",
  },
  {
    id: "post-3",
    content:
      "Spoke to the U17 group at the academy about the step from youth football to senior minutes. Happy to do more of these.",
    images: [{ url: "/mock/photo-wide.png", width: 1600, height: 900 }],
    likesCount: 148,
    commentsCount: 9,
    createdAt: "2026-08-13T12:00:00.000Z",
    editedAt: null,
  },
];

/**
 * The state most real profiles will be in at launch. Not an edge case.
 *
 * No avatar, headline, bio, measurements, shirt number, portfolio,
 * certifications or posts - one affiliation and the four attributes a scout
 * filters on.
 */
const SPARSE_PROFILE: PlayerProfile = {
  id: "sparse",
  fullName: "Mostafa Kamal",
  avatarUrl: null,
  headline: null,
  bio: null,
  age: 16,
  city: "Giza",
  country: "Egypt",
  followersCount: 12,
  followingCount: 41,
  primaryPosition: "CENTER_BACK",
  secondaryPosition: null,
  preferredFoot: "RIGHT",
  leagueLevel: "YOUTH_ACADEMY",
  heightCm: null,
  weightKg: null,
  jerseyNumber: null,
  portfolioLink: null,
  isOwnProfile: false,
  isFollowing: false,
};

const SPARSE_AFFILIATIONS: ClubAffiliation[] = [
  {
    id: "aff-4",
    clubName: "Wadi Degla Academy",
    clubCrestUrl: null,
    roleAtClub: "Centre back, U16",
    startDate: "2024-09-01",
    endDate: null,
  },
];

const FIXTURES: Record<string, PlayerProfilePage> = {
  complete: {
    profile: COMPLETE_PROFILE,
    affiliations: COMPLETE_AFFILIATIONS,
    certifications: COMPLETE_CERTIFICATIONS,
    posts: COMPLETE_POSTS,
  },
  sparse: {
    profile: SPARSE_PROFILE,
    affiliations: SPARSE_AFFILIATIONS,
    certifications: [],
    posts: [],
  },
  own: {
    profile: { ...COMPLETE_PROFILE, id: "own", isOwnProfile: true },
    affiliations: COMPLETE_AFFILIATIONS,
    certifications: COMPLETE_CERTIFICATIONS,
    posts: COMPLETE_POSTS,
  },
};

export const FIXTURE_IDS = ["complete", "sparse", "own", "slow"] as const;

/**
 * `slow` is the complete profile behind a delay. It exists because
 * `loading.tsx` is otherwise unobservable: with synchronous mock data the
 * page resolves before React ever renders the fallback, so the skeletons
 * would ship untested. It goes when the real API lands.
 */
const SLOW_DELAY_MS = 2000;

export async function getPlayerProfilePage(
  id: string,
): Promise<PlayerProfilePage | null> {
  if (id === "slow") {
    await new Promise((resolve) => setTimeout(resolve, SLOW_DELAY_MS));
    return { ...FIXTURES.complete!, profile: { ...COMPLETE_PROFILE, id: "slow" } };
  }
  return FIXTURES[id] ?? null;
}

/**
 * Existence and identity without the artificial delay.
 *
 * Kept separate from `getPlayerProfilePage` so `generateMetadata` can resolve
 * a missing profile before the response is streamed. Once `loading.tsx` has
 * flushed the shell the status code is fixed at 200, and a `notFound()` after
 * that point renders the not-found body under a 200 - a soft 404, which is
 * exactly what a search engine must not see on an indexable profile route.
 */
export function getProfileSummary(id: string): { fullName: string } | null {
  const key = id === "slow" ? "complete" : id;
  const page = FIXTURES[key];
  return page ? { fullName: page.profile.fullName } : null;
}
