import { Module } from '@nestjs/common';
import { ProfilesModule } from '../profiles/profiles.module';
import { ReferenceModule } from '../reference/reference.module';
import { CareerController } from './career.controller';
import { CareerService } from './career.service';

/**
 * Career: `certifications` and `club_affiliations` (§3 — this module's tables).
 *
 * Two inbound seams, both the AuthModule → ReferenceModule pattern: clubs are
 * validated through `ReferenceService.assertClubExists`, and target-user
 * visibility through `ProfilesService.assertUserVisible`. Neither table is
 * queried from here directly.
 *
 * The dependency runs career → profiles and MUST NOT be made mutual.
 * `ProfilesModule` embeds certifications and affiliations in GET /users/:id by
 * selecting them as relations of its own `users` root, using the shared
 * constants in career.map.ts — importing CareerModule there instead would
 * close the cycle.
 */
@Module({
  imports: [ReferenceModule, ProfilesModule],
  controllers: [CareerController],
  providers: [CareerService],
  exports: [CareerService],
})
export class CareerModule {}
