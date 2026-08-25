import { SetMetadata } from '@nestjs/common';

export const IS_PUBLIC_KEY = 'isPublic';

/**
 * Opts a route out of the global `JwtAuthGuard`.
 *
 * CLAUDE.md §9: the guard is global and routes opt OUT — never the reverse.
 * A new endpoint is protected by default; forgetting a decorator fails closed.
 */
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);
