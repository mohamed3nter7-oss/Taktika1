import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import {
  IsInt,
  IsOptional,
  IsPositive,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

// Query params always arrive as strings and the global pipe runs with
// enableImplicitConversion: false, so every numeric field needs an explicit
// @Type(() => Number) — same convention as register.dto.ts.

export class ListCitiesQueryDto {
  @ApiProperty({
    description: 'countries.id — cities are always listed per country',
  })
  @Type(() => Number)
  @IsInt()
  @IsPositive()
  countryId!: number;
}

export class ListLeaguesQueryDto {
  @ApiPropertyOptional({ description: 'countries.id' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @IsPositive()
  countryId?: number;
}

export class ListClubsQueryDto {
  @ApiPropertyOptional({ description: 'countries.id' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @IsPositive()
  countryId?: number;

  @ApiPropertyOptional({ description: 'leagues.id' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @IsPositive()
  leagueId?: number;

  @ApiPropertyOptional({
    description:
      'Case-insensitive substring match on English/Arabic names and short names.',
    maxLength: 100,
  })
  @IsOptional()
  @IsString()
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  @MaxLength(100)
  q?: string;

  @ApiPropertyOptional({
    description: 'Opaque keyset cursor from a previous page.',
  })
  @IsOptional()
  @IsString()
  @MaxLength(512)
  cursor?: string;

  @ApiPropertyOptional({ minimum: 1, maximum: 50, default: 20 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(50)
  limit?: number;
}
