import { Module } from '@nestjs/common';
import { ReferenceModule } from '../reference/reference.module';
import { ProfileCompletionController } from './profile-completion.controller';
import { ProfilesController } from './profiles.controller';
import { ProfilesService } from './profiles.service';

/**
 * Profiles: the `users` row plus the six 1:1 role extension tables (§3 —
 * this module's tables; other modules go through the exported service).
 * The role → relation map lives in role-profile.map.ts.
 */
@Module({
  imports: [ReferenceModule],
  controllers: [ProfilesController, ProfileCompletionController],
  providers: [ProfilesService],
  exports: [ProfilesService],
})
export class ProfilesModule {}
