import { INestApplication, Logger, type Type } from '@nestjs/common';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from '../../src/app.module';
import { API_PREFIX, configureApp } from '../../src/app.setup';
import { PrismaService } from '../../src/common/prisma/prisma.service';

/**
 * Shared plumbing for the DB-backed e2e suites.
 *
 * Nothing here is mocked. CLAUDE.md §13 puts integration tests against the real
 * Postgres container above mocking `PrismaService`, and the mail seam is
 * already a log line inside `AuthService` — so the only thing intercepted is
 * the logger, and that is intercepted in order to ASSERT on it (§9 forbids
 * logging tokens), not to fake anything.
 */

// ============================================================================
// Client IPs
// ============================================================================

let ipCounter = 0;

/**
 * A fresh client IP per caller.
 *
 * `ThrottlerGuard` keys its buckets on `req.ip`, and `configureApp` enables
 * `trust proxy`, so `X-Forwarded-For` decides which bucket a request lands in.
 * Giving each test its own address keeps the real throttler wired — no guard is
 * overridden anywhere — while stopping the 5-per-hour register cap from
 * bleeding across unrelated tests. `auth-throttle.e2e-spec.ts` deliberately
 * reuses one address to prove the caps still bite.
 */
export function nextClientIp(): string {
  ipCounter += 1;
  return `10.${(ipCounter >> 16) & 0xff}.${(ipCounter >> 8) & 0xff}.${ipCounter & 0xff}`;
}

/** A supertest wrapper that pins one client IP and the `/api/v1` prefix. */
export class ApiClient {
  readonly ip: string;

  constructor(
    private readonly server: App,
    ip?: string,
  ) {
    this.ip = ip ?? nextClientIp();
  }

  get(path: string) {
    return request(this.server)
      .get(`/${API_PREFIX}${path}`)
      .set('X-Forwarded-For', this.ip);
  }

  post(path: string) {
    return request(this.server)
      .post(`/${API_PREFIX}${path}`)
      .set('X-Forwarded-For', this.ip);
  }

  patch(path: string) {
    return request(this.server)
      .patch(`/${API_PREFIX}${path}`)
      .set('X-Forwarded-For', this.ip);
  }

  delete(path: string) {
    return request(this.server)
      .delete(`/${API_PREFIX}${path}`)
      .set('X-Forwarded-For', this.ip);
  }
}

// ============================================================================
// Typed response bodies
// ============================================================================

/** The §8 error envelope. */
export interface ErrorBody {
  success: false;
  error: {
    code: string;
    message: string;
    details: unknown[];
    correlationId: string;
  };
}

export const asError = (res: request.Response) => res.body as ErrorBody;
export const asJson = <T>(res: request.Response) => res.body as T;

export interface SessionBody {
  accessToken: string;
  expiresIn: number;
}

// ============================================================================
// Cookies
// ============================================================================

export const REFRESH_COOKIE = 'refresh_token';

/** Every `Set-Cookie` line on a response, normalised to an array. */
export function setCookieLines(res: request.Response): string[] {
  const header: unknown = res.headers['set-cookie'];
  if (Array.isArray(header)) return header as string[];
  return typeof header === 'string' ? [header] : [];
}

/** The raw `Set-Cookie` line for the refresh token, attributes included. */
export function refreshSetCookie(res: request.Response): string {
  const line = setCookieLines(res).find((c) =>
    c.startsWith(`${REFRESH_COOKIE}=`),
  );
  if (!line) throw new Error('response set no refresh_token cookie');
  return line;
}

/** Just the token value, for replaying a specific cookie by hand. */
export function refreshCookieValue(res: request.Response): string {
  return decodeURIComponent(
    refreshSetCookie(res)
      .split(';')[0]
      .slice(REFRESH_COOKIE.length + 1),
  );
}

/** A `Cookie:` header carrying one refresh token. */
export const cookieHeader = (token: string) => `${REFRESH_COOKIE}=${token}`;

// ============================================================================
// Log capture
// ============================================================================

export type LogLevel = 'log' | 'warn' | 'error' | 'debug' | 'verbose';

export interface LogRecord {
  level: LogLevel;
  message: string;
}

const LOG_LEVELS: LogLevel[] = ['log', 'warn', 'error', 'debug', 'verbose'];

// ============================================================================
// Application
// ============================================================================

export interface E2eContext {
  app: INestApplication<App>;
  server: App;
  prisma: PrismaService;
  /** Every line the app logged, so §9's "never log tokens" is assertable. */
  logs: LogRecord[];
  close(): Promise<void>;
}

export async function createE2eApp(
  options: { controllers?: Type<unknown>[] } = {},
): Promise<E2eContext> {
  const logs: LogRecord[] = [];
  for (const level of LOG_LEVELS) {
    jest
      .spyOn(Logger.prototype, level)
      .mockImplementation((message: unknown) => {
        logs.push({
          level,
          message:
            typeof message === 'string' ? message : JSON.stringify(message),
        });
      });
  }

  const moduleFixture: TestingModule = await Test.createTestingModule({
    imports: [AppModule],
    controllers: options.controllers ?? [],
  }).compile();

  const app = moduleFixture.createNestApplication<NestExpressApplication>();
  configureApp(app);
  await app.init();

  return {
    app,
    server: app.getHttpServer() as App,
    prisma: app.get(PrismaService),
    logs,
    close: async () => {
      await app.close();
      jest.restoreAllMocks();
    },
  };
}

// ============================================================================
// Fixture data
// ============================================================================

/**
 * `users.country_id` and `users.city_id` are NOT NULL foreign keys and both
 * tables ship empty, so registration cannot succeed without these two rows.
 *
 * Deliberately not a seed script and not a migration: reference data is the
 * `profiles` module's job per §16's build order, and inventing a general seeder
 * here would pre-empt it. Each suite creates its own country so suites cannot
 * delete each other's fixture.
 */
export interface ReferenceData {
  countryId: number;
  cityId: number;
}

export async function seedReferenceData(
  prisma: PrismaService,
  countryCode: string,
): Promise<ReferenceData> {
  const country = await prisma.country.upsert({
    where: { code: countryCode },
    update: {},
    create: { code: countryCode, nameEn: `E2E ${countryCode}`, nameAr: null },
  });

  const city = await prisma.city.upsert({
    where: { countryId_nameEn: { countryId: country.id, nameEn: 'E2E City' } },
    update: {},
    create: { countryId: country.id, nameEn: 'E2E City' },
  });

  return { countryId: country.id, cityId: city.id };
}

export const E2E_EMAIL_DOMAIN = 'e2e.test';

/**
 * Each suite owns a subdomain of `e2e.test`, so its cleanup can never reach
 * another suite's rows.
 *
 * `--runInBand` already serialises the suites, but relying on that alone made
 * teardown order load-bearing: a short suite finishing first would delete the
 * users a longer one was still using. Namespacing removes the dependency
 * entirely instead of hoping the ordering holds.
 */
export const suiteDomain = (suite: string) => `${suite}.${E2E_EMAIL_DOMAIN}`;

let emailCounter = 0;

export function uniqueEmail(suite: string, prefix = 'user'): string {
  emailCounter += 1;
  return `${prefix}-${Date.now().toString(36)}-${emailCounter}@${suiteDomain(suite)}`;
}

/** Removes only what the named suite created. `refresh_tokens` cascades. */
export async function clearE2eUsers(
  prisma: PrismaService,
  suite: string,
): Promise<void> {
  await prisma.user.deleteMany({
    where: { email: { endsWith: `@${suiteDomain(suite)}` } },
  });
}

/**
 * Deletion order is FK-driven: Club→Country and League→Country are
 * `onDelete: Restrict`, so clubs and leagues must go before cities and the
 * country. Suites whose users hold club-admin profiles must run
 * `clearE2eUsers` FIRST — deleting the user cascades the club_admin_profiles
 * row whose club reference would otherwise block the club delete.
 */
export async function clearReferenceData(
  prisma: PrismaService,
  countryCode: string,
): Promise<void> {
  const country = await prisma.country.findUnique({
    where: { code: countryCode },
  });
  if (!country) return;
  await prisma.club.deleteMany({ where: { countryId: country.id } });
  await prisma.league.deleteMany({ where: { countryId: country.id } });
  await prisma.city.deleteMany({ where: { countryId: country.id } });
  await prisma.country.delete({ where: { id: country.id } });
}
