import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import {
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  IsUrl,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { ScoutType } from '../../../generated/prisma/client';

// `playersRecommended` is deliberately absent: it is a system counter
// (@default(0)), not self-reported data. forbidNonWhitelisted turns any
// attempt to submit it into a 400.
export class CreateScoutProfileDto {
  @ApiProperty({ enum: ScoutType })
  @IsEnum(ScoutType)
  scoutType!: ScoutType;

  @ApiPropertyOptional({ maxLength: 300, example: 'Cairo, Delta region' })
  @IsOptional()
  @IsString()
  @MaxLength(300)
  regionsCovered?: string | null;

  @ApiPropertyOptional({ minimum: 0, maximum: 60 })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(60)
  yearsExperience?: number | null;

  @ApiPropertyOptional({ maxLength: 500 })
  @IsOptional()
  @IsUrl({ protocols: ['http', 'https'], require_protocol: true })
  @MaxLength(500)
  portfolioLink?: string | null;
}

export class UpdateScoutProfileDto extends PartialType(CreateScoutProfileDto) {}
