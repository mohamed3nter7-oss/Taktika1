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
import { CoachType } from '../../../generated/prisma/client';

export class CreateCoachProfileDto {
  @ApiProperty({ enum: CoachType })
  @IsEnum(CoachType)
  coachType!: CoachType;

  @ApiPropertyOptional({ minimum: 0, maximum: 60 })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(60)
  yearsExperience?: number | null;

  @ApiPropertyOptional({ maxLength: 20, example: '4-2-3-1' })
  @IsOptional()
  @IsString()
  @MaxLength(20)
  preferredFormation?: string | null;

  @ApiPropertyOptional({ maxLength: 500 })
  @IsOptional()
  @IsUrl({ protocols: ['http', 'https'], require_protocol: true })
  @MaxLength(500)
  portfolioLink?: string | null;
}

export class UpdateCoachProfileDto extends PartialType(CreateCoachProfileDto) {}
