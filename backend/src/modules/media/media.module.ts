import { Module } from '@nestjs/common';
import { StorageService } from './storage.service';

/**
 * Media: the object-storage seam, and for now nothing else.
 *
 * No controller — this step is connection plumbing only. Upload endpoints,
 * `sharp` processing and the `posts` integration are separate changes, and
 * `posts` is not built (§7). `StorageService` is exported so that when they
 * land they inject it rather than constructing a second S3 client.
 */
@Module({
  providers: [StorageService],
  exports: [StorageService],
})
export class MediaModule {}
