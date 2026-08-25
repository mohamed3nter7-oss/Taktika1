import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_FILTER, APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter';
import { ProfileCompleteGuard } from './common/guards/profile-complete.guard';
import { CorrelationIdInterceptor } from './common/interceptors/correlation-id.interceptor';
import { PrismaModule } from './common/prisma/prisma.module';
import { AuthModule } from './modules/auth/auth.module';
import { JwtAuthGuard } from './modules/auth/guards/jwt-auth.guard';
import { CareerModule } from './modules/career/career.module';
import { ProfilesModule } from './modules/profiles/profiles.module';
import { ReferenceModule } from './modules/reference/reference.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, cache: true }),
    // Two named windows so a route can cap bursts and sustained volume
    // independently. Auth routes override both (§9); everything else inherits.
    // In-memory storage is correct for a single instance — the day a second
    // one appears is the day to swap in the Redis storage provider.
    ThrottlerModule.forRoot([
      { name: 'default', ttl: 60 * 1000, limit: 100 },
      { name: 'sustained', ttl: 60 * 60 * 1000, limit: 1000 },
    ]),
    PrismaModule,
    AuthModule,
    ReferenceModule,
    ProfilesModule,
    CareerModule,
  ],
  controllers: [AppController],
  providers: [
    { provide: APP_FILTER, useClass: AllExceptionsFilter },
    { provide: APP_INTERCEPTOR, useClass: CorrelationIdInterceptor },

    // Global guards run in registration order, and the sequence is deliberate:
    //   1. Throttle first, so a flood is rejected before it costs anything.
    //   2. Authenticate — attaches req.user from the verified token (§9).
    //   3. Gate on profile completeness, reading the status step 2 attached.
    { provide: APP_GUARD, useClass: ThrottlerGuard },
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: ProfileCompleteGuard },

    AppService,
  ],
})
export class AppModule {}
