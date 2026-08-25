import {
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AuthGuard } from '@nestjs/passport';
import type { Observable } from 'rxjs';
import { IS_PUBLIC_KEY } from '../../../common/decorators/public.decorator';
import { ErrorCode } from '../../../common/errors/error-codes';
import type { AuthenticatedUser } from '../../../common/types/authenticated-user';

/**
 * Global guard #2 (CLAUDE.md §9). Every route is protected unless it carries
 * `@Public()`, so a new endpoint fails closed by default.
 *
 * Identity is taken exclusively from the verified token via `JwtStrategy` —
 * this guard never reads a userId from a body, query or header.
 */
@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  constructor(private readonly reflector: Reflector) {
    super();
  }

  canActivate(
    context: ExecutionContext,
  ): boolean | Promise<boolean> | Observable<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) return true;

    return super.canActivate(context);
  }

  /**
   * Collapses every passport failure — missing header, bad signature, expired,
   * malformed — into one 401. The client's only correct response is a single
   * silent refresh-and-retry (§9), so the distinction buys nothing and would
   * hand an attacker a token oracle.
   */
  handleRequest<TUser = AuthenticatedUser>(
    err: unknown,
    user: TUser | false,
  ): TUser {
    if (err || !user) {
      throw new UnauthorizedException({
        code: ErrorCode.UNAUTHORIZED,
        message: 'Authentication required.',
      });
    }
    return user;
  }
}
