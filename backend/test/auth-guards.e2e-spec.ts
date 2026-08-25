import { Controller, Get } from '@nestjs/common';
import { APP_PIPE } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { randomUUID } from 'node:crypto';
import { AppModule } from '../src/app.module';
import { AuthModule } from '../src/modules/auth/auth.module';
import { PrismaModule } from '../src/common/prisma/prisma.module';
import { UserRole, UserStatus } from '../src/generated/prisma/client';
import {
  ApiClient,
  asError,
  asJson,
  clearE2eUsers,
  clearReferenceData,
  createE2eApp,
  seedReferenceData,
  uniqueEmail,
  type E2eContext,
  type ReferenceData,
} from './support/e2e';

/**
 * CLAUDE.md §13 priority 1 — the authorization matrix for the auth surface,
 * against the real database.
 *
 * The guard chain, the global prefix, the §8 envelope and the single global
 * ValidationPipe, all exercised through real HTTP.
 */

/** This suite's own fixture namespace: no other suite can delete its rows. */
const SUITE = 'guards';
const COUNTRY_CODE = 'ZG';

/**
 * A route carrying NO decorators at all, standing in for every future feature
 * endpoint. Both global guards must apply to it purely by existing — that is
 * the fail-closed property §9 depends on.
 */
@Controller('probe')
class ProbeController {
  @Get()
  ping() {
    return { ok: true };
  }
}

describe('Auth guard chain (e2e, real Postgres)', () => {
  let ctx: E2eContext;
  let ref: ReferenceData;
  let jwt: JwtService;

  const tokenFor = (
    sub: string,
    status: UserStatus,
    role: UserRole = UserRole.COACH,
  ) => jwt.sign({ sub, role, status });

  /**
   * Users are inserted directly rather than through /auth/register: this suite
   * tests guards, and a bcrypt hash per fixture buys nothing here.
   */
  async function userWith(status: UserStatus) {
    const user = await ctx.prisma.user.create({
      data: {
        email: uniqueEmail(SUITE, 'guard'),
        passwordHash: '$2b$12$not.used.by.this.suite',
        fullName: 'Guard Fixture',
        role: UserRole.COACH,
        dateOfBirth: new Date('1990-01-01'),
        countryId: ref.countryId,
        cityId: ref.cityId,
        phone: '+201009998877',
        status,
      },
      select: { id: true, email: true },
    });
    return { ...user, token: tokenFor(user.id, status) };
  }

  beforeAll(async () => {
    ctx = await createE2eApp({ controllers: [ProbeController] });
    jwt = ctx.app.get(JwtService);
    await clearE2eUsers(ctx.prisma, SUITE);
    ref = await seedReferenceData(ctx.prisma, COUNTRY_CODE);
  });

  afterAll(async () => {
    await clearE2eUsers(ctx.prisma, SUITE);
    await clearReferenceData(ctx.prisma, COUNTRY_CODE);
    await ctx.close();
  });

  // ==========================================================================
  // JwtAuthGuard — global, opt out with @Public()
  // ==========================================================================

  describe('JwtAuthGuard', () => {
    it('rejects an undecorated route with no token', async () => {
      const res = await new ApiClient(ctx.server).get('/probe').expect(401);

      expect(res.body).toEqual({
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: 'Authentication required.',
          details: [],
          correlationId: expect.stringMatching(/^[0-9a-f-]{36}$/) as string,
        },
      });
    });

    it('rejects a token signed with the wrong key', async () => {
      const forged = new JwtService({ secret: 'not-the-real-secret' }).sign({
        sub: randomUUID(),
        role: UserRole.COACH,
        status: UserStatus.ACTIVE,
      });

      await new ApiClient(ctx.server)
        .get('/probe')
        .set('Authorization', `Bearer ${forged}`)
        .expect(401);
    });

    it('rejects an expired token', async () => {
      const expired = jwt.sign(
        {
          sub: randomUUID(),
          role: UserRole.COACH,
          status: UserStatus.ACTIVE,
        },
        { expiresIn: '-1s' },
      );

      await new ApiClient(ctx.server)
        .get('/probe')
        .set('Authorization', `Bearer ${expired}`)
        .expect(401);
    });

    it('accepts the token only from the Authorization header', async () => {
      const active = await userWith(UserStatus.ACTIVE);

      // Same credential, wrong channel: a query parameter must not authenticate.
      await new ApiClient(ctx.server)
        .get(`/probe?access_token=${active.token}`)
        .expect(401);

      await new ApiClient(ctx.server)
        .get('/probe')
        .set('X-Access-Token', active.token)
        .expect(401);
    });

    it('lets a @Public() route through without a token', async () => {
      await new ApiClient(ctx.server).get('').expect(200);
    });

    it('carries X-Correlation-Id even on a guard rejection', async () => {
      // Guards run before interceptors, so this only works because the filter
      // assigns the id too.
      const res = await new ApiClient(ctx.server).get('/probe').expect(401);

      expect(res.headers['x-correlation-id']).toMatch(/^[0-9a-f-]{36}$/);
      expect(res.headers['x-correlation-id']).toBe(
        asError(res).error.correlationId,
      );
    });
  });

  // ==========================================================================
  // ProfileCompleteGuard — global, opt out with @AllowIncompleteProfile()
  // ==========================================================================

  describe('ProfileCompleteGuard', () => {
    it('blocks a PENDING_PROFILE user from an ordinary route', async () => {
      const user = await userWith(UserStatus.PENDING_PROFILE);

      const res = await new ApiClient(ctx.server)
        .get('/probe')
        .set('Authorization', `Bearer ${user.token}`)
        .expect(403);

      expect(asError(res).error.code).toBe('PROFILE_INCOMPLETE');
    });

    it('still lets that user reach /auth/me', async () => {
      const user = await userWith(UserStatus.PENDING_PROFILE);

      const res = await new ApiClient(ctx.server)
        .get('/auth/me')
        .set('Authorization', `Bearer ${user.token}`)
        .expect(200);

      const body = asJson<Record<string, unknown>>(res);
      expect(body.email).toBe(user.email);
      expect(body).not.toHaveProperty('passwordHash');
      expect(body).not.toHaveProperty('phone');
    });

    it('still lets that user log out', async () => {
      const user = await userWith(UserStatus.PENDING_PROFILE);

      await new ApiClient(ctx.server)
        .post('/auth/logout')
        .set('Authorization', `Bearer ${user.token}`)
        .expect(204);
    });

    it('does not block an ACTIVE user', async () => {
      const user = await userWith(UserStatus.ACTIVE);

      await new ApiClient(ctx.server)
        .get('/probe')
        .set('Authorization', `Bearer ${user.token}`)
        .expect(200);
    });

    it('issues no query — it gates a user that does not exist at all', async () => {
      // status comes straight off the verified token, so the guard costs
      // nothing per request. This passes only if it never looks the user up.
      const ghost = tokenFor(randomUUID(), UserStatus.PENDING_PROFILE);

      const res = await new ApiClient(ctx.server)
        .get('/probe')
        .set('Authorization', `Bearer ${ghost}`)
        .expect(403);

      expect(asError(res).error.code).toBe('PROFILE_INCOMPLETE');
    });

    it('lets a SUSPENDED token through until it expires — the documented 15-minute window', async () => {
      // Not a bug: §9 accepts that a status change only takes effect at the
      // next refresh, which is what keeps this guard free of a DB lookup. The
      // refresh call is where suspension is actually enforced (auth-flow spec).
      const user = await userWith(UserStatus.SUSPENDED);

      await new ApiClient(ctx.server)
        .get('/probe')
        .set('Authorization', `Bearer ${user.token}`)
        .expect(200);
    });
  });

  // ==========================================================================
  // The global ValidationPipe
  // ==========================================================================

  describe('ValidationPipe', () => {
    it('is registered in bootstrap only, never as an APP_PIPE in a module', () => {
      for (const mod of [AppModule, AuthModule, PrismaModule]) {
        const providers = (Reflect.getMetadata('providers', mod) ??
          []) as Array<{ provide?: unknown }>;
        expect(
          providers.filter((p) => p && p.provide === APP_PIPE),
        ).toHaveLength(0);
      }

      // Future-proof: catches a module added later that registers its own.
      const offenders = moduleFiles(join(__dirname, '..', 'src')).filter((f) =>
        readFileSync(f, 'utf8').includes('APP_PIPE'),
      );
      expect(offenders).toEqual([]);
    });

    it('applies to every route, not just the ones that declare a DTO', async () => {
      const res = await new ApiClient(ctx.server)
        .post('/auth/login')
        .send({ email: 'not-an-email' })
        .expect(400);

      expect(asError(res).error.code).toBe('VALIDATION_ERROR');
      expect(asError(res).error.details.length).toBeGreaterThan(0);
    });
  });
});

/** Every `*.module.ts` under `src`, recursively. */
function moduleFiles(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      return entry.name === 'generated' ? [] : moduleFiles(full);
    }
    return entry.name.endsWith('.module.ts') ? [full] : [];
  });
}
