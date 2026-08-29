import { Controller, Get } from '@nestjs/common';
import { AppService, type ReadinessReport } from './app.service';
import { Public } from './common/decorators/public.decorator';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  // JwtAuthGuard is global (§9), so even the root route has to opt out.
  @Public()
  @Get()
  getHello(): string {
    return this.appService.getHello();
  }

  /**
   * LIVENESS — "is this process alive". Makes no network call of any kind: no
   * database, no storage, no config read. This is the route the platform
   * polls.
   *
   * The split from readiness is load-bearing, not tidiness. A liveness probe
   * that calls HeadBucket makes "is this container alive" depend on "is
   * Supabase alive", so a provider blip is scored as a dead container and
   * restarts a perfectly healthy process — turning a dependency outage into an
   * availability outage, and a sustained one into a restart loop. Nothing that
   * can fail for an external reason may ever be added to this handler.
   */
  @Public()
  @Get('health')
  getLiveness(): { status: 'ok' } {
    return { status: 'ok' };
  }

  /**
   * READINESS — "can this process serve traffic". Probes the database and the
   * object store. Not polled by the platform.
   *
   * The body carries booleans and latencies and nothing else: no version, no
   * bucket name, no endpoint, no SDK error text. A health endpoint is
   * unauthenticated by necessity, which makes it the cheapest reconnaissance
   * surface in the application.
   */
  @Public()
  @Get('health/ready')
  getReadiness(): Promise<ReadinessReport> {
    return this.appService.checkReadiness();
  }
}
