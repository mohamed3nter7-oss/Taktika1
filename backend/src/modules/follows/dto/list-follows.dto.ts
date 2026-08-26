import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator';

/**
 * `?cursor=&limit=` — the § API conventions pagination request, mirroring
 * `ListClubsQueryDto`. Query params arrive as strings and the global pipe runs
 * with `enableImplicitConversion: false`, so `limit` needs an explicit
 * `@Type(() => Number)`.
 */
export class ListFollowsQueryDto {
  @ApiPropertyOptional({
    description:
      'Opaque keyset cursor from a previous page. Treat as a token: the ' +
      'ordering columns it encodes are not part of the contract.',
    maxLength: 512,
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
