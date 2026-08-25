import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsInt,
  IsOptional,
  IsPositive,
  IsString,
  MaxLength,
} from 'class-validator';

export class CreateClubAdminProfileDto {
  @ApiProperty({
    description:
      'clubs.id — the club this account administers. One admin per club in v1.',
  })
  @Type(() => Number)
  @IsInt()
  @IsPositive()
  clubId!: number;

  @ApiPropertyOptional({ maxLength: 150, example: 'Sporting Director' })
  @IsOptional()
  @IsString()
  @MaxLength(150)
  positionTitle?: string | null;
}

/**
 * Deliberately NOT PartialType(Create...): `clubId` must not be reachable
 * from a self-serve update. Leaving or changing club is admin-mediated
 * (PRD 9.3 edge cases), so the only editable field is the title.
 */
export class UpdateClubAdminProfileDto {
  @ApiPropertyOptional({ maxLength: 150, example: 'Sporting Director' })
  @IsOptional()
  @IsString()
  @MaxLength(150)
  positionTitle?: string | null;
}
