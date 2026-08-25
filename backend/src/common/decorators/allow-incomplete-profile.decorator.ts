import { SetMetadata } from '@nestjs/common';

export const ALLOW_INCOMPLETE_PROFILE_KEY = 'allowIncompleteProfile';

/**
 * Opts a route out of the global `ProfileCompleteGuard`, letting a
 * `PENDING_PROFILE` user reach it.
 *
 * Belongs only on the auth endpoints and profile completion (CLAUDE.md §9) —
 * everything else must stay closed until the role extension row exists.
 */
export const AllowIncompleteProfile = () =>
  SetMetadata(ALLOW_INCOMPLETE_PROFILE_KEY, true);
