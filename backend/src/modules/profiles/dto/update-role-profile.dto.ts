import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsObject, IsOptional, ValidateNested } from 'class-validator';
import { UpdateAnalystProfileDto } from './analyst-profile.dto';
import { UpdateClubAdminProfileDto } from './club-admin-profile.dto';
import { UpdateCoachProfileDto } from './coach-profile.dto';
import { UpdatePlayerProfileDto } from './player-profile.dto';
import { UpdateScoutProfileDto } from './scout-profile.dto';
import { UpdateTherapistProfileDto } from './therapist-profile.dto';

/**
 * PATCH /users/me/profile — same one-block-matching-your-role contract as
 * completion (see CompleteProfileDto), with per-role partial blocks.
 */
export class UpdateRoleProfileDto {
  @ApiPropertyOptional({ type: UpdatePlayerProfileDto })
  @IsOptional()
  @IsObject()
  @ValidateNested()
  @Type(() => UpdatePlayerProfileDto)
  player?: UpdatePlayerProfileDto | null;

  @ApiPropertyOptional({ type: UpdateCoachProfileDto })
  @IsOptional()
  @IsObject()
  @ValidateNested()
  @Type(() => UpdateCoachProfileDto)
  coach?: UpdateCoachProfileDto | null;

  @ApiPropertyOptional({ type: UpdateScoutProfileDto })
  @IsOptional()
  @IsObject()
  @ValidateNested()
  @Type(() => UpdateScoutProfileDto)
  scout?: UpdateScoutProfileDto | null;

  @ApiPropertyOptional({ type: UpdateAnalystProfileDto })
  @IsOptional()
  @IsObject()
  @ValidateNested()
  @Type(() => UpdateAnalystProfileDto)
  analyst?: UpdateAnalystProfileDto | null;

  @ApiPropertyOptional({ type: UpdateTherapistProfileDto })
  @IsOptional()
  @IsObject()
  @ValidateNested()
  @Type(() => UpdateTherapistProfileDto)
  therapist?: UpdateTherapistProfileDto | null;

  @ApiPropertyOptional({ type: UpdateClubAdminProfileDto })
  @IsOptional()
  @IsObject()
  @ValidateNested()
  @Type(() => UpdateClubAdminProfileDto)
  clubAdmin?: UpdateClubAdminProfileDto | null;
}
