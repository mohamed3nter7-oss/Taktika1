import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsString, Length } from 'class-validator';

const trim = ({ value }: { value: unknown }): unknown =>
  typeof value === 'string' ? value.trim() : value;

/**
 * Deliberately NOT `PartialType(CreatePostDto)`.
 *
 * That would make `postAsClub` editable, so a post could change its club
 * attribution after publication — and attribution is stored on the row
 * precisely so it survives the admin later leaving the club (AC-06). Only the
 * content is editable; everything else about a post is fixed at creation.
 */
export class UpdatePostDto {
  @ApiProperty({ minLength: 1, maxLength: 3000 })
  @Transform(trim)
  @IsString()
  @Length(1, 3000)
  content!: string;
}
