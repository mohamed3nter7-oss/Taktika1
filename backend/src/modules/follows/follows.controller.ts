import {
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Put,
  Query,
} from '@nestjs/common';
import { ApiOperation, ApiParam, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../../common/types/authenticated-user';
import { ListFollowsQueryDto } from './dto/list-follows.dto';
import { FollowsService } from './follows.service';

/**
 * The social graph, on the `users` base path alongside ProfilesController and
 * CareerController (§16: no separate users module).
 *
 * PUT / DELETE, not POST: `backend/CLAUDE.md` § API conventions specifies the
 * pair for likes and follows precisely because both verbs are idempotent, so a
 * double-tap is a no-op rather than an error. This is the first toggle-write in
 * the codebase and the precedent for likes and bookmarks.
 *
 * No `@UseGuards` anywhere here. `JwtAuthGuard` and `ProfileCompleteGuard` are
 * global (app.module.ts), so all four routes are authenticated and gated on a
 * completed profile by default; adding `@Public()` is what would opt out.
 */
@ApiTags('follows')
@Controller('users')
export class FollowsController {
  constructor(private readonly followsService: FollowsService) {}

  @Put(':id/follow')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiParam({ name: 'id', description: 'users.id (UUID) — the user to follow' })
  // Follow-spam is the obvious abuse vector on an ungated graph: the write is
  // cheap, needs no relationship, and generates a notification at the far end.
  // 30/min is far above human use and far below a script's.
  @Throttle({ default: { limit: 30, ttl: 60 * 1000 } })
  @ApiOperation({
    summary: 'Follow a user. Idempotent.',
    description:
      'Following someone already followed is a 204, not a 409 — a follow is a ' +
      'state assertion, not an event. Self-follow is a 400. A non-ACTIVE or ' +
      'unknown target is a 404, exactly as on GET /users/:id.',
  })
  follow(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.followsService.follow(user.sub, id);
  }

  @Delete(':id/follow')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiParam({
    name: 'id',
    description: 'users.id (UUID) — the user to unfollow',
  })
  @ApiOperation({
    summary: 'Unfollow a user. Idempotent, and never 404s.',
    description:
      'Always 204: for a follow that was never there, for a suspended or ' +
      'deleted target, and for an id belonging to nobody. Unlike follow, this ' +
      'does not check target visibility — a suspended user must still be ' +
      'unfollowable, or the edge is stranded and the caller’s following ' +
      'count is permanently wrong.',
  })
  unfollow(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.followsService.unfollow(user.sub, id);
  }

  @Get(':id/followers')
  @ApiParam({ name: 'id', description: 'users.id (UUID)' })
  @ApiOperation({
    summary: 'Who follows this user, most recent first.',
    description:
      'Keyset paginated: `{ data, nextCursor }`. Each row is a profile summary ' +
      'plus `isFollowing`, the CALLER’S follow-back state for that row. ' +
      'Suspended and deleted users are omitted, so a page may be shorter than ' +
      '`limit` — end of list is `nextCursor: null` and nothing else.',
  })
  listFollowers(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Query() query: ListFollowsQueryDto,
  ) {
    return this.followsService.listFollowers(id, user.sub, query);
  }

  @Get(':id/following')
  @ApiParam({ name: 'id', description: 'users.id (UUID)' })
  @ApiOperation({
    summary: 'Who this user follows, most recent first.',
    description:
      'Same envelope, same `isFollowing` semantics and the same short-page rule ' +
      'as /followers.',
  })
  listFollowing(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Query() query: ListFollowsQueryDto,
  ) {
    return this.followsService.listFollowing(id, user.sub, query);
  }
}
