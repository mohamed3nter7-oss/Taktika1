import { Module } from '@nestjs/common';
import { ReferenceController } from './reference.controller';
import { ReferenceService } from './reference.service';

/**
 * Reference data: countries, cities, leagues, clubs (§3 — these tables belong
 * to this module; nobody else queries them). `ReferenceService` is exported so
 * profiles (and later search) validate against reference rows through the
 * module seam instead of reaching into the tables.
 */
@Module({
  controllers: [ReferenceController],
  providers: [ReferenceService],
  exports: [ReferenceService],
})
export class ReferenceModule {}
