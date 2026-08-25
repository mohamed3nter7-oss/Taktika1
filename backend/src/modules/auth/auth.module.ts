import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { ReferenceModule } from '../reference/reference.module';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { JwtStrategy } from './strategies/jwt.strategy';

@Module({
  imports: [
    // §3: registration validates city-in-country through the module that owns
    // those tables, rather than querying `cities` here.
    ReferenceModule,
    // `session: false` — the refresh-token family IS the session, and a
    // server-side session store would be a second source of truth.
    PassportModule.register({ defaultStrategy: 'jwt', session: false }),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        // Access tokens only. Email-verification tokens are signed per-call
        // with EMAIL_VERIFICATION_SECRET so neither can be replayed as the
        // other. `getOrThrow` fails the boot rather than starting with an
        // undefined signing key.
        secret: config.getOrThrow<string>('JWT_SECRET'),
      }),
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService, JwtStrategy],
  exports: [AuthService],
})
export class AuthModule {}
