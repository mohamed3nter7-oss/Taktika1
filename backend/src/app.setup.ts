import { ValidationPipe } from '@nestjs/common';
import type { NestExpressApplication } from '@nestjs/platform-express';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';

export const API_PREFIX = 'api/v1';

/**
 * Everything about the HTTP request pipeline that must be identical in
 * production and in tests.
 *
 * It lives here rather than inline in `bootstrap()` because importing `main.ts`
 * from a test would execute its top-level `void bootstrap()` and start a real
 * listener. Splitting it also removes the drift risk of an e2e suite
 * hand-copying the pipe options and then passing against a configuration the
 * server never runs.
 *
 * The global `ValidationPipe` is registered HERE and nowhere else — never as an
 * `APP_PIPE` provider in a module (CLAUDE.md §3 specifies one global pipe).
 */
export function configureApp(app: NestExpressApplication): void {
  // Load-bearing: the refresh cookie is scoped to Path=/api/v1/auth (§9). Drop
  // this prefix and the browser never sends the cookie back.
  app.setGlobalPrefix(API_PREFIX);

  // Railway terminates TLS upstream. Without this the throttler keys every
  // request to the proxy's IP, so one abuser rate-limits everybody.
  app.set('trust proxy', 1);

  app.use(helmet());
  app.use(cookieParser());

  // §3, these exact options. `forbidNonWhitelisted` is what makes registration
  // structurally unable to accept a field nobody declared.
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: false },
    }),
  );

  // Binary never passes through the API (§10), so the body stays small.
  app.useBodyParser('json', { limit: '100kb' });
  app.useBodyParser('urlencoded', { limit: '100kb', extended: true });
}
