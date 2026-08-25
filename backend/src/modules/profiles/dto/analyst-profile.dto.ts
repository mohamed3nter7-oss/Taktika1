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
import { AnalystType } from '../../../generated/prisma/client';

export class CreateAnalystProfileDto {
  @ApiProperty({ enum: AnalystType })
  @IsEnum(AnalystType)
  analystType!: AnalystType;

  @ApiPropertyOptional({ maxLength: 300, example: 'Wyscout, Python, Tableau' })
  @IsOptional()
  @IsString()
  @MaxLength(300)
  toolsUsed?: string | null;

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

export class UpdateAnalystProfileDto extends PartialType(
  CreateAnalystProfileDto,
) {}
