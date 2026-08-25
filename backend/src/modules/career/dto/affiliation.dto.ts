import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsDate, IsEnum, IsInt, IsOptional, IsPositive } from 'class-validator';
import { ClubRole } from '../../../generated/prisma/client';

/**
 * Club affiliation history (FR-PROF-5).
 *
 * What is ABSENT is the contract:
 *  - `isCurrent` — derived from `endDate IS NULL` (PRD 7.3: current club is a
 *    query, not a column). There is no column to set and no field to send;
 *    `forbidNonWhitelisted` turns an attempt into a 400.
 *  - a club NAME — never accepted in any form. Clubs are entities; free text
 *    reintroduces the exact string-duplication anomaly the schema eliminated
 *    (PRD 9.2 edge cases). A missing club goes to the admin request queue.
 *
 * `startDate ≤ today` and `endDate > startDate` are checked in the service:
 * the second is cross-field, and on PATCH both depend on the stored row.
 */
export class CreateAffiliationDto {
  @ApiProperty({
    description:
      'clubs.id — must reference an existing club in the reference table.',
  })
  @Type(() => Number)
  @IsInt()
  @IsPositive()
  clubId!: number;

  @ApiProperty({
    enum: ClubRole,
    description:
      'The role held AT the club, independent of the account role: a PLAYER account may hold a COACH affiliation.',
  })
  @IsEnum(ClubRole)
  roleAtClub!: ClubRole;

  @ApiProperty({
    type: String,
    format: 'date',
    example: '2023-08-01',
    description: 'Must not be in the future.',
  })
  @Type(() => Date)
  @IsDate()
  startDate!: Date;

  @ApiPropertyOptional({
    type: String,
    format: 'date',
    nullable: true,
    example: '2025-06-30',
    description:
      'null or omitted = still at the club; this is the sole source of the derived isCurrent.',
  })
  @IsOptional()
  @Type(() => Date)
  @IsDate()
  endDate?: Date | null;
}

/**
 * Unlike the club-admin profile — where `clubId` is identity-critical and
 * deliberately unreachable — an affiliation row is plain career history, and
 * FR-PROF-5 says edit with no field carved out. A changed `clubId` is
 * re-validated against the reference table like any new one.
 */
export class UpdateAffiliationDto extends PartialType(CreateAffiliationDto) {}
