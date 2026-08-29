import type { ConfigService } from '@nestjs/config';
import { plainToInstance } from 'class-transformer';
import {
  IsIn,
  IsNotEmpty,
  IsString,
  IsUrl,
  validateSync,
} from 'class-validator';

/**
 * The object-storage env contract.
 *
 * Every name is `STORAGE_*` — named by ROLE, never by vendor. Supabase Storage
 * is the development provider and Cloudflare R2 is the launch provider; both
 * speak S3 with SigV4, so the migration is a change to these seven VALUES and
 * to nothing else. A `SUPABASE_*` name would make it a change to every file
 * that reads one.
 *
 * Validated at boot (see `validateStorageEnv`) because the alternative is a
 * misconfiguration that stays invisible until the first upload fails, three
 * weeks after the deploy that caused it.
 */
export class StorageEnv {
  /**
   * The S3 API endpoint. Supabase and R2 put this on a DIFFERENT hostname from
   * the public read URL below — see `STORAGE_PUBLIC_BASE_URL`.
   */
  @IsUrl({
    protocols: ['http', 'https'],
    require_protocol: true,
    require_tld: false,
  })
  STORAGE_ENDPOINT!: string;

  @IsString()
  @IsNotEmpty()
  STORAGE_REGION!: string;

  @IsString()
  @IsNotEmpty()
  STORAGE_ACCESS_KEY_ID!: string;

  @IsString()
  @IsNotEmpty()
  STORAGE_SECRET_ACCESS_KEY!: string;

  @IsString()
  @IsNotEmpty()
  STORAGE_BUCKET!: string;

  /**
   * The public read base. On Supabase this is `<ref>.supabase.co/...`, while
   * the S3 endpoint is `<ref>.storage.supabase.co/...` — same project ref,
   * different hostname. Copy-pasting one into the other produces a config
   * where `put()` succeeds and every public fetch 404s, which reads exactly
   * like a private bucket and sends debugging in the wrong direction.
   */
  @IsUrl({
    protocols: ['http', 'https'],
    require_protocol: true,
    require_tld: false,
  })
  STORAGE_PUBLIC_BASE_URL!: string;

  /** Required by Supabase, harmless on R2. Stringly-typed: this is env. */
  @IsIn(['true', 'false'])
  STORAGE_FORCE_PATH_STYLE!: string;
}

/**
 * `ConfigModule.forRoot({ validate })`. Refuses to start the process on a
 * missing or malformed storage value.
 *
 * Scope, deliberately: this validates the `STORAGE_*` subset and returns the
 * ORIGINAL config object. `validate` receives all of `process.env`, so
 * `whitelist: true` would strip `DATABASE_URL`, `JWT_SECRET`, `THROTTLE_SKIP`
 * and every OS variable from the returned config — the standard NestJS recipe
 * returns the validated instance and is only safe when the class enumerates
 * every variable the application has. This one does not, and must not pretend
 * to: enumerating the rest belongs to whichever change owns them.
 */
export function validateStorageEnv(
  config: Record<string, unknown>,
): Record<string, unknown> {
  const parsed = plainToInstance(StorageEnv, config);
  const errors = validateSync(parsed, { skipMissingProperties: false });

  if (errors.length > 0) {
    // class-validator messages name the property and the constraint, never the
    // value — so this cannot print a secret into a crash log.
    const detail = errors
      .map(
        (error) =>
          `  ${error.property}: ${Object.values(error.constraints ?? {}).join('; ')}`,
      )
      .join('\n');

    throw new Error(
      `Invalid storage configuration — refusing to start.\n${detail}\n` +
        'See backend/.env.example for where each value comes from.',
    );
  }

  return config;
}

/** The seven values, typed, read once. */
export interface StorageConfig {
  readonly endpoint: string;
  readonly region: string;
  readonly accessKeyId: string;
  readonly secretAccessKey: string;
  readonly bucket: string;
  /** Never has a trailing slash — normalised here so `publicUrl` cannot double up. */
  readonly publicBaseUrl: string;
  readonly forcePathStyle: boolean;
}

function required(config: ConfigService, key: string): string {
  const value = config.get<string>(key);
  if (value === undefined || value === '') {
    // Unreachable when `validateStorageEnv` is wired into ConfigModule. Kept
    // because a test that builds StorageService against a hand-rolled
    // ConfigService would otherwise thread `undefined` into the S3 client and
    // fail much later, somewhere else.
    throw new Error(`Missing storage configuration: ${key}`);
  }
  return value;
}

export function loadStorageConfig(config: ConfigService): StorageConfig {
  return {
    endpoint: required(config, 'STORAGE_ENDPOINT'),
    region: required(config, 'STORAGE_REGION'),
    accessKeyId: required(config, 'STORAGE_ACCESS_KEY_ID'),
    secretAccessKey: required(config, 'STORAGE_SECRET_ACCESS_KEY'),
    bucket: required(config, 'STORAGE_BUCKET'),
    publicBaseUrl: required(config, 'STORAGE_PUBLIC_BASE_URL').replace(
      /\/+$/,
      '',
    ),
    forcePathStyle: required(config, 'STORAGE_FORCE_PATH_STYLE') === 'true',
  };
}
