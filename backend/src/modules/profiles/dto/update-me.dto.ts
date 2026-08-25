import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import {
  IsEnum,
  IsInt,
  IsOptional,
  IsPositive,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';
import { Gender } from '../../../generated/prisma/client';

/**
 * Editable common fields (FR-PROF-2). What is ABSENT is the contract:
 * - `role` / `email` — immutable in v1 (FR-PROF-2)
 * - `avatarUrl` — only the media pipeline may set it, after §10 verification
 * - `dateOfBirth` — anchors the role-aware age gate; not self-serve editable
 * - `status` / counters — system-owned
 * forbidNonWhitelisted turns any of these into a 400.
 *
 * headline/bio bounds follow PRD 9.2 (120/1000). Nullable columns
 * (headline, bio, gender) accept an explicit `null` to clear the value.
 */
export class UpdateMeDto {
  @ApiPropertyOptional({ minLength: 2, maxLength: 100 })
  @IsOptional()
  @IsString()
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  @MinLength(2)
  @MaxLength(100)
  fullName?: string;

  @ApiPropertyOptional({ maxLength: 120, nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  headline?: string | null;

  @ApiPropertyOptional({ maxLength: 1000, nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  bio?: string | null;

  @ApiPropertyOptional({ enum: Gender, nullable: true })
  @IsOptional()
  @IsEnum(Gender)
  gender?: Gender | null;

  @ApiPropertyOptional({
    description: 'countries.id — must be sent together with cityId.',
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @IsPositive()
  countryId?: number;

  @ApiPropertyOptional({
    description: 'cities.id — must belong to countryId.',
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @IsPositive()
  cityId?: number;
}
