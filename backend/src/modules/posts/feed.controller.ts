import { Controller, Get, Query } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../../common/types/authenticated-user';
import { ListFeedQueryDto } from './dto/list-feed.dto';
import { PostsService } from './posts.service';

/**
 * The feed (FR-FEED-1, FR-FEED-2) — a THIRD controller inside `modules/posts`,
 * not a module of its own.
 *
 * The feed is a listing of posts: same table, same index family, same cursor
 * codec, same hydration and same viewer-state subset as GET /users/:id/posts.
 * It differs only in having no author anchor and an optional role anchor. A
 * separate module could only query this module's tables directly (§4 forbids
 * it) or call an exported window plus an exported hydration and add nothing —
 * a file per operation for no behaviour, which is the argument §4 makes against
 * repositories. Several base paths from several controller files in one module
 * is the `profiles` precedent.
 *
 * It earns a module when it acquires logic that is not a posts query: ranking
 * (FR-FEED-5), or the following-only tab (FR-FEED-4) joining the follow graph.
 * Naming a module after a route is how a codebase acquires directories that
 * forward calls. Logged as a divergence from §7's build order.
 *
 * Authenticated like every other read — the viewer is needed for `isLiked`,
 * `isSaved` and `author.isFollowing`.
 */
@ApiTags('feed')
@Controller('feed')
export class FeedController {
  constructor(private readonly postsService: PostsService) {}

  @Get()
  // STARTING VALUES, to be tuned against real usage. 60/min is roughly 1,200
  // posts a minute of scrolling — far beyond a person, well short of a
  // scraper. Note this sits BELOW the global 100/min default: the feed is the
  // highest-traffic route in the product, so this is the limit most likely to
  // need loosening, and the first place to look if legitimate scrolling starts
  // returning 429.
  @Throttle({
    default: { limit: 60, ttl: 60 * 1000 },
    sustained: { limit: 600, ttl: 60 * 60 * 1000 },
  })
  @ApiOperation({
    summary: 'The chronological feed, newest first.',
    description:
      'Every live post from every ACTIVE author, `{ data, nextCursor }`. ' +
      'Optional `?role=` filters on the author’s role and must be a valid ' +
      'UserRole — anything else is a 400. Soft-deleted posts and posts by ' +
      'non-ACTIVE authors are excluded IN THE WINDOW, so a page is full ' +
      'whenever more posts exist. End of list is `nextCursor: null` and ' +
      'nothing else.',
  })
  list(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: ListFeedQueryDto,
  ) {
    return this.postsService.listFeed(user.sub, query);
  }
}
