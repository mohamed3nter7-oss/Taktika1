import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Put,
} from '@nestjs/common';
import { ApiOperation, ApiParam, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../../common/types/authenticated-user';
import { CreatePostDto } from './dto/create-post.dto';
import { UpdatePostDto } from './dto/update-post.dto';
import { PostsService } from './posts.service';

/**
 * Posts on the `/posts` base path. The author-scoped listing lives in
 * `user-posts.controller.ts` because it hangs off `/users` — two base paths
 * need two controller files, matching `profiles` (ProfilesController on
 * `users`, ProfileCompletionController on `auth/register`).
 *
 * No `@UseGuards` anywhere here. `JwtAuthGuard` and `ProfileCompleteGuard` are
 * global (app.module.ts), so every route is authenticated and gated on a
 * completed profile by default; adding `@Public()` is what would opt out.
 *
 * PUT / DELETE for likes and saves, not POST: `backend/CLAUDE.md` § API
 * conventions specifies the pair precisely because both verbs are idempotent,
 * so a double-tap is a no-op rather than an error. `follows` set the precedent.
 */
@ApiTags('posts')
@Controller('posts')
export class PostsController {
  constructor(private readonly postsService: PostsService) {}

  // Starting values, to be tuned against real usage. Posting is expensive
  // downstream — every post fans out to a feed and to notifications — so both
  // windows are capped: the burst window stops a runaway client, the sustained
  // one stops a patient script.
  @Post()
  @Throttle({
    default: { limit: 5, ttl: 60 * 1000 },
    sustained: { limit: 40, ttl: 60 * 60 * 1000 },
  })
  @ApiOperation({
    summary: 'Publish a post.',
    description:
      'Text-only in this version: `images` is always an empty array. ' +
      '`postAsClub: true` requires the caller to hold a club admin profile — ' +
      'the club is taken from THAT row, never from the body, and a `clubId` in ' +
      'the body is a 400 from the global pipe.',
  })
  create(@CurrentUser() user: AuthenticatedUser, @Body() dto: CreatePostDto) {
    return this.postsService.create(user, dto);
  }

  @Get(':id')
  @ApiParam({ name: 'id', description: 'posts.id (UUID)' })
  @ApiOperation({
    summary: 'Read one post.',
    description:
      'A soft-deleted post, and a post whose author is not ACTIVE, are both ' +
      '404 — never a 403, which would confirm the post exists.',
  })
  findOne(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.postsService.findOne(user.sub, id);
  }

  @Patch(':id')
  @ApiParam({ name: 'id', description: 'posts.id (UUID)' })
  @ApiOperation({
    summary: 'Edit your own post. Sets editedAt.',
    description:
      'No time window — a post is editable at any age. Someone else’s post is ' +
      'a 404, not a 403, and so is your own once it has been deleted.',
  })
  update(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdatePostDto,
  ) {
    return this.postsService.update(user.sub, id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiParam({ name: 'id', description: 'posts.id (UUID)' })
  @ApiOperation({
    summary: 'Soft-delete your own post. Idempotent.',
    description:
      'Deleting a post you have already deleted is a 204, not a 404: the ' +
      'caller asserts a state, and a 404 would force every client to handle a ' +
      'double-tap race it cannot prevent. A post that is not yours, or that ' +
      'never existed, is still a 404.',
  })
  remove(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.postsService.remove(user.sub, id);
  }

  // Likes and saves are high-frequency legitimate actions — scrolling a feed
  // and tapping is normal use, so this ceiling is far above a person and far
  // below a script. Starting value, to be tuned.
  @Put(':id/like')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiParam({ name: 'id', description: 'posts.id (UUID)' })
  @Throttle({ default: { limit: 60, ttl: 60 * 1000 } })
  @ApiOperation({
    summary: 'Like a post. Idempotent.',
    description:
      'Liking twice is a 204 and leaves likes_count at 1 — the second insert ' +
      'hits ON CONFLICT DO NOTHING, so the counter trigger never fires. ' +
      'Liking your own post is permitted.',
  })
  like(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.postsService.like(user.sub, id);
  }

  @Delete(':id/like')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiParam({ name: 'id', description: 'posts.id (UUID)' })
  @Throttle({ default: { limit: 60, ttl: 60 * 1000 } })
  @ApiOperation({
    summary: 'Remove your like. Idempotent.',
    description:
      'Unliking a post you never liked is a 204 and leaves the count alone. ' +
      'Unlike `DELETE /users/:id/follow`, this DOES 404 on a deleted post: ' +
      'here the post’s existence is what is being asserted.',
  })
  unlike(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.postsService.unlike(user.sub, id);
  }

  @Put(':id/save')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiParam({ name: 'id', description: 'posts.id (UUID)' })
  @Throttle({ default: { limit: 60, ttl: 60 * 1000 } })
  @ApiOperation({ summary: 'Save a post to your bookmarks. Idempotent.' })
  save(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.postsService.save(user.sub, id);
  }

  @Delete(':id/save')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiParam({ name: 'id', description: 'posts.id (UUID)' })
  @Throttle({ default: { limit: 60, ttl: 60 * 1000 } })
  @ApiOperation({ summary: 'Remove a post from your bookmarks. Idempotent.' })
  unsave(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.postsService.unsave(user.sub, id);
  }
}
