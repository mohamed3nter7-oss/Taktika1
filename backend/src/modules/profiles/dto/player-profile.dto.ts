import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import {
  IsEnum,
  IsInt,
  IsOptional,
  IsUrl,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import {
  LeagueLevel,
  PlayerPosition,
  PreferredFoot,
} from '../../../generated/prisma/client';

// Bounds per PRD 9.2 validation table. secondaryPosition ≠ primaryPosition is
// cross-field and, on PATCH, depends on the stored row — enforced in the
// service against the merged state, not here.
export class CreatePlayerProfileDto {
  @ApiProperty({ enum: PlayerPosition })
  @IsEnum(PlayerPosition)
  primaryPosition!: PlayerPosition;

  @ApiPropertyOptional({
    enum: PlayerPosition,
    description: 'Must differ from primaryPosition.',
  })
  @IsOptional()
  @IsEnum(PlayerPosition)
  secondaryPosition?: PlayerPosition | null;

  @ApiProperty({ enum: PreferredFoot })
  @IsEnum(PreferredFoot)
  preferredFoot!: PreferredFoot;

  @ApiProperty({ enum: LeagueLevel })
  @IsEnum(LeagueLevel)
  leagueLevel!: LeagueLevel;

  @ApiPropertyOptional({ minimum: 120, maximum: 230 })
  @IsOptional()
  @IsInt()
  @Min(120)
  @Max(230)
  heightCm?: number | null;

  @ApiPropertyOptional({ minimum: 30, maximum: 150 })
  @IsOptional()
  @IsInt()
  @Min(30)
  @Max(150)
  weightKg?: number | null;

  @ApiPropertyOptional({ minimum: 1, maximum: 99 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(99)
  jerseyNumber?: number | null;

  @ApiPropertyOptional({ maxLength: 500, example: 'https://example.com/reel' })
  @IsOptional()
  @IsUrl({ protocols: ['http', 'https'], require_protocol: true })
  @MaxLength(500)
  portfolioLink?: string | null;
}

export class UpdatePlayerProfileDto extends PartialType(
  CreatePlayerProfileDto,
) {}
