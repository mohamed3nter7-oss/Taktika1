import { BadRequestException, Injectable } from '@nestjs/common';
import { ErrorCode } from '../../common/errors/error-codes';
import {
  decodeNameIdCursor,
  encodeNameIdCursor,
} from '../../common/pagination/cursor';
import {
  AnalystType,
  CoachType,
  LeagueLevel,
  PlayerPosition,
  PreferredFoot,
  Prisma,
  ScoutType,
} from '../../generated/prisma/client';
import { PrismaService } from '../../common/prisma/prisma.service';
import { CLUB_SUMMARY_SELECT } from './club-summary.map';
import { ListClubsQueryDto } from './dto/reference-queries.dto';

const DEFAULT_CLUB_PAGE = 20;

// Composed from CLUB_SUMMARY_SELECT so the six shared fields have ONE
// definition -- the posts module embeds the same block, and a second
// hand-written whitelist is how the two shapes drift apart. The spread comes
// FIRST, so the key order -- and therefore the JSON key order -- is unchanged.
const CLUB_SELECT = {
  ...CLUB_SUMMARY_SELECT,
  foundedYear: true,
  country: { select: { id: true, code: true, nameEn: true, nameAr: true } },
  city: { select: { id: true, nameEn: true, nameAr: true } },
  league: { select: { id: true, nameEn: true, nameAr: true } },
} satisfies Prisma.ClubSelect;

/**
 * The enum option sets the step-2 (profile completion) form renders. Values
 * are the wire enums; the frontend owns their EN/AR display strings (PRD
 * three-tier translation model — enums are tier 2, translated client-side).
 */
const ROLE_ENUM_OPTIONS = {
  playerPositions: Object.values(PlayerPosition),
  preferredFeet: Object.values(PreferredFoot),
  leagueLevels: Object.values(LeagueLevel),
  coachTypes: Object.values(CoachType),
  scoutTypes: Object.values(ScoutType),
  analystTypes: Object.values(AnalystType),
} as const;

/**
 * Read-only reference data (PRD EC-7: reference rows are never deleted, so
 * there are no write methods here to begin with). Countries/cities/leagues are
 * small bounded sets and return in one page; clubs are the one open-ended
 * list and paginate by keyset (§5 — no OFFSET).
 */
@Injectable()
export class ReferenceService {
  constructor(private readonly prisma: PrismaService) {}

  async listCountries() {
    const items = await this.prisma.country.findMany({
      select: { id: true, code: true, nameEn: true, nameAr: true },
      orderBy: { nameEn: 'asc' },
    });
    return { data: items, nextCursor: null };
  }

  async listCities(countryId: number) {
    const items = await this.prisma.city.findMany({
      where: { countryId },
      select: { id: true, countryId: true, nameEn: true, nameAr: true },
      orderBy: { nameEn: 'asc' },
    });
    return { data: items, nextCursor: null };
  }

  async listLeagues(countryId?: number) {
    const items = await this.prisma.league.findMany({
      where: countryId === undefined ? undefined : { countryId },
      select: {
        id: true,
        countryId: true,
        nameEn: true,
        nameAr: true,
        level: true,
      },
      orderBy: [
        { countryId: 'asc' },
        { level: { sort: 'asc', nulls: 'last' } },
        { nameEn: 'asc' },
      ],
    });
    return { data: items, nextCursor: null };
  }

  async listClubs(query: ListClubsQueryDto) {
    const limit = query.limit ?? DEFAULT_CLUB_PAGE;

    // Every predicate goes into one AND list. The q-filter and the cursor are
    // BOTH OR-clauses — merged into a single object literal the second would
    // silently overwrite the first.
    const conditions: Prisma.ClubWhereInput[] = [];
    if (query.countryId !== undefined) {
      conditions.push({ countryId: query.countryId });
    }
    if (query.leagueId !== undefined) {
      conditions.push({ leagueId: query.leagueId });
    }
    if (query.q) {
      const contains = { contains: query.q, mode: 'insensitive' } as const;
      conditions.push({
        OR: [
          { nameEn: contains },
          { nameAr: contains },
          { shortNameEn: contains },
          { shortNameAr: contains },
        ],
      });
    }

    if (query.cursor !== undefined) {
      const cursor = decodeNameIdCursor(query.cursor);
      if (!cursor) {
        throw new BadRequestException({
          code: ErrorCode.VALIDATION_ERROR,
          message: 'cursor is not a valid pagination token.',
        });
      }
      // Keyset over the (nameEn, id) ordering; id breaks ties between
      // duplicate names so pages are disjoint.
      conditions.push({
        OR: [
          { nameEn: { gt: cursor.name } },
          { nameEn: cursor.name, id: { gt: cursor.id } },
        ],
      });
    }

    // Fetch one extra row purely to learn whether a next page exists.
    const rows = await this.prisma.club.findMany({
      where: { AND: conditions },
      select: CLUB_SELECT,
      orderBy: [{ nameEn: 'asc' }, { id: 'asc' }],
      take: limit + 1,
    });

    const items = rows.slice(0, limit);
    const last = items[items.length - 1];
    const nextCursor =
      rows.length > limit && last
        ? encodeNameIdCursor({ name: last.nameEn, id: last.id })
        : null;

    return { data: items, nextCursor };
  }

  listRoleEnumOptions() {
    return ROLE_ENUM_OPTIONS;
  }

  /**
   * Exported seam for other modules (§3): profiles validates location edits
   * here instead of querying `cities` itself. The FK on `users` only proves
   * the city EXISTS — this proves it belongs to the submitted country
   * (PRD 9.1 validation table).
   */
  async assertCityInCountry(cityId: number, countryId: number): Promise<void> {
    const city = await this.prisma.city.findUnique({
      where: { id: cityId },
      select: { countryId: true },
    });
    if (!city || city.countryId !== countryId) {
      throw new BadRequestException({
        code: ErrorCode.VALIDATION_ERROR,
        message: 'cityId must reference a city in the given country.',
      });
    }
  }

  /**
   * Exported seam for other modules (§3): career validates affiliation clubs
   * here instead of querying `clubs` itself.
   *
   * A 400 rather than the FK's own error, because this is the enforcement
   * point for PRD 9.2's hardest club rule — a club the user cannot find goes
   * to the admin request queue; a free-text club name is NEVER accepted, since
   * that reintroduces the string-duplication anomaly the schema eliminated.
   */
  async assertClubExists(clubId: number): Promise<void> {
    const club = await this.prisma.club.findUnique({
      where: { id: clubId },
      select: { id: true },
    });
    if (!club) {
      throw new BadRequestException({
        code: ErrorCode.VALIDATION_ERROR,
        message: 'clubId must reference an existing club.',
      });
    }
  }
}
