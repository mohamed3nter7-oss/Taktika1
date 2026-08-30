import {
  DeleteObjectCommand,
  HeadBucketCommand,
  HeadObjectCommand,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import {
  Injectable,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ErrorCode } from '../../common/errors/error-codes';
import { loadStorageConfig, type StorageConfig } from './storage.config';

/**
 * One year, immutable.
 *
 * This is safe ONLY because object keys are UUID-based and are never reused.
 * `put()` overwrites an existing key silently — S3 has no create-if-absent —
 * and at `max-age=31536000` an overwritten key serves the STALE bytes from
 * every browser and CDN cache for a year, with no purge path in v1. Whatever
 * generates a key must therefore generate a fresh UUID per object, and must
 * never derive one from a user id, a filename, or a content hash.
 */
const IMMUTABLE_CACHE_CONTROL = 'public, max-age=31536000, immutable';

/** `$metadata.httpStatusCode`, read without widening the error to `any`. */
function httpStatusOf(error: unknown): number | undefined {
  if (typeof error !== 'object' || error === null) return undefined;
  return (error as { $metadata?: { httpStatusCode?: number } }).$metadata
    ?.httpStatusCode;
}

/**
 * The system-level failure code — `ENOTFOUND`, `ECONNREFUSED`, `ETIMEDOUT`.
 *
 * It lives on the error ITSELF, not on `error.cause`. Verified against this SDK
 * and Node 24: a DNS failure arrives as a plain `Error` with own properties
 * `errno, code, syscall, hostname, $metadata` and `cause === undefined` — the
 * SDK attaches `$metadata` to the underlying Node error rather than wrapping
 * it. Reading `cause.code` would therefore have been permanently undefined.
 *
 * This is the field that makes a network failure diagnosable. Without it the
 * log line for an unreachable endpoint reads `[name=Error] [status=n/a]`, which
 * says only that something went wrong. Service errors (AccessDenied,
 * NoSuchBucket) carry their identity on `name` instead and leave this
 * undefined, so both are logged.
 */
function systemCodeOf(error: unknown): string | undefined {
  if (typeof error !== 'object' || error === null) return undefined;
  const code = (error as { code?: unknown }).code;
  return typeof code === 'string' ? code : undefined;
}

/**
 * A missing object, and ONLY a missing object.
 *
 * Deliberately does not treat 403 as absence. A bad access key, an expired
 * secret or a bucket policy change all produce 403 on HeadObject, and reading
 * that as "the object is not there" would turn a total credentials outage into
 * a silent, plausible-looking empty result — the caller would re-upload, or
 * report the image as deleted, and nothing would ever surface the real fault.
 */
function isNotFound(error: unknown): boolean {
  const name = error instanceof Error ? error.name : undefined;
  return (
    name === 'NotFound' || name === 'NoSuchKey' || httpStatusOf(error) === 404
  );
}

/**
 * The object-storage seam (§17 D-021).
 *
 * ONE implementation, swapped by configuration — not an interface with a
 * Supabase class and an R2 class. Both providers speak S3 with SigV4, so a
 * second class would implement the same calls against the same SDK and buy
 * nothing but a file (§4). The provider lives entirely in `STORAGE_*`.
 *
 * The surface is four methods and stays four methods. In particular there is
 * no presigned-URL method: v1 uploads proxy through the server so `sharp` can
 * strip EXIF, and a client that PUTs straight to the bucket bypasses that
 * strip. Root §5 treats EXIF removal as a hard privacy guarantee for minors,
 * not a best-effort one.
 */
@Injectable()
export class StorageService {
  private readonly logger = new Logger(StorageService.name);
  private readonly config: StorageConfig;
  private readonly client: S3Client;

  constructor(configService: ConfigService) {
    this.config = loadStorageConfig(configService);
    this.client = new S3Client({
      region: this.config.region,
      endpoint: this.config.endpoint,
      // Required by Supabase, harmless on R2. Without it the SDK rewrites the
      // request to a virtual-hosted `<bucket>.<endpoint>` name that resolves
      // nowhere.
      forcePathStyle: this.config.forcePathStyle,
      credentials: {
        accessKeyId: this.config.accessKeyId,
        secretAccessKey: this.config.secretAccessKey,
      },
    });
  }

  async put(key: string, body: Buffer, contentType: string): Promise<void> {
    try {
      await this.client.send(
        new PutObjectCommand({
          Bucket: this.config.bucket,
          Key: key,
          Body: body,
          ContentType: contentType,
          CacheControl: IMMUTABLE_CACHE_CONTROL,
        }),
      );
    } catch (error) {
      this.fail('put', key, error);
    }
  }

  async delete(key: string): Promise<void> {
    try {
      await this.client.send(
        new DeleteObjectCommand({ Bucket: this.config.bucket, Key: key }),
      );
    } catch (error) {
      this.fail('delete', key, error);
    }
  }

  async exists(key: string): Promise<boolean> {
    try {
      await this.client.send(
        new HeadObjectCommand({ Bucket: this.config.bucket, Key: key }),
      );
      return true;
    } catch (error) {
      if (isNotFound(error)) return false;
      this.fail('exists', key, error);
    }
  }

  /**
   * Readiness probe only. Throws the mapped INTERNAL_ERROR like everything
   * else here; `AppService` catches it and reports a boolean, so a storage
   * outage never becomes an HTTP failure. Never called on the liveness route.
   */
  async headBucket(): Promise<void> {
    try {
      await this.client.send(
        new HeadBucketCommand({ Bucket: this.config.bucket }),
      );
    } catch (error) {
      this.fail('headBucket', undefined, error);
    }
  }

  /**
   * The ONLY place a public URL is derived.
   *
   * `post_images.key` stores the object key and never the URL
   * (`schema.prisma`, `model PostImage`), so this one line is the entire R2
   * migration surface for reads: change `STORAGE_PUBLIC_BASE_URL` and every
   * stored row resolves against the new host with no backfill.
   *
   * The base has its trailing slash stripped in `loadStorageConfig` and any
   * leading slash on the key is stripped here, so the join cannot double up
   * from either side.
   */
  publicUrl(key: string): string {
    return `${this.config.publicBaseUrl}/${key.replace(/^\/+/, '')}`;
  }

  /**
   * Every SDK failure funnels through here. An AWS error never reaches a
   * client: its message can name the bucket, the endpoint and the access key
   * id, and its `Code` distinguishes "no such key" from "access denied", which
   * is an existence oracle of exactly the kind root §5 forbids.
   *
   * The correlation id is NOT on this line. `StorageService` is a singleton
   * with no request context, and building an AsyncLocalStorage seam for it is
   * its own change. `AllExceptionsFilter` logs the same request with `[cid=…]`
   * when this exception surfaces, so the two lines are adjacent in the log.
   *
   * Deliberately absent from the log: the endpoint, the bucket name and the
   * credentials.
   */
  private fail(
    operation: string,
    key: string | undefined,
    error: unknown,
  ): never {
    const name = error instanceof Error ? error.name : 'UnknownError';
    const status = httpStatusOf(error) ?? 'n/a';
    const code = systemCodeOf(error) ?? 'n/a';
    const target = key === undefined ? '' : ` [key=${key}]`;

    this.logger.error(
      `storage ${operation} failed [name=${name}] [code=${code}] ` +
        `[status=${status}]${target}`,
    );

    throw new InternalServerErrorException({
      code: ErrorCode.INTERNAL_ERROR,
      message: 'An unexpected error occurred.',
    });
  }
}
