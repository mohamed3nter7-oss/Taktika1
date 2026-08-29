import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsBoolean, IsOptional, IsString, Length } from 'class-validator';

/** Trims before validating, so whitespace cannot pad a body past the minimum. */
const trim = ({ value }: { value: unknown }): unknown =>
  typeof value === 'string' ? value.trim() : value;

export class CreatePostDto {
  /**
   * 1-3000 characters AFTER trimming, always required.
   *
   * `chk_post_content_not_blank` (`length(btrim(content)) > 0`) is the real
   * line and cannot be bypassed by a second write path. This DTO exists so the
   * caller gets a 400 VALIDATION_ERROR instead of a raw 23514 surfacing as a
   * 500 — the same reasoning as `assertNotSelf` in FollowsService.
   *
   * The `@Transform` is load-bearing, not cosmetic: without it `"   "` passes
   * `@Length(1, 3000)` at the DTO and is then rejected by the CHECK, which is
   * precisely the 500 this class exists to prevent.
   */
  @ApiProperty({ minLength: 1, maxLength: 3000 })
  @Transform(trim)
  @IsString()
  @Length(1, 3000)
  content!: string;

  /**
   * Publish AS the club (AC-06). The club is read from the caller's OWN
   * club_admin_profiles row and is NEVER accepted from the body.
   *
   * There is deliberately no `clubId` field on this DTO. With the global pipe's
   * `forbidNonWhitelisted`, a body carrying one is a 400 before the service
   * runs — the field is not ignored, it is refused, which is the stronger of
   * the two behaviours and needs no code here to achieve.
   *
   * `postType` is likewise absent: it defaults to STANDARD and the enum is
   * carried for later post types, not exposed now. `imageKeys` too — posts are
   * text-only in this commit.
   */
  @ApiPropertyOptional({
    description:
      'CLUB_ADMIN only. The club is taken from the caller’s own admin profile; ' +
      'a clubId in the body is a 400, never a source.',
  })
  @IsOptional()
  @IsBoolean()
  postAsClub?: boolean;
}
