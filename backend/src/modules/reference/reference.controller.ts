import { Controller, Get, Header, Query } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Public } from '../../common/decorators/public.decorator';
import {
  ListCitiesQueryDto,
  ListClubsQueryDto,
  ListLeaguesQueryDto,
} from './dto/reference-queries.dto';
import { ReferenceService } from './reference.service';

/**
 * Read-only lookups for the registration and profile forms.
 *
 * Class-level `@Public()`: nothing here is auth-dependent, which is exactly
 * what makes the responses cacheable — no `Vary: Authorization`, one shared
 * copy per URL. Cache lifetimes are short; reference data changes rarely but
 * an admin fix should not take a day to appear.
 */
@ApiTags('reference')
@Public()
@Controller('reference')
export class ReferenceController {
  constructor(private readonly referenceService: ReferenceService) {}

  @Get('countries')
  @Header('Cache-Control', 'public, max-age=3600')
  @ApiOperation({ summary: 'All countries, ordered by English name.' })
  listCountries() {
    return this.referenceService.listCountries();
  }

  @Get('cities')
  @Header('Cache-Control', 'public, max-age=3600')
  @ApiOperation({ summary: 'Cities of one country, ordered by English name.' })
  listCities(@Query() query: ListCitiesQueryDto) {
    return this.referenceService.listCities(query.countryId);
  }

  @Get('leagues')
  @Header('Cache-Control', 'public, max-age=3600')
  @ApiOperation({
    summary: 'Leagues, optionally per country, top flight first.',
  })
  listLeagues(@Query() query: ListLeaguesQueryDto) {
    return this.referenceService.listLeagues(query.countryId);
  }

  @Get('clubs')
  @Header('Cache-Control', 'public, max-age=300')
  @ApiOperation({
    summary:
      'Clubs, searchable by English or Arabic name, keyset-paginated by (name, id).',
  })
  listClubs(@Query() query: ListClubsQueryDto) {
    return this.referenceService.listClubs(query);
  }

  @Get('positions')
  @Header('Cache-Control', 'public, max-age=86400')
  @ApiOperation({
    summary:
      'Enum option sets for the role-specific profile forms (positions, foot, league level, coach/scout/analyst types).',
  })
  listPositions() {
    return this.referenceService.listRoleEnumOptions();
  }
}
