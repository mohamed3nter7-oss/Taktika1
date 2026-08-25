import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
} from '@nestjs/common';
import { ApiOperation, ApiParam, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../../common/types/authenticated-user';
import { UpdateMeDto } from './dto/update-me.dto';
import { UpdateRoleProfileDto } from './dto/update-role-profile.dto';
import { ProfilesService } from './profiles.service';

/**
 * User-facing profile endpoints (§16: these live in `profiles`; there is no
 * separate users module). Everything here requires authentication — public
 * logged-out profiles are [V1.1]. Identity for the /me routes comes from the
 * verified token only; there is no userId anywhere in path or body.
 */
@ApiTags('profiles')
@Controller('users')
export class ProfilesController {
  constructor(private readonly profilesService: ProfilesService) {}

  @Patch('me')
  @ApiOperation({
    summary: "Update the caller's common profile fields.",
    description:
      'role, email, dateOfBirth and avatarUrl are immutable here by design. ' +
      'countryId and cityId travel together and the city must belong to the country.',
  })
  updateMe(@CurrentUser() user: AuthenticatedUser, @Body() dto: UpdateMeDto) {
    return this.profilesService.updateMe(user.sub, dto);
  }

  @Patch('me/profile')
  @ApiOperation({
    summary: "Update the caller's role-specific profile fields.",
    description:
      "The body must contain exactly one role block, matching the caller's JWT role.",
  })
  updateRoleProfile(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: UpdateRoleProfileDto,
  ) {
    return this.profilesService.updateRoleProfile(user, dto);
  }

  @Get(':id')
  @ApiParam({ name: 'id', description: 'users.id (UUID)' })
  @ApiOperation({
    summary: "A user's public profile: common fields plus their role block.",
    description:
      'Returns a computed age, never the date of birth. Email, phone and ' +
      'account status are never present. Non-ACTIVE users are a 404.',
  })
  getPublicProfile(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.profilesService.getPublicProfile(id, user);
  }
}
