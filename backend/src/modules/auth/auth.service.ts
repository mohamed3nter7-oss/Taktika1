import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { randomUUID } from 'node:crypto';
import { ErrorCode } from '../../common/errors/error-codes';
import type { AuthenticatedUser } from '../../common/types/authenticated-user';
import { UserStatus } from '../../generated/prisma/client';
import { PrismaService } from '../../common/prisma/prisma.service';
import { ReferenceService } from '../reference/reference.service';
import {
  decideRefresh,
  generateRefreshToken,
  hashRefreshToken,
  meetsMinimumAge,
  minimumAgeForRole,
  refreshTokenExpiry,
} from './auth.logic';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';

// --- CLAUDE.md §9 invariants. Deliberately constants, not env vars: §15 lists
// token lifetimes as "ask before changing", and a config key is an invariant
// one bad deploy away from drifting.
const BCRYPT_COST = 12;
const ACCESS_TOKEN_TTL_SECONDS = 15 * 60; // 15 minutes
const REFRESH_TOKEN_TTL_DAYS = 30;
const VERIFICATION_TOKEN_TTL = '24h';

/** Marks a verification token so it can never be replayed as an access token. */
const VERIFICATION_TOKEN_TYPE = 'email_verify';

/**
 * Burned against unknown emails so a login attempt costs the same whether or
 * not the account exists. Without it, response time is an account-enumeration
 * oracle that defeats the uniform 401.
 */
const DUMMY_PASSWORD_HASH =
  '$2b$12$Gbv0zSfJULJp7aFzIu4AMu40SUHYkMvupcFRzgoklkqiUTtd5TxJu';

/**
 * Columns safe to return for the caller's own record.
 *
 * CLAUDE.md §5: `passwordHash` and `phone` never leave the API; `email` only
 * to its owner via /auth/me. There is no "return the whole user row" anywhere.
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
} as const;

export interface IssuedSession {
  accessToken: string;
  expiresIn: number;
  /** Raw opaque token. The CONTROLLER puts this in the cookie, never the service. */
  refreshToken: string;
}

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
    private readonly reference: ReferenceService,
  ) {}

  // ===========================================================================
  // Register
  // ===========================================================================

  async register(dto: RegisterDto) {
    const now = new Date();

    if (!meetsMinimumAge(dto.role, dto.dateOfBirth, now)) {
      throw new BadRequestException({
        code: ErrorCode.UNDERAGE,
        message: `Minimum age for this role is ${minimumAgeForRole(dto.role)}.`,
      });
    }

    // The FKs prove both ids EXIST but not that the city sits in that country
    // (PRD 9.1) — no constraint expresses that, so it is checked here, exactly
    // as PATCH /users/me does. Not the check-then-insert §5 forbids: that rule
    // is about uniqueness races, and a city never changes country (EC-7 also
    // forbids deleting reference rows), so there is no race to lose.
    // Deliberately before the bcrypt hash — a bad pair should not cost a
    // cost-12 KDF run on a public endpoint.
    await this.reference.assertCityInCountry(dto.cityId, dto.countryId);

    const passwordHash = await bcrypt.hash(dto.password, BCRYPT_COST);
    const user = await this.createUser(dto, passwordHash);

    // Still sent in development: it logs a real token, so the genuine
    // /auth/verify-email route stays exercisable even with auto-verify on.
    await this.sendVerificationEmail(user.id);

    return this.autoVerifyInDevelopment(user);
  }

  /**
   * DEV ONLY — moves a new account straight to PENDING_PROFILE.
   *
   * No mail service is wired yet, so the only way to obtain a verification
   * token is the debug line `sendVerificationEmail` logs. That is fine for the
   * e2e suite, which reads the logger in-process, and unusable for anyone
   * driving the app in a browser: registration dead-ends at "check your inbox"
   * with no inbox. This unblocks that, and nothing else.
   *
   * `=== 'development'` deliberately, NOT `!== 'production'`. Jest sets
   * NODE_ENV=test, so the negative form would fire throughout the e2e suite and
   * silently invalidate every assertion that a fresh account is
   * PENDING_VERIFICATION with a null emailVerifiedAt (auth-flow.e2e-spec.ts).
   * A test suite that cannot observe the unverified state is not testing
   * verification at all.
   *
   * There is no env flag on purpose. A flag is a thing that can be set by
   * accident in production; NODE_ENV is already load-bearing there, so this
   * cannot be switched on without breaking everything else first. The WARN is
   * the tripwire: it has no business appearing in a production log.
   *
   * Delete this method the day the mailer lands.
   */
  private async autoVerifyInDevelopment<T extends { id: string; email: string }>(
    user: T,
  ): Promise<T> {
    if (process.env.NODE_ENV !== 'development') return user;

    // Returns the updated row rather than the pre-update one: the response
    // contract carries `status`, and answering PENDING_VERIFICATION while the
    // database says PENDING_PROFILE would be a lie the client then acts on.
    const verified = await this.prisma.user.update({
      where: { id: user.id },
      data: {
        emailVerifiedAt: new Date(),
        status: UserStatus.PENDING_PROFILE,
      },
      select: {
        id: true,
        email: true,
        fullName: true,
        role: true,
        status: true,
      },
    });

    this.logger.warn(
      `[DEV] Auto-verified ${user.email} — email verification skipped. This must never appear in production.`,
    );

    return { ...user, ...verified };
  }

  /**
   * One explicit create with a fixed field list. No spread of the DTO, no
   * nested write — `admin_profiles` is unreachable from here by construction
   * (§9), not by validation.
   */
  private async createUser(dto: RegisterDto, passwordHash: string) {
    try {
      return await this.prisma.user.create({
        data: {
          email: dto.email,
          passwordHash,
          fullName: dto.fullName,
          role: dto.role,
          dateOfBirth: dto.dateOfBirth,
          countryId: dto.countryId,
          cityId: dto.cityId,
          gender: dto.gender,
          phone: dto.phone,
          headline: dto.headline,
          bio: dto.bio,
          status: UserStatus.PENDING_VERIFICATION,
        },
        select: {
          id: true,
          email: true,
          fullName: true,
          role: true,
          status: true,
        },
      });
    } catch (error) {
      // No check-then-insert (§5): let the unique index decide, then translate.
      if (this.isUniqueViolation(error, 'email')) {
        throw new ConflictException({
          code: ErrorCode.EMAIL_TAKEN,
          message: 'That email address is already registered.',
        });
      }
      throw error;
    }
  }

  // ===========================================================================
  // Verify email
  // ===========================================================================

  async verifyEmail(token: string) {
    const userId = await this.readVerificationToken(token);

    // Conditional update: two clicks on the same link race here, and only the
    // one that finds the row still PENDING_VERIFICATION may transition it.
    const transitioned = await this.prisma.user.updateMany({
      where: { id: userId, status: UserStatus.PENDING_VERIFICATION },
      data: { status: UserStatus.PENDING_PROFILE, emailVerifiedAt: new Date() },
    });

    if (transitioned.count === 0) {
      const existing = await this.prisma.user.findUnique({
        where: { id: userId },
        select: { id: true },
      });
      if (!existing) {
        // Token signed for a user that no longer exists. Same response as a
        // forged token — never confirm which.
        throw new BadRequestException({
          code: ErrorCode.INVALID_VERIFICATION_TOKEN,
          message: 'This verification link is invalid or has expired.',
        });
      }
      throw new ConflictException({
        code: ErrorCode.EMAIL_ALREADY_VERIFIED,
        message: 'This email address has already been verified.',
      });
    }

    return { id: userId, status: UserStatus.PENDING_PROFILE };
  }

  // ===========================================================================
  // Login
  // ===========================================================================

  async login(dto: LoginDto, userAgent?: string): Promise<IssuedSession> {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email },
      select: { id: true, passwordHash: true, role: true, status: true },
    });

    // Always run a comparison, even with no user, so timing does not answer
    // "does this account exist?".
    const passwordMatches = await bcrypt.compare(
      dto.password,
      user?.passwordHash ?? DUMMY_PASSWORD_HASH,
    );

    if (!user || !passwordMatches) {
      // §9: uniform failure. Which field was wrong is never revealed.
      throw new UnauthorizedException({
        code: ErrorCode.INVALID_CREDENTIALS,
        message: 'Invalid email or password.',
      });
    }

    // Only after the credential is proven — these say nothing to someone who
    // does not already hold the password.
    this.assertLoginAllowed(user.status);

    return this.issueSession(
      { sub: user.id, role: user.role, status: user.status },
      randomUUID(), // a login starts a NEW token family
      userAgent,
    );
  }

  // ===========================================================================
  // Refresh — rotation + reuse detection (§9, the breach tripwire)
  // ===========================================================================

  async refresh(rawToken: string | undefined, userAgent?: string) {
    if (!rawToken) throw this.invalidRefreshToken();

    const now = new Date();
    const stored = await this.prisma.refreshToken.findUnique({
      where: { tokenHash: hashRefreshToken(rawToken) },
      select: {
        id: true,
        userId: true,
        familyId: true,
        revokedAt: true,
        expiresAt: true,
        user: { select: { role: true, status: true } },
      },
    });

    const decision = decideRefresh(stored, now);

    if (!stored || decision === 'REJECT') throw this.invalidRefreshToken();

    if (decision === 'REVOKE_FAMILY') {
      // Already-rotated token presented again ⇒ a copy is in someone else's
      // hands. Kill every sibling session on one indexed UPDATE — this is
      // exactly what familyId exists for.
      await this.revokeFamily(stored.familyId);
      this.logger.warn(
        `Refresh token reuse detected — revoked family ${stored.familyId} for user ${stored.userId}`,
      );
      // Same 401 as every other failure: telling them the tripwire fired is
      // telling them to change tactics.
      throw this.invalidRefreshToken();
    }

    // A suspension can only be enforced here — an access token already in the
    // wild cannot be recalled, only outlived. Cut the family first so no
    // sibling device can refresh either.
    if (!this.isSessionEligible(stored.user.status)) {
      await this.revokeFamily(stored.familyId);
      this.assertLoginAllowed(stored.user.status);
    }

    const live = stored;
    const nextToken = generateRefreshToken();

    // Interactive transaction so the revoke can be CONDITIONAL: two concurrent
    // refreshes with the same token must not both mint a child. The loser sees
    // count === 0 and gets the uniform 401, which the frontend's single
    // silent retry (§9) absorbs.
    const rotated = await this.prisma.$transaction(async (tx) => {
      const revoked = await tx.refreshToken.updateMany({
        where: { id: live.id, revokedAt: null },
        data: { revokedAt: now },
      });
      if (revoked.count === 0) return false;

      await tx.refreshToken.create({
        data: {
          userId: live.userId,
          tokenHash: hashRefreshToken(nextToken),
          familyId: live.familyId, // successor stays in the same family
          userAgent: userAgent ?? null,
          expiresAt: refreshTokenExpiry(now, REFRESH_TOKEN_TTL_DAYS),
        },
      });
      return true;
    });

    if (!rotated) throw this.invalidRefreshToken();

    return {
      accessToken: await this.signAccessToken({
        sub: live.userId,
        role: live.user.role,
        status: live.user.status,
      }),
      expiresIn: ACCESS_TOKEN_TTL_SECONDS,
      refreshToken: nextToken,
    };
  }

  // ===========================================================================
  // Logout
  // ===========================================================================

  /** Revokes the caller's whole token family — every device on that session. */
  async logout(rawToken: string | undefined, callerId: string): Promise<void> {
    if (!rawToken) return; // already logged out; the controller still clears the cookie

    const stored = await this.prisma.refreshToken.findUnique({
      where: { tokenHash: hashRefreshToken(rawToken) },
      select: { userId: true, familyId: true },
    });

    // Silently no-op on an unknown or someone else's token. Reporting the
    // difference would turn logout into a token-validity oracle.
    if (!stored || stored.userId !== callerId) return;

    await this.revokeFamily(stored.familyId);
  }

  // ===========================================================================
  // Me
  // ===========================================================================

  async me(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: OWN_USER_SELECT,
    });

    if (!user) {
      // Valid signature, vanished user — the token is worthless either way.
      throw new UnauthorizedException({
        code: ErrorCode.UNAUTHORIZED,
        message: 'Authentication required.',
      });
    }

    return user;
  }

  // ===========================================================================
  // Internals
  // ===========================================================================

  private async issueSession(
    identity: AuthenticatedUser,
    familyId: string,
    userAgent?: string,
  ): Promise<IssuedSession> {
    const now = new Date();
    const refreshToken = generateRefreshToken();

    await this.prisma.refreshToken.create({
      data: {
        userId: identity.sub,
        tokenHash: hashRefreshToken(refreshToken), // §9: stored hashed, never raw
        familyId,
        userAgent: userAgent ?? null,
        expiresAt: refreshTokenExpiry(now, REFRESH_TOKEN_TTL_DAYS),
      },
    });

    return {
      accessToken: await this.signAccessToken(identity),
      expiresIn: ACCESS_TOKEN_TTL_SECONDS,
      refreshToken,
    };
  }

  /** Payload is exactly `sub`, `role`, `status` — nothing else (§9). */
  private signAccessToken(identity: AuthenticatedUser): Promise<string> {
    return this.jwt.signAsync(
      { sub: identity.sub, role: identity.role, status: identity.status },
      { expiresIn: ACCESS_TOKEN_TTL_SECONDS },
    );
  }

  private async revokeFamily(familyId: string): Promise<void> {
    await this.prisma.refreshToken.updateMany({
      where: { familyId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }

  private isSessionEligible(status: UserStatus): boolean {
    return (
      status === UserStatus.PENDING_PROFILE || status === UserStatus.ACTIVE
    );
  }

  /**
   * Status gate applied only AFTER a credential is proven, so it tells nothing
   * to someone who does not already hold the password or refresh token.
   *
   * PENDING_VERIFICATION is rejected because `ProfileCompleteGuard` gates only
   * PENDING_PROFILE — without this, an unverified user with a token would
   * reach every route and email verification would be decorative.
   */
  private assertLoginAllowed(status: UserStatus): void {
    if (status === UserStatus.PENDING_VERIFICATION) {
      throw new ForbiddenException({
        code: ErrorCode.EMAIL_NOT_VERIFIED,
        message: 'Verify your email address before signing in.',
      });
    }

    if (!this.isSessionEligible(status)) {
      throw new ForbiddenException({
        code: ErrorCode.ACCOUNT_SUSPENDED,
        message: 'This account is not active.',
      });
    }
  }

  private invalidRefreshToken(): UnauthorizedException {
    // One shape for unknown, expired and reused alike (§9).
    return new UnauthorizedException({
      code: ErrorCode.INVALID_REFRESH_TOKEN,
      message: 'Your session has expired. Please sign in again.',
    });
  }

  private async readVerificationToken(token: string): Promise<string> {
    try {
      const payload = await this.jwt.verifyAsync<{ sub: string; typ: string }>(
        token,
        { secret: this.config.getOrThrow<string>('EMAIL_VERIFICATION_SECRET') },
      );
      // Separate secret AND an explicit type claim: a verification token must
      // never be presentable as an access token, or vice versa.
      if (payload.typ !== VERIFICATION_TOKEN_TYPE || !payload.sub) {
        throw new Error('wrong token type');
      }
      return payload.sub;
    } catch {
      throw new BadRequestException({
        code: ErrorCode.INVALID_VERIFICATION_TOKEN,
        message: 'This verification link is invalid or has expired.',
      });
    }
  }

  /**
   * Mail seam. CLAUDE.md §13 mocks mail at the module boundary; until a real
   * mailer exists this logs, so the flow is complete and the swap is one
   * method body.
   */
  private async sendVerificationEmail(userId: string): Promise<void> {
    const token = await this.jwt.signAsync(
      { sub: userId, typ: VERIFICATION_TOKEN_TYPE },
      {
        secret: this.config.getOrThrow<string>('EMAIL_VERIFICATION_SECRET'),
        expiresIn: VERIFICATION_TOKEN_TTL,
      },
    );

    // TODO: hand off to the real mailer.
    this.logger.log(`Verification email queued for user ${userId}`);

    // The ONE deliberate exception to §9's "never log tokens", and the only
    // way to exercise /auth/verify-email before a mailer exists. Never runs in
    // production; delete this block the day the mailer lands.
    if (this.config.get<string>('NODE_ENV') !== 'production') {
      this.logger.debug(
        `[dev only] verification token for ${userId}: ${token}`,
      );
    }
  }

  private isUniqueViolation(error: unknown, field: string): boolean {
    const candidate = error as { code?: string; meta?: { target?: unknown } };
    if (candidate?.code !== 'P2002') return false;

    const target = candidate.meta?.target;
    // Prisma reports the offending column(s); `users` has one unique field
    // reachable from here, so an absent target still means email.
    if (Array.isArray(target)) return target.includes(field);
    if (typeof target === 'string') return target.includes(field);
    return true;
  }
}
