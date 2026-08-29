import { Prisma } from '../../generated/prisma/client';

/**
 * The one-line rendering of a club: what a post's attribution block shows, and
 * what a search hit or a feed row will show. Owned by `reference` because
 * `clubs` is the reference module's table (§4) — other modules import this
 * constant rather than writing their own whitelist.
 *
 * The same reasoning as `profile-summary.map.ts`, whose header says it exists
 * because "more consumers are coming (search, feed, post authors)". `posts` is
 * that second consumer for clubs, so the extraction is due now rather than
 * after a third hand-written select has already drifted.
 *
 * BILINGUAL, and that is a v1 requirement, not a payload choice. FR-I18N ships
 * EN/AR with full RTL from day one, and the three-tier translation model puts
 * bilingual names in COLUMNS with the client picking — next-intl owns the
 * locale on the frontend, not the server. Returning only `nameEn` would make
 * an Arabic club name unreachable from a post, so an Arabic reader sees
 * "Zamalek" instead of الزمالك on every club post, or the frontend refetches
 * the club per post to repair it. That is a broken feature, not a saved byte.
 *
 * THERE IS DELIBERATELY NO `mapClubSummary`, and the asymmetry with
 * `profile-summary.map.ts` is the point. That file has a map function because
 * it has a TRANSFORM: `dateOfBirth` in, `age` out, and the birth date dropped
 * (§5). A club has no derived field and no PII to remove, so the selected row
 * IS the wire shape — `ReferenceService.listClubs` already returns its rows
 * straight through. A function copying six fields to six identically-named
 * fields would not prevent drift; it would CREATE the second transform site
 * that D-010 records as debt, and `select` is already the whitelist that stops
 * a new column leaking through.
 *
 * If clubs ever gain a derived field, the map function appears then, with a
 * reason — and it appears HERE, once, for every consumer.
 */
export const CLUB_SUMMARY_SELECT = {
  id: true,
  nameEn: true,
  nameAr: true,
  shortNameEn: true,
  shortNameAr: true,
  logoUrl: true,
} satisfies Prisma.ClubSelect;

/** Row and wire shape both — see above for why they are the same type. */
export type ClubSummaryView = Prisma.ClubGetPayload<{
  select: typeof CLUB_SUMMARY_SELECT;
}>;
