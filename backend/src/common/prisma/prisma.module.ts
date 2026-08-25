import { Global, Module } from '@nestjs/common';
import { PrismaService } from './prisma.service';

// Global: every feature module talks to Prisma directly (CLAUDE.md §3), so
// re-importing this in each one would be noise.
@Global()
@Module({
  providers: [PrismaService],
  exports: [PrismaService],
})
export class PrismaModule {}
