import { Body, Controller, Post } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { AllowIncompleteProfile } from '../../common/decorators/allow-incomplete-profile.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../../common/types/authenticated-user';
import { CompleteProfileDto } from './dto/complete-profile.dto';
import { ProfilesService } from './profiles.service';

/**
 * Registration step 2 lives at the PRD's path (`POST /auth/register/profile`,
 * 9.1) but belongs to the profiles module — it writes the role extension
 * tables, which are this module's, not auth's.
 */
@ApiTags('profiles')
@Controller('auth/register')
export class ProfileCompletionController {
  constructor(private readonly profilesService: ProfilesService) {}

  /**
   * `@AllowIncompleteProfile()` is the entire point: this is the one
   * non-auth endpoint a PENDING_PROFILE user may reach, and calling it is how
   * they stop being PENDING_PROFILE.
   */
  @Post('profile')
  @AllowIncompleteProfile()
  @ApiOperation({
    summary:
      "Registration step 2: create the caller's role profile row and activate the account.",
    description:
      'The body must contain exactly one role block, matching the JWT role. ' +
      'On success the account becomes ACTIVE; the client should then call ' +
      'POST /auth/refresh to obtain an access token carrying the new status.',
  })
  completeProfile(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CompleteProfileDto,
  ) {
    return this.profilesService.completeProfile(user, dto);
  }
}
