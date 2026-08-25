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
} from '@nestjs/common';
import { ApiOperation, ApiParam, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../../common/types/authenticated-user';
import { CareerService } from './career.service';
import {
  CreateAffiliationDto,
  UpdateAffiliationDto,
} from './dto/affiliation.dto';
import {
  CreateCertificationDto,
  UpdateCertificationDto,
} from './dto/certification.dto';

/**
 * Career endpoints — exactly the eight routes PRD 9.2 lists, on the `users`
 * base path alongside ProfilesController (§16: no separate users module).
 *
 * The PRD's asymmetry is deliberate and preserved: affiliations have a public
 * `GET /users/:id/affiliations`, certifications do not. Certifications are
 * still publicly readable — FR-PROF-1 embeds them in GET /users/:id, which is
 * what the profile page renders. A second read path would draw no new privacy
 * line and has no consumer.
 *
 * Writes are `me`-scoped by URL and by token; the service never reads an owner
 * id from a body. Everything is role-agnostic — any of the six roles holds
 * certifications and club history.
 *
 * The `me/...` routes are declared before `:id/...` so a literal segment can
 * never be captured as a parameter.
 */
@ApiTags('career')
@Controller('users')
export class CareerController {
  constructor(private readonly careerService: CareerService) {}

  // ===========================================================================
  // Certifications (FR-PROF-4)
  // ===========================================================================

  @Get('me/certifications')
  @ApiOperation({
    summary: "The caller's own certifications, most recently issued first.",
    description:
      'Undated rows sort last. `isVerified` is read-only and always false in v1.',
  })
  listMyCertifications(@CurrentUser() user: AuthenticatedUser) {
    return this.careerService.listMyCertifications(user.sub);
  }

  @Post('me/certifications')
  @ApiOperation({
    summary: 'Add a certification to the calling account.',
    description:
      'expiryDate must be later than issueDate when both are present. ' +
      'isVerified is admin-only and rejected here.',
  })
  createCertification(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateCertificationDto,
  ) {
    return this.careerService.createCertification(user.sub, dto);
  }

  @Patch('me/certifications/:id')
  @ApiParam({ name: 'id', description: 'certifications.id (UUID)' })
  @ApiOperation({
    summary: "Edit one of the caller's own certifications.",
    description:
      'Omitted fields are unchanged; an explicit null clears a nullable one. ' +
      'The date rule is checked against the merged row. Someone else’s row is a 404.',
  })
  updateCertification(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateCertificationDto,
  ) {
    return this.careerService.updateCertification(user.sub, id, dto);
  }

  @Delete('me/certifications/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiParam({ name: 'id', description: 'certifications.id (UUID)' })
  @ApiOperation({ summary: "Delete one of the caller's own certifications." })
  deleteCertification(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.careerService.deleteCertification(user.sub, id);
  }

  // ===========================================================================
  // Club affiliations (FR-PROF-5)
  // ===========================================================================

  @Post('me/affiliations')
  @ApiOperation({
    summary: 'Add a club affiliation to the calling account.',
    description:
      'startDate must not be in the future and endDate must be later than it. ' +
      'Omitting endDate means "still there" — isCurrent is derived, never sent. ' +
      'Open affiliations at different clubs and overlapping ranges are both allowed; ' +
      'a second OPEN stint at the same club is a 409 AFFILIATION_ALREADY_OPEN.',
  })
  createAffiliation(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateAffiliationDto,
  ) {
    return this.careerService.createAffiliation(user.sub, dto);
  }

  @Patch('me/affiliations/:id')
  @ApiParam({ name: 'id', description: 'club_affiliations.id (UUID)' })
  @ApiOperation({
    summary: "Edit one of the caller's own affiliations.",
    description:
      'endDate: null re-opens a closed stint. A changed clubId is re-validated ' +
      'against the reference table. Someone else’s row is a 404.',
  })
  updateAffiliation(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateAffiliationDto,
  ) {
    return this.careerService.updateAffiliation(user.sub, id, dto);
  }

  @Delete('me/affiliations/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiParam({ name: 'id', description: 'club_affiliations.id (UUID)' })
  @ApiOperation({ summary: "Delete one of the caller's own affiliations." })
  deleteAffiliation(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.careerService.deleteAffiliation(user.sub, id);
  }

  @Get(':id/affiliations')
  @ApiParam({ name: 'id', description: 'users.id (UUID)' })
  @ApiOperation({
    summary: "A user's club affiliation history, current stints first.",
    description:
      'Each row carries the joined club and a derived isCurrent. Non-ACTIVE ' +
      'users are a 404, exactly as on GET /users/:id. Pass your own id to read ' +
      'your own history.',
  })
  listAffiliations(@Param('id', ParseUUIDPipe) id: string) {
    return this.careerService.listAffiliations(id);
  }
}
