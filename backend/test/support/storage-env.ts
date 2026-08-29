/**
 * Dummy STORAGE_* values for the e2e suite, applied before ConfigModule runs.
 *
 * The boot-time validator in `media/storage.config.ts` is NOT relaxed or
 * skipped under NODE_ENV=test: a suite that boots a differently-configured app
 * is testing a different app. So the suite supplies values that satisfy it.
 *
 * Set UNCONDITIONALLY, overriding whatever is in a developer's `.env`. dotenv
 * never overwrites an existing process.env entry, so assigning here wins — and
 * that is the point: every environment, laptop and CI alike, boots the same
 * configuration. No e2e test touches object storage, and `GET /health` makes
 * no network call, so dummy credentials are sufficient.
 *
 * The one route these values would defeat is `GET /health/ready`, which would
 * report `storage.ok: false`. Any future e2e test for that route must supply
 * real credentials itself rather than loosening this file.
 */
process.env.STORAGE_ENDPOINT = 'https://e2e.storage.example.test/storage/v1/s3';
process.env.STORAGE_REGION = 'eu-west-1';
process.env.STORAGE_ACCESS_KEY_ID = 'e2e-access-key-id';
process.env.STORAGE_SECRET_ACCESS_KEY = 'e2e-secret-access-key';
process.env.STORAGE_BUCKET = 'media';
process.env.STORAGE_PUBLIC_BASE_URL =
  'https://e2e.example.test/storage/v1/object/public/media';
process.env.STORAGE_FORCE_PATH_STYLE = 'true';
