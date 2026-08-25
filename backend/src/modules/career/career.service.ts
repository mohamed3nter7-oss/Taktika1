import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ErrorCode } from '../../common/errors/error-codes';
import { Prisma } from '../../generated/prisma/client';
import { PrismaService } from '../../common/prisma/prisma.service';
import { ProfilesService } from '../profiles/profiles.service';
import { ReferenceService } from '../reference/reference.service';
import {
  AFFILIATION_ORDER_BY,
  AFFILIATION_SELECT,
  CERTIFICATION_ORDER_BY,
  CERTIFICATION_SELECT,
  mapAffiliation,
} from './career.map';
import {
  CreateAffiliationDto,
  UpdateAffiliationDto,
} from './dto/affiliation.dto';
import {
  CreateCertificationDto,
  UpdateCertificationDto,
} from './dto/certification.dto';

/**
 * Both date columns are `@db.Date`, and the SQL CHECKs (§6) compare them as
 * DATEs — day granularity, UTC. The application checks must agree EXACTLY.
 *
 * Comparing instants instead would accept `endDate 2024-01-01T12:00Z` against
 * `startDate 2024-01-01T00:00Z`: both cast to the same DATE, the CHECK rejects
 * the write with a raw 23514, and the filter has no mapping for it — a 500 on
 * a validation error. Truncating to the UTC day here means the two layers can
 * never disagree, so the CHECK stays what it is meant to be: the line a second
 * write path cannot bypass, not a code path this one relies on.
 */
const utcDay = (d: Date): number =>
  Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate());

/**
 * Career: certifications and club affiliation history (FR-PROF-4, FR-PROF-5).
 *
 * Role-agnostic throughout — all six professional roles hold credentials and
 * club history, so there is no role switch anywhere in this module.
 *
 * Every mutation scopes by `userId: sub` from the verified token. A row
 * belonging to someone else is not a 403 but a 404 (§8/§12): the caller must
 * not learn it exists.
 */
@Injectable()
export class CareerService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly reference: ReferenceService,
    private readonly profiles: ProfilesService,
  ) {}

  // ===========================================================================
  // Certifications (FR-PROF-4)
  // ===========================================================================

  /**
   * `{ data, nextCursor: null }` — the `backend/CLAUDE.md` § API conventions
   * envelope without a live cursor, the same call `ReferenceService.listCountries`
   * makes for a bounded set. A person holds a handful of certifications, the
   * PRD defines no cursor parameter for this route, and GET /users/:id embeds
   * the whole list anyway, so a keyset here would contradict the embed while
   * adding a second cursor codec. The envelope keeps the door open if that changes.
   */
  async listMyCertifications(sub: string) {
    const items = await this.prisma.certification.findMany({
      where: { userId: sub },
      select: CERTIFICATION_SELECT,
      orderBy: CERTIFICATION_ORDER_BY,
    });
    return { data: items, nextCursor: null };
  }

  async createCertification(sub: string, dto: CreateCertificationDto) {
    this.assertCertificationDates(
      dto.issueDate ?? null,
      dto.expiryDate ?? null,
    );

    // `isVerified` is never written: the column default is false and only a
    // future admin surface may move it (FR-PROF-4).
    return this.prisma.certification.create({
      data: {
        userId: sub,
        name: dto.name,
        issuer: dto.issuer,
        issueDate: dto.issueDate,
        expiryDate: dto.expiryDate,
      },
      select: CERTIFICATION_SELECT,
    });
  }

  async updateCertification(
    sub: string,
    id: string,
    dto: UpdateCertificationDto,
  ) {
    // Ownership IS the where clause, not a comparison after the read — a row
    // owned by someone else and a row that never existed take the same path.
    const existing = await this.prisma.certification.findFirst({
      where: { id, userId: sub },
      select: { issueDate: true, expiryDate: true },
    });
    if (!existing) throw this.notFound();

    // The invariant holds on the MERGED row, not on the patch alone: sending
    // only `expiryDate` must still be checked against the stored `issueDate`.
    this.assertCertificationDates(
      dto.issueDate !== undefined ? dto.issueDate : existing.issueDate,
      dto.expiryDate !== undefined ? dto.expiryDate : existing.expiryDate,
    );

    return this.prisma.certification.update({
      where: { id },
      data: {
        // ?? undefined on the non-nullable column; the nullable ones pass
        // through so an explicit null clears them (the updateMe pattern).
        name: dto.name ?? undefined,
        issuer: dto.issuer,
        issueDate: dto.issueDate,
        expiryDate: dto.expiryDate,
      },
      select: CERTIFICATION_SELECT,
    });
  }

  async deleteCertification(sub: string, id: string): Promise<void> {
    const { count } = await this.prisma.certification.deleteMany({
      where: { id, userId: sub },
    });
    if (count === 0) throw this.notFound();
  }

  // ===========================================================================
  // Club affiliations (FR-PROF-5)
  // ===========================================================================

  /**
   * The one public read in this module (PRD 9.2 lists it by `:id`, unlike the
   * certification list). Certifications stay reachable publicly through the
   * GET /users/:id embed that FR-PROF-1 mandates.
   */
  async listAffiliations(userId: string) {
    // `users` belongs to the profiles module (§3), so visibility comes from
    // its exported seam — a suspended, deleted or unverified target 404s here
    // exactly as it does on GET /users/:id, with no rule duplicated.
    await this.profiles.assertUserVisible(userId);

    const rows = await this.prisma.clubAffiliation.findMany({
      where: { userId },
      select: AFFILIATION_SELECT,
      orderBy: AFFILIATION_ORDER_BY,
    });
    return { data: rows.map(mapAffiliation), nextCursor: null };
  }

  async createAffiliation(sub: string, dto: CreateAffiliationDto) {
    await this.reference.assertClubExists(dto.clubId);
    this.assertAffiliationDates(dto.startDate, dto.endDate ?? null);

    const row = await this.guardOpenAffiliation(() =>
      this.prisma.clubAffiliation.create({
        data: {
          userId: sub,
          clubId: dto.clubId,
          roleAtClub: dto.roleAtClub,
          startDate: dto.startDate,
          endDate: dto.endDate,
        },
        select: AFFILIATION_SELECT,
      }),
    );
    return mapAffiliation(row);
  }

  async updateAffiliation(sub: string, id: string, dto: UpdateAffiliationDto) {
    const existing = await this.prisma.clubAffiliation.findFirst({
      where: { id, userId: sub },
      select: { clubId: true, startDate: true, endDate: true },
    });
    if (!existing) throw this.notFound();

    // Only on an actual change: re-reading the club on every no-op PATCH buys
    // nothing (reference rows are never deleted, PRD EC-7).
    if (dto.clubId !== undefined && dto.clubId !== existing.clubId) {
      await this.reference.assertClubExists(dto.clubId);
    }

    this.assertAffiliationDates(
      dto.startDate ?? existing.startDate,
      dto.endDate !== undefined ? dto.endDate : existing.endDate,
    );

    const row = await this.guardOpenAffiliation(() =>
      this.prisma.clubAffiliation.update({
        where: { id },
        data: {
          clubId: dto.clubId ?? undefined,
          roleAtClub: dto.roleAtClub ?? undefined,
          startDate: dto.startDate ?? undefined,
          // Nullable: an explicit null RE-OPENS the stint, which is the only
          // way isCurrent ever flips back to true.
          endDate: dto.endDate,
        },
        select: AFFILIATION_SELECT,
      }),
    );
    return mapAffiliation(row);
  }

  async deleteAffiliation(sub: string, id: string): Promise<void> {
    const { count } = await this.prisma.clubAffiliation.deleteMany({
      where: { id, userId: sub },
    });
    if (count === 0) throw this.notFound();
  }

  // ===========================================================================
  // Internals
  // ===========================================================================

  /**
   * Translates `uq_affiliation_one_current_per_club` — the partial unique
   * index on (user_id, club_id) WHERE end_date IS NULL (§6).
   *
   * This is the ONLY affiliation overlap the module rejects, and it rejects it
   * by constraint rather than by a check-then-insert race (§5). Two open
   * affiliations at DIFFERENT clubs and freely overlapping date ranges stay
   * legal — dual roles genuinely exist (PRD 9.2 edge cases), so there is
   * deliberately no application-side rule here to find.
   */
  private async guardOpenAffiliation<T>(op: () => Promise<T>): Promise<T> {
    try {
      return await op();
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw new ConflictException({
          code: ErrorCode.AFFILIATION_ALREADY_OPEN,
          message:
            'You already have an open affiliation with this club. Set an end date on it first.',
        });
      }
      throw error;
    }
  }

  private assertCertificationDates(
    issueDate: Date | null,
    expiryDate: Date | null,
  ): void {
    if (issueDate && expiryDate && utcDay(expiryDate) <= utcDay(issueDate)) {
      throw new BadRequestException({
        code: ErrorCode.VALIDATION_ERROR,
        message: 'expiryDate must be later than issueDate.',
      });
    }
  }

  private assertAffiliationDates(startDate: Date, endDate: Date | null): void {
    // "Today" is the UTC day, matching the DATE column the value lands in.
    if (utcDay(startDate) > utcDay(new Date())) {
      throw new BadRequestException({
        code: ErrorCode.VALIDATION_ERROR,
        message: 'startDate must not be in the future.',
      });
    }
    if (endDate && utcDay(endDate) <= utcDay(startDate)) {
      throw new BadRequestException({
        code: ErrorCode.VALIDATION_ERROR,
        message: 'endDate must be later than startDate.',
      });
    }
  }

  /** Never a 403: existence is exactly what must not leak (§8). */
  private notFound(): NotFoundException {
    return new NotFoundException({
      code: ErrorCode.NOT_FOUND,
      message: 'Resource not found.',
    });
  }
}
