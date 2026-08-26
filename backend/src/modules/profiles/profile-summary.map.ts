import { calculateAge } from '../auth/auth.logic';
import { Prisma } from '../../generated/prisma/client';

/**
 * The one-line rendering of a person: what a follower row, a search hit, or a
 * post author block shows. Owned by `profiles` because `users` is the profiles
 * module's table (§4) — other modules import this constant rather than writing
 * their own whitelist.
 *
 * A compile-time constant rather than a service method, matching `career.map.ts`.
 * That file exists because the GET /users/:id embed and the career endpoints
 * must return byte-identical shapes; the same reasoning applies here, with more
 * consumers coming (search, feed, post authors). A second hand-written select
 * somewhere else is exactly how the shapes drift.
 *
 * Deliberately NOT `PUBLIC_USER_SELECT`: that pulls all six role relations plus
 * certifications and affiliations — eight relations per row, which is right for
 * one profile page and indefensible for a page of twenty follower rows.
 */
export const PROFILE_SUMMARY_SELECT = {
  id: true,
  fullName: true,
  role: true,
  headline: true,
  avatarUrl: true,
  // Fetched, never serialised. `mapProfileSummary` converts it to `age` and
  // drops it — the wire carries the integer only (§5: users can be 12, and a
  // birth date on a list endpoint is the same disclosure as on a profile).
  dateOfBirth: true,
} satisfies Prisma.UserSelect;

type ProfileSummaryRow = Prisma.UserGetPayload<{
  select: typeof PROFILE_SUMMARY_SELECT;
}>;

export interface ProfileSummaryView {
  id: string;
  fullName: string;
  role: Prisma.UserGetPayload<{ select: { role: true } }>['role'];
  headline: string | null;
  avatarUrl: string | null;
  age: number;
}

/**
 * Row → wire. Field-by-field, so what ships is exactly this list: a spread
 * would carry `dateOfBirth` straight through the moment anyone adds a field.
 */
export function mapProfileSummary(
  row: ProfileSummaryRow,
  now: Date = new Date(),
): ProfileSummaryView {
  return {
    id: row.id,
    fullName: row.fullName,
    role: row.role,
    headline: row.headline,
    avatarUrl: row.avatarUrl,
    age: calculateAge(row.dateOfBirth, now),
  };
}
