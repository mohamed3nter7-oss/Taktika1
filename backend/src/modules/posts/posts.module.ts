import { Module } from '@nestjs/common';
import { ProfilesModule } from '../profiles/profiles.module';
import { PostsController } from './posts.controller';
import { PostsService } from './posts.service';
import { UserPostsController } from './user-posts.controller';

/**
 * Posts: `posts`, `post_images`, `post_likes` and `saved_posts` (§4 — this
 * module's tables). Likes and saves are not separate modules; neither table has
 * an id, a standalone route, or a lifecycle apart from its post.
 *
 * TWO controllers because the module serves two base paths — `/posts` and
 * `/users/:id/posts`. That is the `profiles` shape, not a new convention.
 *
 * One inbound seam, the CareerModule -> ProfilesModule pattern: author
 * visibility through `ProfilesService.assertUserVisible`, and the club admin's
 * own club through `ProfilesService.clubIdForAdmin`. Neither `users` nor
 * `club_admin_profiles` is ever queried from here.
 *
 * ReferenceModule is deliberately NOT imported. `CLUB_SUMMARY_SELECT` is a
 * compile-time constant, not a provider — importing the module to use a
 * constant would create a dependency the DI graph does not need. Same reason
 * `follows` does not import `profiles` to use `PROFILE_SUMMARY_SELECT`.
 *
 * The dependency runs posts -> profiles and MUST NOT be made mutual.
 */
@Module({
  imports: [ProfilesModule],
  controllers: [PostsController, UserPostsController],
  providers: [PostsService],
  exports: [PostsService],
})
export class PostsModule {}
