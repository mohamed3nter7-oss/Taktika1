import request from 'supertest';
import { createE2eApp, type E2eContext } from './support/e2e';

/**
 * The liveness / readiness split (D-030).
 *
 * Both routes were previously untested, which left three guarantees unpinned:
 * that they are `@Public()`, that liveness makes no network call, and that
 * readiness never throws. The first and third are asserted directly here. The
 * second cannot be asserted from outside the process, so it is approximated the
 * only honest way available — by timing, against a storage probe measured at
 * ~275-285ms from this machine — and the assertion is written so it fails if a
 * dependency is ever added to the liveness handler.
 *
 * These run with the DUMMY storage credentials from `support/storage-env.ts`
 * (an unreachable `*.example.test` endpoint), which is why nothing here asserts
 * `storage.ok === true`. That is the point: readiness must answer cleanly with
 * the object store unreachable, and this suite is the only place that
 * arrangement exists.
 */
describe('Health (e2e, real Postgres)', () => {
  let ctx: E2eContext;

  beforeAll(async () => {
    ctx = await createE2eApp();
  });

  afterAll(async () => {
    await ctx.close();
  });

  describe('GET /api/v1/health — liveness', () => {
    it('returns 200 {"status":"ok"} with NO Authorization header', async () => {
      const res = await request(ctx.server).get('/api/v1/health').expect(200);
      expect(res.body).toEqual({ status: 'ok' });
    });

    /**
     * The body is the whole contract. A health endpoint is unauthenticated by
     * necessity, which makes it the cheapest reconnaissance surface in the
     * application — no version, no bucket name, no endpoint, no dependency
     * detail. `toEqual` above already pins this; this states why.
     */
    it('exposes exactly one key and nothing else', () => {
      return request(ctx.server)
        .get('/api/v1/health')
        .expect(200)
        .expect((res: request.Response) => {
          expect(Object.keys(res.body as object)).toEqual(['status']);
        });
    });

    /**
     * The no-network guarantee, as close as an e2e can get to it. A HeadBucket
     * against Supabase measures ~275-285ms from here; the dummy endpoint in
     * this suite is unreachable and takes longer still, through SDK retries. If
     * anyone adds a dependency probe to the liveness handler, this blows past
     * 150ms and goes red.
     *
     * Deliberately NOT a tight bound — this asserts "no network call happened",
     * not "the handler is fast", and a generous ceiling is what keeps it from
     * being flaky on a loaded CI box.
     */
    it('answers far faster than any network round trip could', async () => {
      const started = Date.now();
      await request(ctx.server).get('/api/v1/health').expect(200);
      expect(Date.now() - started).toBeLessThan(150);
    });

    it('is unaffected by a garbage Authorization header', async () => {
      const res = await request(ctx.server)
        .get('/api/v1/health')
        .set('Authorization', 'Bearer not-a-real-token')
        .expect(200);
      expect(res.body).toEqual({ status: 'ok' });
    });
  });

  describe('GET /api/v1/health/ready — readiness', () => {
    it('is public and answers 200 even with storage unreachable', async () => {
      const res = await request(ctx.server)
        .get('/api/v1/health/ready')
        .expect(200);

      const body = res.body as {
        status: string;
        database: { ok: boolean; latencyMs: number };
        storage: { ok: boolean; latencyMs: number };
      };

      expect(Object.keys(body).sort()).toEqual([
        'database',
        'status',
        'storage',
      ]);
      expect(['ok', 'degraded']).toContain(body.status);
    });

    /**
     * NEVER THROWS is the guarantee this route exists to keep. The suite runs
     * against an unreachable object store, so `storage.ok` is false here — and
     * a false probe must still produce a 200 with a body, not a 500. That is
     * the whole reason storage failure is `degraded` rather than unavailable:
     * reads, feeds, profiles and messaging all work without the bucket, and
     * only image upload does not (D-030).
     */
    it('reports a failed dependency as degraded rather than throwing', async () => {
      const res = await request(ctx.server)
        .get('/api/v1/health/ready')
        .expect(200);
      const body = res.body as {
        status: string;
        storage: { ok: boolean; latencyMs: number };
        database: { ok: boolean; latencyMs: number };
      };

      // The database IS reachable in e2e; storage deliberately is not.
      expect(body.database.ok).toBe(true);
      expect(body.storage.ok).toBe(false);
      expect(body.status).toBe('degraded');
      expect(typeof body.storage.latencyMs).toBe('number');
    });

    it('leaks no endpoint, bucket name or SDK error text', async () => {
      const res = await request(ctx.server)
        .get('/api/v1/health/ready')
        .expect(200);
      const serialised = JSON.stringify(res.body);

      expect(serialised).not.toMatch(/example\.test/);
      expect(serialised).not.toMatch(/media/);
      expect(serialised).not.toMatch(/supabase/i);
      expect(serialised).not.toMatch(/secret|accessKey/i);
    });
  });
});
