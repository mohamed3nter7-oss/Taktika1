import request from 'supertest';
import { createE2eApp, type E2eContext } from './support/e2e';

describe('AppController (e2e)', () => {
  let ctx: E2eContext;

  beforeAll(async () => {
    ctx = await createE2eApp();
  });

  afterAll(async () => {
    await ctx.close();
  });

  it('/api/v1 (GET)', () => {
    // Booted through the same `configureApp` the server runs, against the real
    // Prisma client — no stub, so this doubles as an end-to-end startup check.
    return request(ctx.server)
      .get('/api/v1')
      .expect(200)
      .expect('Hello World!');
  });
});
