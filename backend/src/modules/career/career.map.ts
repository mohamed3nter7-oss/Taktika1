import { Prisma } from '../../generated/prisma/client';

/**
 * Select whitelists, orderings and the one derived field for the two career
 * tables (FR-PROF-4, FR-PROF-5).
 *
 * Compile-time constants rather than a service, on purpose. `profiles` selects
 * `certifications` and `affiliations` as relations of its own aggregate root
 * — the §3 "selects relations through its own aggregate root" clause — and the
 * embed in GET /users/:id must return byte-identical shapes to the career
 * endpoints. Sharing these constants is what stops the two drifting. Injecting
 * `CareerService` into `ProfilesService` instead would invert the dependency:
 * CareerModule already imports ProfilesModule for user visibility, so that
 * direction is a module cycle.
 */

// =============================================================================
// Certifications
// =============================================================================

/**
 * `isVerified` is readable but appears on NO DTO: it is admin-only and always
 * false in v1 (FR-PROF-4), so `forbidNonWhitelisted` turns any attempt to set
 * it into a 400. Returned anyway so the frontend has its badge slot from day
 * one — the same reasoning as `playersRecommended` in role-profile.map.ts.
 *
 * No `userId` (redundant in context) and no timestamps.
 */
export const CERTIFICATION_SELECT = {
  id: true,
  name: true,
  issuer: true,
  issueDate: true,
  expiryDate: true,
  isVerified: true,
} satisfies Prisma.CertificationSelect;

/**
 * Most recently issued first; undated rows last rather than first — an
 * undated certification is the least informative, not the most recent.
 * `createdAt`/`id` break ties so pages and embeds are deterministic.
 */
export const CERTIFICATION_ORDER_BY = [
  { issueDate: { sort: 'desc', nulls: 'last' } },
  { createdAt: 'desc' },
  { id: 'desc' },
] satisfies Prisma.CertificationOrderByWithRelationInput[];

export type CertificationView = Prisma.CertificationGetPayload<{
  select: typeof CERTIFICATION_SELECT;
}>;

// =============================================================================
// Club affiliations
// =============================================================================

/**
 * The club is joined, never flattened: a club is an entity, and the wire
 * carries the same `{ id, nameEn, nameAr, logoUrl }` block that
 * CLUB_ADMIN_PROFILE_SELECT already established.
 *
 * There is no `isCurrent` here because there is no such column — it is derived
 * from `endDate IS NULL` in `mapAffiliation` (PRD 7.3: current club is a
 * query, not a column).
 */
export const AFFILIATION_SELECT = {
  id: true,
  clubId: true,
  roleAtClub: true,
  startDate: true,
  endDate: true,
  club: { select: { id: true, nameEn: true, nameAr: true, logoUrl: true } },
} satisfies Prisma.ClubAffiliationSelect;

/**
 * Current stints first (`endDate` NULL sorts first under DESC), then most
 * recently started. This is what lets the UI label the first row primary
 * without blocking a second open row (PRD 9.2 edge cases).
 */
export const AFFILIATION_ORDER_BY = [
  { endDate: { sort: 'desc', nulls: 'first' } },
  { startDate: 'desc' },
  { id: 'desc' },
] satisfies Prisma.ClubAffiliationOrderByWithRelationInput[];

type AffiliationRow = Prisma.ClubAffiliationGetPayload<{
  select: typeof AFFILIATION_SELECT;
}>;

export type AffiliationView = AffiliationRow & { isCurrent: boolean };

/** The single place `isCurrent` is derived — never stored, never settable. */
export function mapAffiliation(row: AffiliationRow): AffiliationView {
  return { ...row, isCurrent: row.endDate === null };
}
