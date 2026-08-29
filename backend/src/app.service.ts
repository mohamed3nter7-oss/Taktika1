import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from './common/prisma/prisma.service';
import { StorageService } from './modules/media/storage.service';

export interface ProbeResult {
  ok: boolean;
  latencyMs: number;
}

export interface ReadinessReport {
  status: 'ok' | 'degraded';
  database: ProbeResult;
  storage: ProbeResult;
}

@Injectable()
export class AppService {
  private readonly logger = new Logger(AppService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: StorageService,
  ) {}

  getHello(): string {
    return 'Hello World!';
  }

  /**
   * Readiness: every dependency the application cannot serve a request
   * without. Both probes run concurrently — serialising them would make a slow
   * database and a slow bucket add up rather than overlap.
   *
   * NEITHER probe can throw out of here, and the route always answers 200 with
   * `status: 'degraded'` rather than 503. That is a deliberate consequence of
   * this route not being polled by the platform: it is a diagnostic a human or
   * a dashboard reads, and a 503 would invite someone to wire it back into an
   * automated restart — which is the exact coupling the liveness/readiness
   * split exists to prevent. If an orchestrator ever consumes this, it reads
   * the booleans.
   */
  async checkReadiness(): Promise<ReadinessReport> {
    const [database, storage] = await Promise.all([
      this.probe('database', () => this.prisma.$queryRaw`SELECT 1`),
      this.probe('storage', () => this.storage.headBucket()),
    ]);

    return {
      status: database.ok && storage.ok ? 'ok' : 'degraded',
      database,
      storage,
    };
  }

  private async probe(
    name: string,
    run: () => Promise<unknown>,
  ): Promise<ProbeResult> {
    const startedAt = Date.now();
    try {
      await run();
      return { ok: true, latencyMs: Date.now() - startedAt };
    } catch (error) {
      // Swallowed on purpose: a probe REPORTS a dependency failure, it does
      // not become one. Only the error's class name is logged — StorageService
      // has already logged the SDK detail, and a Prisma error message can
      // carry the connection string.
      const reason = error instanceof Error ? error.name : 'UnknownError';
      this.logger.warn(
        `readiness probe failed [dependency=${name}] [name=${reason}]`,
      );
      return { ok: false, latencyMs: Date.now() - startedAt };
    }
  }
}
