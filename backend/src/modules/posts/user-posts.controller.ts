import { Controller, Get, Param, ParseUUIDPipe, Query } from '@nestjs/common';
import { ApiOperation, ApiParam, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../../common/types/authenticated-user';
import { ListPostsQueryDto } from './dto/list-posts.dto';
import { PostsService } from './posts.service';

/**
 * An author's posts, on the `users` base path alongside ProfilesController,
 * CareerController and FollowsController (§16: no separate users module).
 *
 * A SECOND controller file for this module, because a module needing two base
 * paths gets one file per path — the precedent is `profiles`
 * (ProfilesController on `users`, ProfileCompletionController on
 * `auth/register`), NOT `follows`, which has no `/follows` routes at all and so
 * serves everything it owns from a single `@Controller('users')`.
 *
 * The route DECLARATION copies FollowsController's `:id/followers` exactly:
 * same `@CurrentUser` + `ParseUUIDPipe` + `@Query(dto)` signature, same
 * ApiParam/ApiOperation shape, same `{ data, nextCursor }` envelope. Two
 * conventions for one URL shape is what this is avoiding.
 */
@ApiTags('posts')
@Controller('users')
export class UserPostsController {
  constructor(private readonly postsService: PostsService) {}

  @Get(':id/posts')
  @ApiParam({ name: 'id', description: 'users.id (UUID) — the author' })
  @ApiOperation({
    summary: 'A user’s posts, most recent first.',
    description:
      'Keyset paginated: `{ data, nextCursor }`. Soft-deleted posts are ' +
      'omitted. An unknown or non-ACTIVE author is a 404, exactly as on ' +
      'GET /users/:id. End of list is `nextCursor: null` and nothing else — ' +
      'never infer it from the number of rows returned.',
  })
  listByAuthor(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Query() query: ListPostsQueryDto,
  ) {
    return this.postsService.listByAuthor(id, user.sub, query);
  }
}
