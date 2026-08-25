import { Prisma, UserRole } from '../../generated/prisma/client';

/**
 * The six professional roles and their 1:1 extension tables.
 *
 * `UserRole` deliberately has NO admin value, and the platform-admin table
 * (`AdminProfile` / `admin_profiles`) deliberately has NO entry here — it is
 * orthogonal to the professional roles (PRD 7.1) and reachable only through
 * the future admin module. `CLUB_ADMIN` maps to `club_admin_profiles`, the
 * profile of a person who manages a club — NOT platform administration.
 *
 * This map is the single statement of the role → relation pairing, exported
 * for other modules (search, feed) and for tests. It does NOT drive query
 * construction: a computed `include`/delegate key widens the Prisma types and
 * forces casts, so reads select all six relations statically (PK-to-PK joins,
 * PRD 7.2) and writes stay in explicit per-role branches.
 */
export const ROLE_PROFILE_RELATION = {
  [UserRole.PLAYER]: 'playerProfile',
  [UserRole.COACH]: 'coachProfile',
  [UserRole.SCOUT]: 'scoutProfile',
  [UserRole.ANALYST]: 'analystProfile',
  [UserRole.PHYSICAL_THERAPIST]: 'therapistProfile',
  [UserRole.CLUB_ADMIN]: 'clubAdminProfile',
} as const satisfies Record<UserRole, keyof Prisma.UserInclude>;

/** The body key carrying each role's block in completion/update requests. */
export const ROLE_DTO_KEY = {
  [UserRole.PLAYER]: 'player',
  [UserRole.COACH]: 'coach',
  [UserRole.SCOUT]: 'scout',
  [UserRole.ANALYST]: 'analyst',
  [UserRole.PHYSICAL_THERAPIST]: 'therapist',
  [UserRole.CLUB_ADMIN]: 'clubAdmin',
} as const satisfies Record<UserRole, string>;

export type RoleDtoKey = (typeof ROLE_DTO_KEY)[UserRole];

// =============================================================================
// Per-role select whitelists (§5): domain fields only. No userId (redundant in
// context), no timestamps. `playersRecommended` is readable but has no DTO —
// it is a system counter, not self-reported data.
// =============================================================================

export const PLAYER_PROFILE_SELECT = {
  primaryPosition: true,
  secondaryPosition: true,
  preferredFoot: true,
  leagueLevel: true,
  heightCm: true,
  weightKg: true,
  jerseyNumber: true,
  portfolioLink: true,
} satisfies Prisma.PlayerProfileSelect;

export const COACH_PROFILE_SELECT = {
  coachType: true,
  yearsExperience: true,
  preferredFormation: true,
  portfolioLink: true,
} satisfies Prisma.CoachProfileSelect;

export const SCOUT_PROFILE_SELECT = {
  scoutType: true,
  regionsCovered: true,
  playersRecommended: true,
  yearsExperience: true,
  portfolioLink: true,
} satisfies Prisma.ScoutProfileSelect;

export const ANALYST_PROFILE_SELECT = {
  analystType: true,
  toolsUsed: true,
  yearsExperience: true,
  portfolioLink: true,
} satisfies Prisma.AnalystProfileSelect;

export const THERAPIST_PROFILE_SELECT = {
  specialization: true,
  yearsExperience: true,
  clinicName: true,
  portfolioLink: true,
} satisfies Prisma.TherapistProfileSelect;

export const CLUB_ADMIN_PROFILE_SELECT = {
  clubId: true,
  positionTitle: true,
  club: { select: { id: true, nameEn: true, nameAr: true, logoUrl: true } },
} satisfies Prisma.ClubAdminProfileSelect;

// =============================================================================
// The wire shapes those selects produce — the `profile` block of every
// profile response, exported for later consumers (search, feed).
// =============================================================================

export type PlayerProfileView = Prisma.PlayerProfileGetPayload<{
  select: typeof PLAYER_PROFILE_SELECT;
}>;
export type CoachProfileView = Prisma.CoachProfileGetPayload<{
  select: typeof COACH_PROFILE_SELECT;
}>;
export type ScoutProfileView = Prisma.ScoutProfileGetPayload<{
  select: typeof SCOUT_PROFILE_SELECT;
}>;
export type AnalystProfileView = Prisma.AnalystProfileGetPayload<{
  select: typeof ANALYST_PROFILE_SELECT;
}>;
export type TherapistProfileView = Prisma.TherapistProfileGetPayload<{
  select: typeof THERAPIST_PROFILE_SELECT;
}>;
export type ClubAdminProfileView = Prisma.ClubAdminProfileGetPayload<{
  select: typeof CLUB_ADMIN_PROFILE_SELECT;
}>;

export type RoleProfileView =
  | PlayerProfileView
  | CoachProfileView
  | ScoutProfileView
  | AnalystProfileView
  | TherapistProfileView
  | ClubAdminProfileView;
