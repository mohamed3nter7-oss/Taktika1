import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { UserRole } from '../../../generated/prisma/client';

/**
 * `?cursor=&limit=&role=` — `ListPostsQueryDto` plus the FR-FEED-2 role filter.
 *
 * Deliberately not `extends ListPostsQueryDto`: with `forbidNonWhitelisted`,
 * inheritance would silently let `role` onto every other list route the day
 * someone reuses the base class, and the two DTOs are four lines apart. The
 * cursor and limit rules are identical to it on purpose — default 20, max 50.
 */
export class ListFeedQueryDto {
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

  /**
   * FR-FEED-2. Filters on `posts.author_role`, the denormalised column (D-022),
   * which is what makes this an index predicate on `idx_posts_role_feed` rather
   * than a join filter sitting above the scan.
   *
   * `@IsEnum` gives a 400 VALIDATION_ERROR for an unknown role rather than
   * letting an unrecognised string reach the `::user_role` cast, where it would
   * surface as a 500 on what is really malformed input — the same reasoning as
   * the content `@Transform` in CreatePostDto.
   */
  @ApiPropertyOptional({ enum: UserRole })
  @IsOptional()
  @IsEnum(UserRole)
  role?: UserRole;
}
