import type { UserRole } from "./player-profile";

/**
 * The signed-in user, as the application shell needs them.
 *
 * Deliberately not a `PlayerProfile`. The viewer and the profile being viewed
 * are different people in every case except one, and the shell must not be
 * able to agree with a profile fixture by accident - that is exactly how a
 * broken "own profile" state hides until someone else looks at the page.
 */
export type Viewer = {
  fullName: string;
  avatarUrl: string | null;
  role: UserRole;
};
