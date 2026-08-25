/**
 * Reference-data seed — countries, cities, leagues, and a starter set of
 * Egyptian Premier League clubs (CLAUDE.md §16: "profiles (+ reference-data
 * seed)"; PRD Appendix D Q-3: Egypt + Saudi Arabia reference data at launch).
 *
 * IDEMPOTENT by construction: every row is upserted on its natural unique key
 * (country `code`, city/league `(countryId, nameEn)`, club `(nameEn,
 * countryId)`), so re-running refreshes data and never duplicates. Reference
 * rows are never deleted here or anywhere (PRD EC-7).
 *
 * Run via `npm run db:seed` (or `npx prisma db seed`).
 */
import 'dotenv/config';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../src/generated/prisma/client';

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL! }),
});

// =============================================================================
// Data — bilingual per PRD 9.12; nameAr falls back to nameEn at render time,
// so a missing Arabic name is a data gap, not an error.
// =============================================================================

const COUNTRIES = [
  { code: 'EG', nameEn: 'Egypt', nameAr: 'مصر' },
  { code: 'SA', nameEn: 'Saudi Arabia', nameAr: 'المملكة العربية السعودية' },
] as const;

type CountryCode = (typeof COUNTRIES)[number]['code'];

const CITIES: Record<CountryCode, { nameEn: string; nameAr: string }[]> = {
  EG: [
    { nameEn: 'Cairo', nameAr: 'القاهرة' },
    { nameEn: 'Giza', nameAr: 'الجيزة' },
    { nameEn: 'Alexandria', nameAr: 'الإسكندرية' },
    { nameEn: 'Port Said', nameAr: 'بورسعيد' },
    { nameEn: 'Ismailia', nameAr: 'الإسماعيلية' },
    { nameEn: 'Suez', nameAr: 'السويس' },
    { nameEn: 'El Mahalla El Kubra', nameAr: 'المحلة الكبرى' },
    { nameEn: 'El Gouna', nameAr: 'الجونة' },
  ],
  SA: [
    { nameEn: 'Riyadh', nameAr: 'الرياض' },
    { nameEn: 'Jeddah', nameAr: 'جدة' },
    { nameEn: 'Dammam', nameAr: 'الدمام' },
  ],
};

const LEAGUES: {
  country: CountryCode;
  nameEn: string;
  nameAr: string;
  level: number;
}[] = [
  {
    country: 'EG',
    nameEn: 'Egyptian Premier League',
    nameAr: 'الدوري المصري الممتاز',
    level: 1,
  },
  {
    country: 'EG',
    nameEn: 'Egyptian Second Division A',
    nameAr: 'دوري المحترفين المصري',
    level: 2,
  },
  {
    country: 'SA',
    nameEn: 'Saudi Pro League',
    nameAr: 'دوري المحترفين السعودي',
    level: 1,
  },
  {
    country: 'SA',
    nameEn: 'Saudi First Division League',
    nameAr: 'دوري الدرجة الأولى السعودي',
    level: 2,
  },
];

/**
 * Starter set: Egyptian Premier League. Founded years only where confidently
 * known — a wrong fact is worse than a missing one. City must exist in CITIES.
 */
const EGYPTIAN_PREMIER_CLUBS: {
  nameEn: string;
  nameAr: string;
  shortNameEn?: string;
  shortNameAr?: string;
  city: string;
  foundedYear?: number;
}[] = [
  { nameEn: 'Al Ahly SC', nameAr: 'النادي الأهلي', shortNameEn: 'Al Ahly', shortNameAr: 'الأهلي', city: 'Cairo', foundedYear: 1907 },
  { nameEn: 'Zamalek SC', nameAr: 'نادي الزمالك', shortNameEn: 'Zamalek', shortNameAr: 'الزمالك', city: 'Giza', foundedYear: 1911 },
  { nameEn: 'Pyramids FC', nameAr: 'نادي بيراميدز', shortNameEn: 'Pyramids', shortNameAr: 'بيراميدز', city: 'Cairo' },
  { nameEn: 'Ismaily SC', nameAr: 'النادي الإسماعيلي', shortNameEn: 'Ismaily', shortNameAr: 'الإسماعيلي', city: 'Ismailia', foundedYear: 1924 },
  { nameEn: 'Al Masry SC', nameAr: 'النادي المصري', shortNameEn: 'Al Masry', shortNameAr: 'المصري', city: 'Port Said', foundedYear: 1920 },
  { nameEn: 'Al Ittihad Alexandria', nameAr: 'الاتحاد السكندري', shortNameEn: 'Al Ittihad', shortNameAr: 'الاتحاد', city: 'Alexandria', foundedYear: 1914 },
  { nameEn: 'Smouha SC', nameAr: 'نادي سموحة', shortNameEn: 'Smouha', shortNameAr: 'سموحة', city: 'Alexandria', foundedYear: 1949 },
  { nameEn: 'ENPPI SC', nameAr: 'نادي إنبي', shortNameEn: 'ENPPI', shortNameAr: 'إنبي', city: 'Cairo' },
  { nameEn: 'Petrojet SC', nameAr: 'نادي بتروجت', shortNameEn: 'Petrojet', shortNameAr: 'بتروجت', city: 'Suez' },
  { nameEn: 'Ghazl El Mahalla SC', nameAr: 'نادي غزل المحلة', shortNameEn: 'Ghazl El Mahalla', shortNameAr: 'غزل المحلة', city: 'El Mahalla El Kubra', foundedYear: 1936 },
  { nameEn: "Tala'ea El Gaish SC", nameAr: 'نادي طلائع الجيش', shortNameEn: 'El Gaish', shortNameAr: 'طلائع الجيش', city: 'Cairo' },
  { nameEn: 'Pharco FC', nameAr: 'نادي فاركو', shortNameEn: 'Pharco', shortNameAr: 'فاركو', city: 'Alexandria' },
  { nameEn: 'ZED FC', nameAr: 'نادي زد', shortNameEn: 'ZED', shortNameAr: 'زد', city: 'Giza' },
  { nameEn: 'El Gouna FC', nameAr: 'نادي الجونة', shortNameEn: 'El Gouna', shortNameAr: 'الجونة', city: 'El Gouna' },
  { nameEn: 'National Bank of Egypt SC', nameAr: 'نادي البنك الأهلي المصري', shortNameEn: 'NBE', shortNameAr: 'البنك الأهلي', city: 'Cairo' },
  { nameEn: 'Ceramica Cleopatra FC', nameAr: 'نادي سيراميكا كليوباترا', shortNameEn: 'Ceramica', shortNameAr: 'سيراميكا', city: 'Cairo' },
  { nameEn: 'Haras El Hodoud SC', nameAr: 'نادي حرس الحدود', shortNameEn: 'Haras El Hodoud', shortNameAr: 'حرس الحدود', city: 'Alexandria' },
  { nameEn: 'Modern Sport FC', nameAr: 'نادي مودرن سبورت', shortNameEn: 'Modern Sport', shortNameAr: 'مودرن سبورت', city: 'Cairo' },
];

// =============================================================================
// Seeding
// =============================================================================

async function main(): Promise<void> {
  // Countries → cities → leagues → clubs: each tier resolves FKs from the one
  // before it, and nothing is ever deleted.
  const countryIds = new Map<CountryCode, number>();
  for (const country of COUNTRIES) {
    const row = await prisma.country.upsert({
      where: { code: country.code },
      update: { nameEn: country.nameEn, nameAr: country.nameAr },
      create: country,
    });
    countryIds.set(country.code, row.id);
  }

  // Keyed "code:name" — city names are only unique within a country.
  const cityIds = new Map<string, number>();
  for (const [code, cities] of Object.entries(CITIES) as [
    CountryCode,
    (typeof CITIES)[CountryCode],
  ][]) {
    const countryId = countryIds.get(code)!;
    for (const city of cities) {
      const row = await prisma.city.upsert({
        where: { countryId_nameEn: { countryId, nameEn: city.nameEn } },
        update: { nameAr: city.nameAr },
        create: { countryId, ...city },
      });
      cityIds.set(`${code}:${city.nameEn}`, row.id);
    }
  }

  const leagueIds = new Map<string, number>();
  for (const league of LEAGUES) {
    const countryId = countryIds.get(league.country)!;
    const row = await prisma.league.upsert({
      where: { countryId_nameEn: { countryId, nameEn: league.nameEn } },
      update: { nameAr: league.nameAr, level: league.level },
      create: {
        countryId,
        nameEn: league.nameEn,
        nameAr: league.nameAr,
        level: league.level,
      },
    });
    leagueIds.set(`${league.country}:${league.nameEn}`, row.id);
  }

  const egyptId = countryIds.get('EG')!;
  const eplId = leagueIds.get('EG:Egyptian Premier League')!;
  for (const club of EGYPTIAN_PREMIER_CLUBS) {
    const cityId = cityIds.get(`EG:${club.city}`);
    if (cityId === undefined) {
      throw new Error(`Club "${club.nameEn}" references unseeded city "${club.city}"`);
    }
    const fields = {
      nameAr: club.nameAr,
      shortNameEn: club.shortNameEn ?? null,
      shortNameAr: club.shortNameAr ?? null,
      cityId,
      leagueId: eplId,
      foundedYear: club.foundedYear ?? null,
    };
    await prisma.club.upsert({
      where: { nameEn_countryId: { nameEn: club.nameEn, countryId: egyptId } },
      update: fields,
      create: { nameEn: club.nameEn, countryId: egyptId, ...fields },
    });
  }

  const [countries, cities, leagues, clubs] = await Promise.all([
    prisma.country.count(),
    prisma.city.count(),
    prisma.league.count(),
    prisma.club.count(),
  ]);
  console.log(
    `Seed complete — totals now: ${countries} countries, ${cities} cities, ${leagues} leagues, ${clubs} clubs`,
  );
}

main()
  .catch((error) => {
    console.error('Seed failed:', error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
