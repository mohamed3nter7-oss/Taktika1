import { validateStorageEnv } from './storage.config';

/**
 * The boot-refusal guarantee.
 *
 * `validateStorageEnv` is wired into `ConfigModule.forRoot({ validate })`, so
 * every assertion here is really about whether the process starts. That
 * guarantee was previously demonstrated by hand — three malformed values, three
 * refusals — and pinned by nothing, which is exactly the shape §8 warns about:
 * a refactor that made the validator silently pass would have gone unnoticed.
 *
 * The POSITIVE case matters as much as the negative ones. A validator that
 * rejected everything would satisfy every "it throws" test in here while
 * making the application unstartable.
 */

const VALID: Record<string, string> = {
  STORAGE_ENDPOINT: 'https://example.storage.supabase.co/storage/v1/s3',
  STORAGE_REGION: 'eu-west-1',
  STORAGE_ACCESS_KEY_ID: 'test-access-key-id',
  STORAGE_SECRET_ACCESS_KEY: 'test-secret-access-key',
  STORAGE_BUCKET: 'media',
  STORAGE_PUBLIC_BASE_URL:
    'https://example.supabase.co/storage/v1/object/public/media',
  STORAGE_FORCE_PATH_STYLE: 'true',
};

/** The seven, plus the unrelated variables real `process.env` always carries. */
const withEnv = (overrides: Record<string, string | undefined>) => {
  const env: Record<string, unknown> = {
    ...VALID,
    DATABASE_URL: 'postgresql://u:p@localhost:5433/db',
    JWT_SECRET: 'unrelated-but-must-survive',
    PATH: '/usr/bin',
    ...overrides,
  };
  for (const [key, value] of Object.entries(overrides)) {
    if (value === undefined) delete env[key];
  }
  return env;
};

describe('validateStorageEnv', () => {
  describe('accepts a valid configuration', () => {
    it('returns the config rather than throwing', () => {
      expect(() => validateStorageEnv(withEnv({}))).not.toThrow();
    });

    /**
     * The reason this validator does NOT whitelist. `validate` receives all of
     * process.env and its return value becomes the config, so stripping
     * unknown keys would drop DATABASE_URL and JWT_SECRET — the application
     * would boot against a config with seven entries.
     */
    it('passes through unrelated variables untouched', () => {
      const result = validateStorageEnv(withEnv({}));
      expect(result.DATABASE_URL).toBe('postgresql://u:p@localhost:5433/db');
      expect(result.JWT_SECRET).toBe('unrelated-but-must-survive');
      expect(result.PATH).toBe('/usr/bin');
    });

    it('accepts a localhost endpoint, so a local S3 is not gratuitously refused', () => {
      expect(() =>
        validateStorageEnv(
          withEnv({ STORAGE_ENDPOINT: 'http://localhost:9000' }),
        ),
      ).not.toThrow();
    });
  });

  describe('refuses to start', () => {
    it.each([
      'STORAGE_ENDPOINT',
      'STORAGE_REGION',
      'STORAGE_ACCESS_KEY_ID',
      'STORAGE_SECRET_ACCESS_KEY',
      'STORAGE_BUCKET',
      'STORAGE_PUBLIC_BASE_URL',
      'STORAGE_FORCE_PATH_STYLE',
    ])('when %s is missing entirely', (key) => {
      expect(() => validateStorageEnv(withEnv({ [key]: undefined }))).toThrow(
        /Invalid storage configuration/,
      );
    });

    it.each([
      'STORAGE_REGION',
      'STORAGE_ACCESS_KEY_ID',
      'STORAGE_SECRET_ACCESS_KEY',
      'STORAGE_BUCKET',
    ])('when %s is present but empty', (key) => {
      expect(() => validateStorageEnv(withEnv({ [key]: '' }))).toThrow(
        /Invalid storage configuration/,
      );
    });

    it('when the endpoint is not a URL', () => {
      expect(() =>
        validateStorageEnv(withEnv({ STORAGE_ENDPOINT: 'not-a-url' })),
      ).toThrow(/STORAGE_ENDPOINT/);
    });

    it('when the public base URL is not a URL', () => {
      expect(() =>
        validateStorageEnv(
          withEnv({ STORAGE_PUBLIC_BASE_URL: 'also-not-a-url' }),
        ),
      ).toThrow(/STORAGE_PUBLIC_BASE_URL/);
    });

    it.each(['yes', 'TRUE', '1', ''])(
      'when STORAGE_FORCE_PATH_STYLE is %p rather than "true"/"false"',
      (value) => {
        expect(() =>
          validateStorageEnv(withEnv({ STORAGE_FORCE_PATH_STYLE: value })),
        ).toThrow(/STORAGE_FORCE_PATH_STYLE/);
      },
    );
  });

  describe('the failure message', () => {
    it('names the offending property', () => {
      expect(() => validateStorageEnv(withEnv({ STORAGE_BUCKET: '' }))).toThrow(
        /STORAGE_BUCKET/,
      );
    });

    /**
     * This crash message goes into a boot log, which is somewhere a secret must
     * never be. class-validator reports the property and the constraint, not
     * the value — asserted rather than assumed, because a future switch to a
     * different validator could quietly start interpolating values.
     */
    it('never contains the secret it is complaining about', () => {
      const secret = 'super-secret-key-do-not-log-me';
      let message = '';
      try {
        validateStorageEnv(
          withEnv({
            STORAGE_SECRET_ACCESS_KEY: secret,
            STORAGE_BUCKET: '',
          }),
        );
      } catch (error) {
        message = error instanceof Error ? error.message : String(error);
      }

      expect(message).toContain('STORAGE_BUCKET');
      expect(message).not.toContain(secret);
      expect(message).not.toContain('test-access-key-id');
    });

    it('points at where the values come from', () => {
      expect(() => validateStorageEnv(withEnv({ STORAGE_BUCKET: '' }))).toThrow(
        /\.env\.example/,
      );
    });
  });
});
