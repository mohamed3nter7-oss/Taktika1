import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsObject, IsOptional, ValidateNested } from 'class-validator';
import { CreateAnalystProfileDto } from './analyst-profile.dto';
import { CreateClubAdminProfileDto } from './club-admin-profile.dto';
import { CreateCoachProfileDto } from './coach-profile.dto';
import { CreatePlayerProfileDto } from './player-profile.dto';
import { CreateScoutProfileDto } from './scout-profile.dto';
import { CreateTherapistProfileDto } from './therapist-profile.dto';

/**
 * Registration step 2 (FR-AUTH-2): exactly ONE block, and it must match the
 * caller's JWT role — the service rejects everything else with ROLE_MISMATCH.
 *
 * Every decorator on these blocks is load-bearing under the global pipe:
 * `@Type` turns the block into a class instance (without it, whitelisting
 * strips every nested key and the service would see an empty block),
 * `@ValidateNested` recurses validation into it, and `@IsObject` rejects
 * primitive payloads like `"player": 5` deterministically.
 */
export class CompleteProfileDto {
  @ApiPropertyOptional({ type: CreatePlayerProfileDto })
  @IsOptional()
  @IsObject()
  @ValidateNested()
  @Type(() => CreatePlayerProfileDto)
  player?: CreatePlayerProfileDto | null;

  @ApiPropertyOptional({ type: CreateCoachProfileDto })
  @IsOptional()
  @IsObject()
  @ValidateNested()
  @Type(() => CreateCoachProfileDto)
  coach?: CreateCoachProfileDto | null;

  @ApiPropertyOptional({ type: CreateScoutProfileDto })
  @IsOptional()
  @IsObject()
  @ValidateNested()
  @Type(() => CreateScoutProfileDto)
  scout?: CreateScoutProfileDto | null;

  @ApiPropertyOptional({ type: CreateAnalystProfileDto })
  @IsOptional()
  @IsObject()
  @ValidateNested()
  @Type(() => CreateAnalystProfileDto)
  analyst?: CreateAnalystProfileDto | null;

  @ApiPropertyOptional({ type: CreateTherapistProfileDto })
  @IsOptional()
  @IsObject()
  @ValidateNested()
  @Type(() => CreateTherapistProfileDto)
  therapist?: CreateTherapistProfileDto | null;

  @ApiPropertyOptional({ type: CreateClubAdminProfileDto })
  @IsOptional()
  @IsObject()
  @ValidateNested()
  @Type(() => CreateClubAdminProfileDto)
  clubAdmin?: CreateClubAdminProfileDto | null;
}
