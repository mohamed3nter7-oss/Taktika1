import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import type { Request } from 'express';
import type { AuthenticatedUser } from '../types/authenticated-user';

/**
 * Injects the verified JWT payload attached by `JwtAuthGuard`.
 *
 * Undefined on `@Public()` routes — those have no verified identity, and
 * inventing one from the request would be exactly the thing CLAUDE.md §9
 * forbids.
 */
export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): AuthenticatedUser | undefined =>
    ctx.switchToHttp().getRequest<Request>().user,
);
