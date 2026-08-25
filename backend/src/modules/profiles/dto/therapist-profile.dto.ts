import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import {
  IsInt,
  IsOptional,
  IsString,
  IsUrl,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';

export class CreateTherapistProfileDto {
  @ApiProperty({ maxLength: 150, example: 'Sports injury rehabilitation' })
  @IsString()
  @MinLength(2)
  @MaxLength(150)
  specialization!: string;

  @ApiPropertyOptional({ minimum: 0, maximum: 60 })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(60)
  yearsExperience?: number | null;

  @ApiPropertyOptional({ maxLength: 150 })
  @IsOptional()
  @IsString()
  @MaxLength(150)
  clinicName?: string | null;

  @ApiPropertyOptional({ maxLength: 500 })
  @IsOptional()
  @IsUrl({ protocols: ['http', 'https'], require_protocol: true })
  @MaxLength(500)
  portfolioLink?: string | null;
}

export class UpdateTherapistProfileDto extends PartialType(
  CreateTherapistProfileDto,
) {}
