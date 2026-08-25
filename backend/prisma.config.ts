// =============================================================================
// Prisma 7 configuration — REQUIRED (v7 removed `url` from schema.prisma).
// The CLI (migrate, studio, generate) reads the connection from here.
// The runtime app does NOT read this file — it connects via the PrismaPg
// driver adapter inside PrismaService (see CLAUDE.md §7).
//
// API verified against @prisma/config@7.9.1 type definitions.
// If a future `npx prisma init` scaffolds a slightly different shape,
// trust the CLI's output for structure and keep these same values.
// =============================================================================
import 'dotenv/config'; // prisma.config.ts does not auto-load .env — this line is load-bearing
import { defineConfig, env } from 'prisma/config';

export default defineConfig({
  schema: 'prisma/schema.prisma',

  datasource: {
    // Used by `prisma migrate dev/deploy`, `prisma studio`, introspection.
    url: env('DATABASE_URL'),
  },

  migrations: {
    path: 'prisma/migrations',
    // ts-node rather than tsx: already a devDependency, and §15 gates adding
    // dependencies. `-r ts-node/register` so resolution never depends on .bin.
    seed: 'node -r ts-node/register prisma/seed.ts',
  },
});
