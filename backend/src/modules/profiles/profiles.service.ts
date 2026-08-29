import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { calculateAge } from '../auth/auth.logic';
import {
  AFFILIATION_ORDER_BY,
  AFFILIATION_SELECT,
  CERTIFICATION_ORDER_BY,
  CERTIFICATION_SELECT,
  mapAffiliation,
} from '../career/career.map';
import { viewerFollowSelect } from '../follows/follows.map';
import { ErrorCode } from '../../common/errors/error-codes';
import type { AuthenticatedUser } from '../../common/types/authenticated-user';
import {
  PlayerPosition,
  Prisma,
  UserRole,
  UserStatus,
} from '../../generated/prisma/client';
import { PrismaService } from '../../common/prisma/prisma.service';
import { ReferenceService } from '../reference/reference.service';
import { CompleteProfileDto } from './dto/complete-profile.dto';
import { UpdateMeDto } from './dto/update-me.dto';
import { UpdateRoleProfileDto } from './dto/update-role-profile.dto';
import {
  ANALYST_PROFILE_SELECT,
  CLUB_ADMIN_PROFILE_SELECT,
  COACH_PROFILE_SELECT,
  PLAYER_PROFILE_SELECT,
  ROLE_DTO_KEY,
  RoleDtoKey,
  RoleProfileView,
  SCOUT_PROFILE_SELECT,
  THERAPIST_PROFILE_SELECT,
} from './role-profile.map';

/**
 * Public profile hydration: the user whitelist plus ALL SIX role relations,
 * statically. Five come back null; each is a PK-to-PK join (PRD 7.2), so this
 * costs nothing measurable and keeps every downstream type exact — a computed
 * include key would widen to a union and force casts.
 *
 * `dateOfBirth` is fetched but NEVER serialized: the wire carries a computed
 * `age` instead, so minors' birth dates are not public. No email, phone,
 * passwordHash, or status here (§5).
 *
 * Certifications and affiliations are selected as relations of this aggregate
 * root (§3), not fetched through CareerService — one query instead of three,
 * and it keeps the dependency pointing career → profiles. The shapes come from
 * career.map.ts so the embed and the career endpoints cannot drift.
 */
const PUBLIC_USER_SELECT = {
  id: true,
  fullName: true,
  role: true,
  headline: true,
  bio: true,
  avatarUrl: true,
  dateOfBirth: true,
  gender: true,
  followersCount: true,
  followingCount: true,
  createdAt: true,
  country: { select: { id: true, code: true, nameEn: true, nameAr: true } },
  city: { select: { id: true, nameEn: true, nameAr: true } },
  playerProfile: { select: PLAYER_PROFILE_SELECT },
  coachProfile: { select: COACH_PROFILE_SELECT },
  scoutProfile: { select: SCOUT_PROFILE_SELECT },
  analystProfile: { select: ANALYST_PROFILE_SELECT },
  therapistProfile: { select: THERAPIST_PROFILE_SELECT },
  clubAdminProfile: { select: CLUB_ADMIN_PROFILE_SELECT },
  certifications: {
    select: CERTIFICATION_SELECT,
    orderBy: CERTIFICATION_ORDER_BY,
  },
  affiliations: { select: AFFILIATION_SELECT, orderBy: AFFILIATION_ORDER_BY },
} satisfies Prisma.UserSelect;

/**
 * `PUBLIC_USER_SELECT` plus the one relation that depends on WHO IS ASKING:
 * does the viewer follow this user? A function rather than a constant because
 * the filter value arrives per request.
 *
 * `follows` is the follows module's table (§4), so the shape comes from
 * `follows.map.ts` rather than being written here. It is selected as a relation
 * of this module's own `users` root — the same resolution `career.map.ts` uses
 * for certifications and affiliations, and for the same reason: FollowsModule
 * imports ProfilesModule for `assertUserVisible`, so importing FollowsService
 * here would close a module cycle.
 *
 * Costs no extra round trip and no COUNT(*): the counters themselves are
 * trigger-maintained columns on `users`, already in PUBLIC_USER_SELECT.
 */
const publicUserSelect = (viewerId: string) => {
  // Not defensive noise. Prisma DROPS an `undefined` value from a `where`
  // clause rather than matching nothing, so `{ followerId: undefined }` with
  // `take: 1` would match the target's first follower and report
  // `isFollowing: true` for every user who has one. Failing loudly is the only
  // way that bug is ever noticed — it is silent, plausible, and wrong in the
  // direction that leaks a relationship.
  if (!viewerId) {
    throw new Error('publicUserSelect requires a viewer id');
  }
  return {
    ...PUBLIC_USER_SELECT,
    followers: viewerFollowSelect(viewerId),
  } satisfies Prisma.UserSelect;
};

type PublicUserRow = Prisma.UserGetPayload<{
  select: typeof PUBLIC_USER_SELECT;
}>;

/**
 * The caller's own record — same shape AuthService.me returns, duplicated on
 * purpose: §5 wants an explicit whitelist at every query site, not a shared
 * constant another module could widen.
 */
const OWN_USER_SELECT = {
  id: true,
  email: true,
  fullName: true,
  role: true,
  status: true,
  headline: true,
  bio: true,
  countryId: true,
  cityId: true,
  avatarUrl: true,
  dateOfBirth: true,
  gender: true,
  emailVerifiedAt: true,
  followersCount: true,
  followingCount: true,
  createdAt: true,
} satisfies Prisma.UserSelect;

/** Tx abort signal: role row was created but the user was not PENDING_PROFILE. */
class StatusNotPendingError extends Error {}

@Injectable()
export class ProfilesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly reference: ReferenceService,
  ) {}

  // ===========================================================================
  // Completion — the ONLY transition PENDING_PROFILE → ACTIVE (FR-AUTH-2)
  // ===========================================================================

  async completeProfile(user: AuthenticatedUser, dto: CompleteProfileDto) {
    this.assertOnlyOwnBlock(user.role, dto);

    try {
      const profile = await this.prisma.$transaction(async (tx) => {
        const created = await this.createRoleProfile(tx, user, dto);

        // Conditional on purpose: PENDING_PROFILE is the only status this may
        // move. A user suspended after their token was minted lands here with
        // count 0 — the throw rolls the role row back out.
        const transitioned = await tx.user.updateMany({
          where: { id: user.sub, status: UserStatus.PENDING_PROFILE },
          data: { status: UserStatus.ACTIVE },
        });
        if (transitioned.count === 0) throw new StatusNotPendingError();

        return created;
      });

      // The caller's token still says PENDING_PROFILE; the frontend follows
      // with POST /auth/refresh to pick up ACTIVE (§9 guard trade-off).
      return { status: UserStatus.ACTIVE, profile };
    } catch (error) {
      return this.recoverCompletion(error, user);
    }
  }

  /**
   * No check-then-insert anywhere (§5): the unique constraints decide, and
   * this untangles which one fired and what it means.
   */
  private async recoverCompletion(
    error: unknown,
    user: AuthenticatedUser,
  ): Promise<{ status: UserStatus; profile: RoleProfileView }> {
    if (error instanceof StatusNotPendingError) {
      const current = await this.prisma.user.findUnique({
        where: { id: user.sub },
        select: { status: true },
      });
      switch (current?.status) {
        case UserStatus.ACTIVE:
          throw this.alreadyCompleted();
        case UserStatus.SUSPENDED:
          throw new ForbiddenException({
            code: ErrorCode.ACCOUNT_SUSPENDED,
            message: 'This account is not active.',
          });
        case UserStatus.PENDING_VERIFICATION:
          throw new ForbiddenException({
            code: ErrorCode.EMAIL_NOT_VERIFIED,
            message: 'Verify your email address first.',
          });
        default:
          // DELETED or vanished — the token is worthless either way.
          throw new UnauthorizedException({
            code: ErrorCode.UNAUTHORIZED,
            message: 'Authentication required.',
          });
      }
    }

    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === 'P2002'
    ) {
      // club_admin_profiles carries TWO unique constraints (userId PK,
      // clubId). Which fired decides everything: routing a foreign-club
      // conflict into the repair below would flip a user ACTIVE with no role
      // row. Reading the caller's own row settles it without parsing
      // meta.target — the constraint itself stays authoritative.
      if (user.role === UserRole.CLUB_ADMIN) {
        const own = await this.prisma.clubAdminProfile.findUnique({
          where: { userId: user.sub },
          select: { userId: true },
        });
        if (!own) {
          throw new ConflictException({
            code: ErrorCode.CLUB_ALREADY_MANAGED,
            message: 'That club already has an administrator.',
          });
        }
      }

      // The caller's own row already exists. Normally that means completion
      // already ran → 409. If status is somehow still PENDING_PROFILE (a
      // half-applied earlier attempt), the same conditional transition repairs
      // it and the retry succeeds idempotently.
      const repaired = await this.prisma.user.updateMany({
        where: { id: user.sub, status: UserStatus.PENDING_PROFILE },
        data: { status: UserStatus.ACTIVE },
      });
      if (repaired.count > 0) {
        const profile = await this.readRoleProfile(user.sub, user.role);
        if (profile) return { status: UserStatus.ACTIVE, profile };
      }
      throw this.alreadyCompleted();
    }

    throw error;
  }

  // ===========================================================================
  // Public profile (FR-PROF-1)
  // ===========================================================================

  async getPublicProfile(id: string, viewer: AuthenticatedUser) {
    // Only ACTIVE users are publicly visible. DELETED, SUSPENDED (PRD 9.2:
    // "404 for regular users") and PENDING_* all get the same 404 — never a
    // 403 that confirms existence (§8).
    const row = await this.prisma.user.findFirst({
      where: { id, status: UserStatus.ACTIVE },
      select: publicUserSelect(viewer.sub),
    });
    if (!row) {
      throw new NotFoundException({
        code: ErrorCode.NOT_FOUND,
        message: 'User not found.',
      });
    }

    // Mapped field-by-field: what goes on the wire is exactly this list.
    // Additive by design — postsCount and viewer.isFollowing join this shape
    // when their modules land, as certifications/affiliations just did.
    return {
      id: row.id,
      fullName: row.fullName,
      role: row.role,
      headline: row.headline,
      bio: row.bio,
      avatarUrl: row.avatarUrl,
      age: calculateAge(row.dateOfBirth, new Date()),
      gender: row.gender,
      country: row.country,
      city: row.city,
      followersCount: row.followersCount,
      followingCount: row.followingCount,
      createdAt: row.createdAt,
      profile: this.pickRoleProfile(row),
      certifications: row.certifications,
      // isCurrent is derived here, once, by the career module's own mapper —
      // there is no such column (PRD 7.3).
      affiliations: row.affiliations.map(mapAffiliation),
      viewer: {
        isSelf: viewer.sub === row.id,
        // At most one row can exist — the composite PK guarantees it — so this
        // is an existence probe, not a count.
        isFollowing: row.followers.length > 0,
      },
    };
  }

  /**
   * Exported seam for other modules (§3): career asks whether a target user is
   * publicly visible instead of querying `users` itself.
   *
   * Same concealment rule as `getPublicProfile` and stated once here —
   * SUSPENDED, DELETED and both PENDING_* statuses are a 404, never a 403 that
   * confirms the account exists (§8).
   */
  async assertUserVisible(id: string): Promise<void> {
    const user = await this.prisma.user.findFirst({
      where: { id, status: UserStatus.ACTIVE },
      select: { id: true },
    });
    if (!user) {
      throw new NotFoundException({
        code: ErrorCode.NOT_FOUND,
        message: 'User not found.',
      });
    }
  }

  /**
   * The club this user administers, or null.
   *
   * Exported seam for `posts` (§4): club attribution on POST /posts must read
   * club_admin_profiles, which is this module's table, so posts injects this
   * rather than querying it. Same shape as `assertUserVisible` above.
   *
   * THE ROW IS THE AUTHORISATION. The caller must NOT gate on the JWT role and
   * then look the club up — that is two sources of truth for one decision, and
   * the token is the weaker of them. One lookup answers both failure modes with
   * the same null: not a club admin at all, and a club admin whose profile row
   * is missing. The second is the one that would otherwise be a 500 on a null
   * dereference instead of a 403.
   *
   * Returns null rather than throwing. Which status code a missing club means
   * is the CALLER'S policy — a 403 thrown from here would be this module
   * deciding how posts answers, and a different caller may reasonably want a
   * 404 or an empty result.
   *
   * Deliberately NOT generalised to "get a user's club": the name answers
   * exactly one question, about the CALLER'S OWN club. A general accessor
   * invites a caller asking about someone else's club, which is a different
   * question with a different answer and a different authorisation story.
   */
  async clubIdForAdmin(userId: string): Promise<number | null> {
    const profile = await this.prisma.clubAdminProfile.findUnique({
      where: { userId },
      select: { clubId: true },
    });
    return profile?.clubId ?? null;
  }

  /** Hydration helper for later modules (search, feed): row → its role block. */
  pickRoleProfile(row: PublicUserRow): RoleProfileView | null {
    switch (row.role) {
      case UserRole.PLAYER:
        return row.playerProfile;
      case UserRole.COACH:
        return row.coachProfile;
      case UserRole.SCOUT:
        return row.scoutProfile;
      case UserRole.ANALYST:
        return row.analystProfile;
      case UserRole.PHYSICAL_THERAPIST:
        return row.therapistProfile;
      case UserRole.CLUB_ADMIN:
        return row.clubAdminProfile;
    }
  }

  /** Single-role read used by completion recovery and exported for reuse. */
  async readRoleProfile(
    userId: string,
    role: UserRole,
  ): Promise<RoleProfileView | null> {
    const where = { userId } as const;
    switch (role) {
      case UserRole.PLAYER:
        return this.prisma.playerProfile.findUnique({
          where,
          select: PLAYER_PROFILE_SELECT,
        });
      case UserRole.COACH:
        return this.prisma.coachProfile.findUnique({
          where,
          select: COACH_PROFILE_SELECT,
        });
      case UserRole.SCOUT:
        return this.prisma.scoutProfile.findUnique({
          where,
          select: SCOUT_PROFILE_SELECT,
        });
      case UserRole.ANALYST:
        return this.prisma.analystProfile.findUnique({
          where,
          select: ANALYST_PROFILE_SELECT,
        });
      case UserRole.PHYSICAL_THERAPIST:
        return this.prisma.therapistProfile.findUnique({
          where,
          select: THERAPIST_PROFILE_SELECT,
        });
      case UserRole.CLUB_ADMIN:
        return this.prisma.clubAdminProfile.findUnique({
          where,
          select: CLUB_ADMIN_PROFILE_SELECT,
        });
    }
  }

  // ===========================================================================
  // Own edits (FR-PROF-2) — identity always from `sub`, never from the body
  // ===========================================================================

  async updateMe(sub: string, dto: UpdateMeDto) {
    if ((dto.countryId === undefined) !== (dto.cityId === undefined)) {
      throw new BadRequestException({
        code: ErrorCode.VALIDATION_ERROR,
        message: 'countryId and cityId must be provided together.',
      });
    }
    if (dto.countryId !== undefined && dto.cityId !== undefined) {
      await this.reference.assertCityInCountry(dto.cityId, dto.countryId);
    }

    return this.prisma.user.update({
      where: { id: sub },
      data: {
        // ?? undefined: non-nullable columns must not receive an explicit
        // null. Nullable ones (headline, bio, gender) accept null = clear.
        fullName: dto.fullName ?? undefined,
        headline: dto.headline,
        bio: dto.bio,
        gender: dto.gender,
        countryId: dto.countryId,
        cityId: dto.cityId,
      },
      select: OWN_USER_SELECT,
    });
  }

  async updateRoleProfile(
    user: AuthenticatedUser,
    dto: UpdateRoleProfileDto,
  ): Promise<RoleProfileView> {
    this.assertOnlyOwnBlock(user.role, dto);
    const userId = user.sub;

    // Explicit per-role branches with real Prisma types — a dynamic delegate
    // would erase them. P2025 (row missing) falls through to the filter's 404.
    switch (user.role) {
      case UserRole.PLAYER: {
        const block = dto.player;
        if (!block) throw this.roleMismatch(user.role);

        const existing = await this.prisma.playerProfile.findUnique({
          where: { userId },
          select: { primaryPosition: true, secondaryPosition: true },
        });
        if (!existing) {
          throw new NotFoundException({
            code: ErrorCode.NOT_FOUND,
            message: 'Profile not found.',
          });
        }
        // The invariant holds on the MERGED row, not the patch alone.
        this.assertDistinctPositions(
          block.primaryPosition ?? existing.primaryPosition,
          block.secondaryPosition !== undefined
            ? block.secondaryPosition
            : existing.secondaryPosition,
        );

        return this.prisma.playerProfile.update({
          where: { userId },
          data: {
            primaryPosition: block.primaryPosition ?? undefined,
            secondaryPosition: block.secondaryPosition,
            preferredFoot: block.preferredFoot ?? undefined,
            leagueLevel: block.leagueLevel ?? undefined,
            heightCm: block.heightCm,
            weightKg: block.weightKg,
            jerseyNumber: block.jerseyNumber,
            portfolioLink: block.portfolioLink,
          },
          select: PLAYER_PROFILE_SELECT,
        });
      }

      case UserRole.COACH: {
        const block = dto.coach;
        if (!block) throw this.roleMismatch(user.role);
        return this.prisma.coachProfile.update({
          where: { userId },
          data: {
            coachType: block.coachType ?? undefined,
            yearsExperience: block.yearsExperience,
            preferredFormation: block.preferredFormation,
            portfolioLink: block.portfolioLink,
          },
          select: COACH_PROFILE_SELECT,
        });
      }

      case UserRole.SCOUT: {
        const block = dto.scout;
        if (!block) throw this.roleMismatch(user.role);
        return this.prisma.scoutProfile.update({
          where: { userId },
          data: {
            scoutType: block.scoutType ?? undefined,
            regionsCovered: block.regionsCovered,
            yearsExperience: block.yearsExperience,
            portfolioLink: block.portfolioLink,
          },
          select: SCOUT_PROFILE_SELECT,
        });
      }

      case UserRole.ANALYST: {
        const block = dto.analyst;
        if (!block) throw this.roleMismatch(user.role);
        return this.prisma.analystProfile.update({
          where: { userId },
          data: {
            analystType: block.analystType ?? undefined,
            toolsUsed: block.toolsUsed,
            yearsExperience: block.yearsExperience,
            portfolioLink: block.portfolioLink,
          },
          select: ANALYST_PROFILE_SELECT,
        });
      }

      case UserRole.PHYSICAL_THERAPIST: {
        const block = dto.therapist;
        if (!block) throw this.roleMismatch(user.role);
        return this.prisma.therapistProfile.update({
          where: { userId },
          data: {
            specialization: block.specialization ?? undefined,
            yearsExperience: block.yearsExperience,
            clinicName: block.clinicName,
            portfolioLink: block.portfolioLink,
          },
          select: THERAPIST_PROFILE_SELECT,
        });
      }

      case UserRole.CLUB_ADMIN: {
        const block = dto.clubAdmin;
        if (!block) throw this.roleMismatch(user.role);
        // positionTitle is the ONLY editable field; clubId reassignment is
        // admin-mediated (PRD 9.3) and its DTO cannot even carry it.
        return this.prisma.clubAdminProfile.update({
          where: { userId },
          data: { positionTitle: block.positionTitle },
          select: CLUB_ADMIN_PROFILE_SELECT,
        });
      }
    }
  }

  // ===========================================================================
  // Internals
  // ===========================================================================

  private async createRoleProfile(
    tx: Prisma.TransactionClient,
    user: AuthenticatedUser,
    dto: CompleteProfileDto,
  ): Promise<RoleProfileView> {
    const userId = user.sub;

    switch (user.role) {
      case UserRole.PLAYER: {
        const block = dto.player;
        if (!block) throw this.roleMismatch(user.role);
        this.assertDistinctPositions(
          block.primaryPosition,
          block.secondaryPosition ?? null,
        );
        return tx.playerProfile.create({
          data: {
            userId,
            primaryPosition: block.primaryPosition,
            secondaryPosition: block.secondaryPosition,
            preferredFoot: block.preferredFoot,
            leagueLevel: block.leagueLevel,
            heightCm: block.heightCm,
            weightKg: block.weightKg,
            jerseyNumber: block.jerseyNumber,
            portfolioLink: block.portfolioLink,
          },
          select: PLAYER_PROFILE_SELECT,
        });
      }

      case UserRole.COACH: {
        const block = dto.coach;
        if (!block) throw this.roleMismatch(user.role);
        return tx.coachProfile.create({
          data: {
            userId,
            coachType: block.coachType,
            yearsExperience: block.yearsExperience,
            preferredFormation: block.preferredFormation,
            portfolioLink: block.portfolioLink,
          },
          select: COACH_PROFILE_SELECT,
        });
      }

      case UserRole.SCOUT: {
        const block = dto.scout;
        if (!block) throw this.roleMismatch(user.role);
        return tx.scoutProfile.create({
          data: {
            userId,
            scoutType: block.scoutType,
            regionsCovered: block.regionsCovered,
            yearsExperience: block.yearsExperience,
            portfolioLink: block.portfolioLink,
          },
          select: SCOUT_PROFILE_SELECT,
        });
      }

      case UserRole.ANALYST: {
        const block = dto.analyst;
        if (!block) throw this.roleMismatch(user.role);
        return tx.analystProfile.create({
          data: {
            userId,
            analystType: block.analystType,
            toolsUsed: block.toolsUsed,
            yearsExperience: block.yearsExperience,
            portfolioLink: block.portfolioLink,
          },
          select: ANALYST_PROFILE_SELECT,
        });
      }

      case UserRole.PHYSICAL_THERAPIST: {
        const block = dto.therapist;
        if (!block) throw this.roleMismatch(user.role);
        return tx.therapistProfile.create({
          data: {
            userId,
            specialization: block.specialization,
            yearsExperience: block.yearsExperience,
            clinicName: block.clinicName,
            portfolioLink: block.portfolioLink,
          },
          select: THERAPIST_PROFILE_SELECT,
        });
      }

      case UserRole.CLUB_ADMIN: {
        const block = dto.clubAdmin;
        if (!block) throw this.roleMismatch(user.role);
        // The professional role table for club administrators — NOT
        // admin_profiles, which no completion path can reach (PRD 7.1).
        return tx.clubAdminProfile.create({
          data: {
            userId,
            clubId: block.clubId,
            positionTitle: block.positionTitle,
          },
          select: CLUB_ADMIN_PROFILE_SELECT,
        });
      }
    }
  }

  /**
   * The body must carry the caller's role block and nothing else. The role
   * comes exclusively from the verified token — a body claiming a different
   * role is rejected, never honoured (§9).
   */
  private assertOnlyOwnBlock(
    role: UserRole,
    dto: Partial<Record<RoleDtoKey, unknown>>,
  ): void {
    const expected = ROLE_DTO_KEY[role];
    for (const key of Object.values(ROLE_DTO_KEY)) {
      if (key !== expected && dto[key] != null) throw this.roleMismatch(role);
    }
    if (dto[expected] == null) throw this.roleMismatch(role);
  }

  private roleMismatch(role: UserRole): BadRequestException {
    return new BadRequestException({
      code: ErrorCode.ROLE_MISMATCH,
      message: `Body must contain exactly the '${ROLE_DTO_KEY[role]}' block matching your role.`,
    });
  }

  private assertDistinctPositions(
    primary: PlayerPosition,
    secondary: PlayerPosition | null,
  ): void {
    if (secondary !== null && secondary === primary) {
      throw new BadRequestException({
        code: ErrorCode.VALIDATION_ERROR,
        message: 'secondaryPosition must differ from primaryPosition.',
      });
    }
  }

  private alreadyCompleted(): ConflictException {
    return new ConflictException({
      code: ErrorCode.PROFILE_ALREADY_COMPLETED,
      message: 'This account already has a completed profile.',
    });
  }
}
