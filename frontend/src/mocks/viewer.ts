import type { Viewer } from "@/types/viewer";

/**
 * The signed-in user.
 *
 * A scout, and no avatar - so the shell exercises the initials fallback, and
 * so this is visibly a different person from every profile fixture. There is
 * no session yet; this stands in for one.
 */
export const MOCK_VIEWER: Viewer = {
  fullName: "Tarek Fouad",
  avatarUrl: null,
  role: "SCOUT",
};
