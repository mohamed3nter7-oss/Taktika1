import { InternalServerErrorException, Logger } from '@nestjs/common';
import type { ConfigService } from '@nestjs/config';
import { ErrorCode } from '../../common/errors/error-codes';
import { StorageService } from './storage.service';

const ENV: Record<string, string> = {
  STORAGE_ENDPOINT: 'https://example.storage.supabase.co/storage/v1/s3',
  STORAGE_REGION: 'eu-west-1',
  STORAGE_ACCESS_KEY_ID: 'test-access-key-id',
  STORAGE_SECRET_ACCESS_KEY: 'test-secret-access-key',
  STORAGE_BUCKET: 'media',
  STORAGE_PUBLIC_BASE_URL:
    'https://example.supabase.co/storage/v1/object/public/media',
  STORAGE_FORCE_PATH_STYLE: 'true',
};

function configService(overrides: Record<string, string> = {}): ConfigService {
  const values = { ...ENV, ...overrides };
  return {
    get: (key: string): string | undefined => values[key],
  } as unknown as ConfigService;
}

/**
 * Replaces the constructed S3Client's `send` with a spy, leaving the real
 * command classes in place — so `send.mock.calls[0][0].input` is the exact
 * object the SDK would have signed and sent.
 */
function mockClient(service: StorageService): jest.Mock {
  const send = jest.fn();
  (service as unknown as { client: { send: jest.Mock } }).client = { send };
  return send;
}

/** An error shaped the way the AWS SDK shapes one. */
function sdkError(
  name: string,
  message: string,
  httpStatusCode: number,
): Error {
  const error = new Error(message);
  error.name = name;
  Object.assign(error, { $metadata: { httpStatusCode } });
  return error;
}

/** `send.mock.calls` is typed `any` by jest; narrow it once, here. */
function firstCommandInput(send: jest.Mock): Record<string, unknown> {
  const calls = send.mock.calls as Array<[{ input: Record<string, unknown> }]>;
  return calls[0][0].input;
}

function firstLogLine(spy: jest.SpyInstance): string {
  const calls = spy.mock.calls as unknown[][];
  return String(calls[0][0]);
}

describe('StorageService', () => {
  let errorLog: jest.SpyInstance;

  beforeEach(() => {
    errorLog = jest
      .spyOn(Logger.prototype, 'error')
      .mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('publicUrl', () => {
    it('joins the base and the key with exactly one slash', () => {
      const service = new StorageService(configService());

      expect(service.publicUrl('posts/abc/def.webp')).toBe(
        'https://example.supabase.co/storage/v1/object/public/media/posts/abc/def.webp',
      );
    });

    it('does not double-slash when the base has a trailing slash', () => {
      const service = new StorageService(
        configService({
          STORAGE_PUBLIC_BASE_URL:
            'https://example.supabase.co/storage/v1/object/public/media/',
        }),
      );

      const url = service.publicUrl('posts/abc/def.webp');

      expect(url).toBe(
        'https://example.supabase.co/storage/v1/object/public/media/posts/abc/def.webp',
      );
      // Asserted independently of the exact string above: the scheme's `//` is
      // the only doubled slash a correct URL may contain.
      expect(url.slice('https://'.length)).not.toContain('//');
    });

    it('does not double-slash when the key has a leading slash', () => {
      const service = new StorageService(configService());

      const url = service.publicUrl('/posts/abc/def.webp');

      expect(url).toBe(
        'https://example.supabase.co/storage/v1/object/public/media/posts/abc/def.webp',
      );
      expect(url.slice('https://'.length)).not.toContain('//');
    });
  });

  describe('put', () => {
    it('sets the immutable CacheControl header', async () => {
      const service = new StorageService(configService());
      const send = mockClient(service);
      send.mockResolvedValue({});

      await service.put('posts/abc.webp', Buffer.from('bytes'), 'image/webp');

      const input = firstCommandInput(send);
      expect(input.CacheControl).toBe('public, max-age=31536000, immutable');
      expect(input.Bucket).toBe('media');
      expect(input.Key).toBe('posts/abc.webp');
      expect(input.ContentType).toBe('image/webp');
    });
  });

  describe('SDK error translation', () => {
    it('turns an SDK failure into INTERNAL_ERROR and never leaks the AWS message', async () => {
      const service = new StorageService(configService());
      const send = mockClient(service);
      const raw = sdkError(
        'AccessDenied',
        'Access Denied for bucket media with key AKIAIOSFODNN7EXAMPLE at https://example.storage.supabase.co',
        403,
      );
      send.mockRejectedValue(raw);

      const thrown: unknown = await service
        .put('posts/abc.webp', Buffer.from('bytes'), 'image/webp')
        .then(
          () => undefined,
          (error: unknown) => error,
        );

      expect(thrown).toBeInstanceOf(InternalServerErrorException);
      const body = (thrown as InternalServerErrorException).getResponse();
      expect(body).toEqual({
        code: ErrorCode.INTERNAL_ERROR,
        message: 'An unexpected error occurred.',
      });

      // The whole point: nothing the SDK said reaches the client.
      const serialised = JSON.stringify(body);
      expect(serialised).not.toContain('Access Denied');
      expect(serialised).not.toContain('AKIAIOSFODNN7EXAMPLE');
      expect(serialised).not.toContain('media');
      expect(serialised).not.toContain('supabase');

      // And the log line carries the diagnosis without the secrets.
      const logged = firstLogLine(errorLog);
      expect(logged).toContain('AccessDenied');
      expect(logged).toContain('403');
      expect(logged).toContain('posts/abc.webp');
      expect(logged).not.toContain('test-secret-access-key');
      expect(logged).not.toContain('test-access-key-id');
      expect(logged).not.toContain('supabase');
    });
  });

  describe('exists', () => {
    it('returns true when the object is there', async () => {
      const service = new StorageService(configService());
      mockClient(service).mockResolvedValue({});

      await expect(service.exists('posts/abc.webp')).resolves.toBe(true);
    });

    it('returns false on NotFound', async () => {
      const service = new StorageService(configService());
      mockClient(service).mockRejectedValue(
        sdkError('NotFound', 'Not Found', 404),
      );

      await expect(service.exists('posts/abc.webp')).resolves.toBe(false);
    });

    it('throws INTERNAL_ERROR on 403 — a credentials failure is not an absent object', async () => {
      const service = new StorageService(configService());
      mockClient(service).mockRejectedValue(
        sdkError('AccessDenied', 'Access Denied', 403),
      );

      await expect(service.exists('posts/abc.webp')).rejects.toBeInstanceOf(
        InternalServerErrorException,
      );
    });
  });
});
