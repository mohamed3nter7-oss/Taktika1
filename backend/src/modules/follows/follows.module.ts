import { Module } from '@nestjs/common';
import { ProfilesModule } from '../profiles/profiles.module';
import { FollowsController } from './follows.controller';
import { FollowsService } from './follows.service';

/**
 * Follows: the `follows` table (§4 — this module's table). Named for the edge
 * it owns, not for the category it belongs to: `social` is a bucket, and a
 * bucket-named module collects likes, blocks and mentions by default. This one
 * has a boundary that fits in a sentence.
 *
 * One inbound seam, the CareerModule → ProfilesModule pattern: target-user
 * visibility through `ProfilesService.assertUserVisible`. `users` is never
 * queried from here for authorisation.
 *
 * The dependency runs follows → profiles and MUST NOT be made mutual.
 * `ProfilesModule` puts `viewer.isFollowing` on GET /users/:id by selecting
 * `followers` as a relation of its own `users` root, using `viewerFollowSelect`
 * from follows.map.ts — importing FollowsModule there instead would close the
 * cycle. This is the same resolution career.map.ts uses, for the same reason.
 */
@Module({
  imports: [ProfilesModule],
  controllers: [FollowsController],
  providers: [FollowsService],
  exports: [FollowsService],
})
export class FollowsModule {}
