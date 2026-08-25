import {
  ApiClient,
  asError,
  createE2eApp,
  nextClientIp,
  type E2eContext,
} from './support/e2e';

/**
 * §9: "Rate-limit login/register/refresh hard" — explicitly tighter than the
 * global default of 100 requests/minute.
 *
 * Every request here carries a deliberately invalid body. Guards run before
 * pipes, so the throttler has already counted the request by the time the
 * ValidationPipe rejects it — which means these caps can be proven without
 * creating a single user or burning a single bcrypt hash.
 *
 * The whole suite shares one app, and `ThrottlerModule` stores its counters in
 * memory, so each test pins its own client IP to get its own bucket.
 */

const GLOBAL_DEFAULT_LIMIT = 100;

describe('Auth rate limiting (e2e)', () => {
  let ctx: E2eContext;

  beforeAll(async () => {
    ctx = await createE2eApp();
  });

  afterAll(async () => {
    await ctx.close();
  });

  /** Fires `count` requests from one address and returns the status codes. */
  async function burst(
    path: string,
    count: number,
    ip = nextClientIp(),
  ): Promise<number[]> {
    const api = new ApiClient(ctx.server, ip);
    const statuses: number[] = [];
    for (let i = 0; i < count; i++) {
      const res = await api.post(path).send({});
      statuses.push(res.status);
    }
    return statuses;
  }

  it('caps /auth/register at 5 per hour', async () => {
    const statuses = await burst('/auth/register', 6);

    expect(statuses.slice(0, 5).every((s) => s !== 429)).toBe(true);
    expect(statuses[5]).toBe(429);
    expect(statuses.length).toBeLessThan(GLOBAL_DEFAULT_LIMIT);
  });

  it('caps /auth/login at 5 per minute', async () => {
    const statuses = await burst('/auth/login', 6);

    expect(statuses.slice(0, 5).every((s) => s !== 429)).toBe(true);
    expect(statuses[5]).toBe(429);
  });

  it('caps /auth/refresh at 30 per 15 minutes', async () => {
    const statuses = await burst('/auth/refresh', 31);

    expect(statuses.slice(0, 30).every((s) => s !== 429)).toBe(true);
    expect(statuses[30]).toBe(429);
  });

  it('returns the §8 envelope with RATE_LIMITED on rejection', async () => {
    const ip = nextClientIp();
    await burst('/auth/register', 5, ip);

    const res = await new ApiClient(ctx.server, ip)
      .post('/auth/register')
      .send({})
      .expect(429);

    expect(asError(res).error.code).toBe('RATE_LIMITED');
    expect(asError(res).error.correlationId).toMatch(/^[0-9a-f-]{36}$/);
  });

  it('keys the bucket per client, so one abuser cannot lock everyone out', async () => {
    const ip = nextClientIp();
    await burst('/auth/register', 6, ip);

    // A different X-Forwarded-For is a different bucket — which is exactly
    // what `trust proxy` exists for behind Railway's TLS terminator.
    const other = await new ApiClient(ctx.server)
      .post('/auth/register')
      .send({});
    expect(other.status).not.toBe(429);
  });
});
