import type { UserRole, UserStatus } from '../../generated/prisma/client';

/**
 * The verified JWT payload, and the ONLY identity source in the application
 * (CLAUDE.md §9). Guards, decorators and services read from here — never from
 * a body, query or header field.
 *
 * Deliberately exactly three claims. Anything else a handler needs is looked
 * up from `sub`; adding fields here means widening what a stolen 15-minute
 * token is worth.
 */
export interface AuthenticatedUser {
  /** users.id */
  sub: string;
  role: UserRole;
  status: UserStatus;
}

/** Registered claims the signer adds; present on a verified token. */
export interface AccessTokenPayload extends AuthenticatedUser {
  iat: number;
  exp: number;
}

// Makes `req.user` resolve to AuthenticatedUser instead of passport's empty
// `Express.User`, so nothing downstream has to cast.
declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    // Empty body is the point: this merges into passport's `Express.User` so
    // `req.user` resolves to AuthenticatedUser everywhere.
    // eslint-disable-next-line @typescript-eslint/no-empty-object-type
    interface User extends AuthenticatedUser {}
  }
}
