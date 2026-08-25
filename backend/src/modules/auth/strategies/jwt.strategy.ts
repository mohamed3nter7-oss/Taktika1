import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ErrorCode } from '../../../common/errors/error-codes';
import type {
  AccessTokenPayload,
  AuthenticatedUser,
} from '../../../common/types/authenticated-user';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
  constructor(config: ConfigService) {
    super({
      // Bearer header ONLY. No query-string or body extractor: those leak the
      // token into access logs and browser history (CLAUDE.md §9).
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: config.getOrThrow<string>('JWT_SECRET'),
    });
  }

  /**
   * Runs only on an already-verified signature and expiry.
   *
   * Returns the payload as-is with NO database lookup — that is what keeps
   * `ProfileCompleteGuard` free of Prisma and every request free of a query.
   * The cost is that a suspension takes effect at the next token refresh, at
   * most 15 minutes away, which is the point of the short access-token TTL.
   */
  validate(payload: AccessTokenPayload): AuthenticatedUser {
    if (!payload?.sub || !payload.role || !payload.status) {
      throw new UnauthorizedException({
        code: ErrorCode.UNAUTHORIZED,
        message: 'Malformed access token.',
      });
    }

    return { sub: payload.sub, role: payload.role, status: payload.status };
  }
}
