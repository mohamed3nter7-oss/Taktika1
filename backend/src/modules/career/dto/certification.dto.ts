import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import {
  IsDate,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';

/**
 * Certifications (FR-PROF-4), built to schema.prisma, which is authoritative
 * where the PRD text disagrees:
 *
 *  - PRD 9.2 says `title` / `issuing_organization`; the columns are `name` /
 *    `issuer`.
 *  - PRD 9.2 lists `credential_url`; there is NO such column, so there is no
 *    such field here. Adding one would need a migration, which this task is
 *    explicitly not doing.
 *
 * `isVerified` is admin-only and always false in v1, so it is absent by
 * design: `forbidNonWhitelisted` makes sending it a 400 (it is still readable
 * on responses — see CERTIFICATION_SELECT).
 *
 * `expiryDate > issueDate` is cross-field and, on PATCH, depends on the stored
 * row — enforced in the service against the merged state, not here.
 */
export class CreateCertificationDto {
  @ApiProperty({ minLength: 2, maxLength: 150, example: 'UEFA B Licence' })
  @IsString()
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  @MinLength(2)
  @MaxLength(150)
  name!: string;

  @ApiPropertyOptional({
    maxLength: 150,
    nullable: true,
    example: 'Egyptian Football Association',
  })
  @IsOptional()
  @IsString()
  @MaxLength(150)
  issuer?: string | null;

  @ApiPropertyOptional({
    type: String,
    format: 'date',
    nullable: true,
    example: '2021-07-01',
    description: 'Stored as a DATE — the time component is discarded.',
  })
  @IsOptional()
  @Type(() => Date)
  @IsDate()
  issueDate?: Date | null;

  @ApiPropertyOptional({
    type: String,
    format: 'date',
    nullable: true,
    example: '2026-07-01',
    description: 'Must be later than issueDate when both are present.',
  })
  @IsOptional()
  @Type(() => Date)
  @IsDate()
  expiryDate?: Date | null;
}

/**
 * Omitted key = unchanged; explicit `null` = clear (the nullable fields only).
 * `@Type(() => Date)` passes `null` through untouched, which is what makes the
 * two distinguishable in the service.
 */
export class UpdateCertificationDto extends PartialType(
  CreateCertificationDto,
) {}
