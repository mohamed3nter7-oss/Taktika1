import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Request } from 'express';
import { UserStatus } from '../../generated/prisma/client';
import { ALLOW_INCOMPLETE_PROFILE_KEY } from '../decorators/allow-incomplete-profile.decorator';
import { ErrorCode } from '../errors/error-codes';

/**
 * Global guard #3 — runs after `JwtAuthGuard` (CLAUDE.md §9).
 *
 * A `PENDING_PROFILE` user has verified their email but has no role extension
 * row yet. They may reach the auth endpoints and profile completion; every
 * other route is 403 `PROFILE_INCOMPLETE`.
 *
 * Zero Prisma, zero business logic on purpose: `status` comes straight off the
 * already-verified token, so this costs no query on every single request. The
 * trade-off is that a status change takes effect at the next access-token
 * refresh, which is at most 15 minutes.
 */
@Injectable()
export class ProfileCompleteGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const user = context.switchToHttp().getRequest<Request>().user;

    // No verified identity: a @Public() route that JwtAuthGuard already
    // cleared. Nothing to gate on.
    if (!user) return true;

    if (user.status !== UserStatus.PENDING_PROFILE) return true;

    const allowed = this.reflector.getAllAndOverride<boolean>(
      ALLOW_INCOMPLETE_PROFILE_KEY,
      [context.getHandler(), context.getClass()],
    );
    if (allowed) return true;

    throw new ForbiddenException({
      code: ErrorCode.PROFILE_INCOMPLETE,
      message: 'Complete your profile before using this endpoint.',
    });
  }
}
