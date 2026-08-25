import {
  ApiClient,
  asError,
  asJson,
  clearReferenceData,
  createE2eApp,
  E2eContext,
} from './support/e2e';

/**
 * Reference-data endpoints against real Postgres.
 *
 * Isolation: this suite owns country code ZR and only ever asserts on rows it
 * created underneath it. Shared tables also contain other suites' rows (and
 * possibly a dev seed), so assertions are containment/filtering — never exact
 * counts over unfiltered lists. No users are created here.
 */
const COUNTRY_CODE = 'ZR';

interface NamedItem {
  id: number;
  nameEn: string;
}

interface Page<T> {
  data: T[];
  nextCursor: string | null;
}

describe('Reference data (e2e)', () => {
  let ctx: E2eContext;
  let api: ApiClient;

  let countryId: number;
  let cityAId: number;
  let cityBId: number;
  let leagueId: number;

  // Ordered by nameEn — the pagination contract this suite proves.
  const CLUB_NAMES = ['ZR Alpha FC', 'ZR Beta FC', 'ZR Gamma FC'] as const;

  beforeAll(async () => {
    ctx = await createE2eApp();
    api = new ApiClient(ctx.server);
    await clearReferenceData(ctx.prisma, COUNTRY_CODE);

    const country = await ctx.prisma.country.create({
      data: { code: COUNTRY_CODE, nameEn: 'ZR Testland', nameAr: 'اختبار' },
    });
    countryId = country.id;

    const cityA = await ctx.prisma.city.create({
      data: { countryId, nameEn: 'ZR City A', nameAr: 'مدينة ألف' },
    });
    cityAId = cityA.id;
    const cityB = await ctx.prisma.city.create({
      data: { countryId, nameEn: 'ZR City B' },
    });
    cityBId = cityB.id;

    const league = await ctx.prisma.league.create({
      data: { countryId, nameEn: 'ZR Premier League', level: 1 },
    });
    leagueId = league.id;

    await ctx.prisma.club.create({
      data: {
        nameEn: CLUB_NAMES[0],
        nameAr: 'نادي زر ألفا',
        countryId,
        cityId: cityAId,
        leagueId,
      },
    });
    await ctx.prisma.club.create({
      data: { nameEn: CLUB_NAMES[1], countryId, cityId: cityBId, leagueId },
    });
    await ctx.prisma.club.create({
      data: { nameEn: CLUB_NAMES[2], countryId, leagueId: null },
    });
  });

  afterAll(async () => {
    await clearReferenceData(ctx.prisma, COUNTRY_CODE);
    await ctx.close();
  });

  describe('public access', () => {
    it('serves every endpoint without a token', async () => {
      for (const path of [
        '/reference/countries',
        `/reference/cities?countryId=${countryId}`,
        '/reference/leagues',
        `/reference/clubs?countryId=${countryId}`,
        '/reference/positions',
      ]) {
        await api.get(path).expect(200);
      }
    });

    it('marks responses publicly cacheable', async () => {
      const res = await api.get('/reference/countries').expect(200);
      expect(res.headers['cache-control']).toBe('public, max-age=3600');
    });
  });

  describe('GET /reference/countries', () => {
    it('lists countries including this suite country, ordered by name', async () => {
      const res = await api.get('/reference/countries').expect(200);
      const body = asJson<Page<NamedItem & { code: string }>>(res);

      expect(body.nextCursor).toBeNull();
      expect(body.data.map((c) => c.code)).toContain(COUNTRY_CODE);
      const names = body.data.map((c) => c.nameEn);
      expect([...names].sort((a, b) => a.localeCompare(b))).toEqual(names);
    });
  });

  describe('GET /reference/cities', () => {
    it('requires countryId', async () => {
      const res = await api.get('/reference/cities').expect(400);
      expect(asError(res).error.code).toBe('VALIDATION_ERROR');
    });

    it('returns only the requested country cities', async () => {
      const res = await api
        .get(`/reference/cities?countryId=${countryId}`)
        .expect(200);
      const body = asJson<Page<NamedItem & { countryId: number }>>(res);

      expect(body.data).toHaveLength(2);
      expect(body.data.every((c) => c.countryId === countryId)).toBe(true);
      expect(body.data.map((c) => c.nameEn)).toEqual([
        'ZR City A',
        'ZR City B',
      ]);
    });
  });

  describe('GET /reference/leagues', () => {
    it('filters by country', async () => {
      const res = await api
        .get(`/reference/leagues?countryId=${countryId}`)
        .expect(200);
      const body = asJson<Page<NamedItem & { level: number | null }>>(res);

      expect(body.data).toHaveLength(1);
      expect(body.data[0]).toMatchObject({
        id: leagueId,
        nameEn: 'ZR Premier League',
        level: 1,
      });
    });

    it('includes the suite league in the unfiltered list', async () => {
      const res = await api.get('/reference/leagues').expect(200);
      const body = asJson<Page<NamedItem>>(res);
      expect(body.data.map((l) => l.id)).toContain(leagueId);
    });
  });

  describe('GET /reference/clubs', () => {
    it('searches by English name fragment, case-insensitively', async () => {
      const res = await api
        .get(`/reference/clubs?countryId=${countryId}&q=alpha`)
        .expect(200);
      const body = asJson<Page<NamedItem>>(res);
      expect(body.data.map((c) => c.nameEn)).toEqual(['ZR Alpha FC']);
    });

    it('searches by Arabic name', async () => {
      const res = await api
        .get(
          `/reference/clubs?countryId=${countryId}&q=${encodeURIComponent('ألفا')}`,
        )
        .expect(200);
      const body = asJson<Page<NamedItem>>(res);
      expect(body.data.map((c) => c.nameEn)).toEqual(['ZR Alpha FC']);
    });

    it('filters by league', async () => {
      const res = await api
        .get(`/reference/clubs?countryId=${countryId}&leagueId=${leagueId}`)
        .expect(200);
      const body = asJson<Page<NamedItem>>(res);
      // Gamma has no league and must be absent.
      expect(body.data.map((c) => c.nameEn)).toEqual([
        'ZR Alpha FC',
        'ZR Beta FC',
      ]);
    });

    it('embeds country, city and league sub-objects', async () => {
      const res = await api
        .get(`/reference/clubs?countryId=${countryId}&q=alpha`)
        .expect(200);
      const body = asJson<
        Page<{
          country: { code: string };
          city: { nameEn: string } | null;
          league: { nameEn: string } | null;
        }>
      >(res);
      expect(body.data[0].country.code).toBe(COUNTRY_CODE);
      expect(body.data[0].city?.nameEn).toBe('ZR City A');
      expect(body.data[0].league?.nameEn).toBe('ZR Premier League');
    });

    it('pages by keyset with disjoint pages and a terminal null cursor', async () => {
      const first = asJson<Page<NamedItem>>(
        await api
          .get(`/reference/clubs?countryId=${countryId}&limit=2`)
          .expect(200),
      );
      expect(first.data.map((c) => c.nameEn)).toEqual([
        'ZR Alpha FC',
        'ZR Beta FC',
      ]);
      expect(first.nextCursor).not.toBeNull();

      const second = asJson<Page<NamedItem>>(
        await api
          .get(
            `/reference/clubs?countryId=${countryId}&limit=2&cursor=${first.nextCursor}`,
          )
          .expect(200),
      );
      expect(second.data.map((c) => c.nameEn)).toEqual(['ZR Gamma FC']);
      expect(second.nextCursor).toBeNull();

      const firstIds = new Set(first.data.map((c) => c.id));
      expect(second.data.some((c) => firstIds.has(c.id))).toBe(false);
    });

    it('rejects a garbage cursor', async () => {
      const res = await api
        .get(`/reference/clubs?countryId=${countryId}&cursor=not-a-cursor`)
        .expect(400);
      expect(asError(res).error.code).toBe('VALIDATION_ERROR');
    });

    it('caps limit at 50', async () => {
      const res = await api
        .get(`/reference/clubs?countryId=${countryId}&limit=100`)
        .expect(400);
      expect(asError(res).error.code).toBe('VALIDATION_ERROR');
    });
  });

  describe('GET /reference/positions', () => {
    it('returns the role enum option sets', async () => {
      const res = await api.get('/reference/positions').expect(200);
      const body = asJson<Record<string, string[]>>(res);

      expect(body.playerPositions).toEqual(
        expect.arrayContaining(['GOALKEEPER', 'STRIKER']),
      );
      expect(body.preferredFeet).toEqual(
        expect.arrayContaining(['LEFT', 'RIGHT', 'BOTH']),
      );
      expect(body.leagueLevels).toEqual(expect.arrayContaining(['PREMIER']));
      expect(body.coachTypes).toEqual(expect.arrayContaining(['HEAD']));
      expect(body.scoutTypes).toEqual(expect.arrayContaining(['INDEPENDENT']));
      expect(body.analystTypes).toEqual(expect.arrayContaining(['TACTICAL']));
    });
  });
});
