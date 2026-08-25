import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Req,
  Res,
} from '@nestjs/common';
import { ApiCookieAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import type { CookieOptions, Request, Response } from 'express';
import { AllowIncompleteProfile } from '../../common/decorators/allow-incomplete-profile.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Public } from '../../common/decorators/public.decorator';
import type { AuthenticatedUser } from '../../common/types/authenticated-user';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { VerifyEmailDto } from './dto/verify-email.dto';

const REFRESH_COOKIE = 'refresh_token';

/**
 * CLAUDE.md §9, exactly. Every attribute here is load-bearing:
 *
 * - `httpOnly` keeps the token out of reach of any script, so an XSS cannot
 *   lift a 30-day credential.
 * - `secure` is unconditional. Browsers exempt `http://localhost`, so local
 *   dev through the Next.js proxy still works without weakening it.
 * - `sameSite: 'strict'` is why API and frontend must share a site
 *   (`api.kooora.com` + `kooora.com`). A missing cookie in staging is a DOMAIN
 *   problem — §9 forbids "fixing" it by loosening this.
 * - `path` scopes the cookie to the auth routes, so it is not attached to
 *   every unrelated API call.
 */
const REFRESH_COOKIE_OPTIONS: CookieOptions = {
  httpOnly: true,
  secure: true,
  sameSite: 'strict',
  path: '/api/v1/auth',
};

const REFRESH_COOKIE_MAX_AGE = 30 * 24 * 60 * 60 * 1000; // 30 days

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  @Public()
  // §9: explicitly tighter than the 100/min global default. Registration is
  // expensive (bcrypt cost 12) and is the cheapest thing to abuse.
  @Throttle({ default: { limit: 5, ttl: 60 * 60 * 1000 } })
  @ApiOperation({
    summary:
      'Register a new user in PENDING_VERIFICATION and send a verification email.',
  })
  register(@Body() dto: RegisterDto) {
    return this.authService.register(dto);
  }

  /**
   * `@Public()` because the credential IS the emailed token — someone clicking
   * a link from their inbox has no access token, and before verifying they are
   * PENDING_VERIFICATION rather than PENDING_PROFILE.
   */
  @Post('verify-email')
  @Public()
  @AllowIncompleteProfile()
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 10, ttl: 60 * 60 * 1000 } })
  @ApiOperation({
    summary: 'Verify an email address, moving the user to PENDING_PROFILE.',
  })
  verifyEmail(@Body() dto: VerifyEmailDto) {
    return this.authService.verifyEmail(dto.token);
  }

  @Post('login')
  @Public()
  @HttpCode(HttpStatus.OK)
  // Two windows: a burst cap and a sustained cap, so slow credential stuffing
  // is throttled as hard as a fast attempt.
  @Throttle({
    default: { limit: 5, ttl: 60 * 1000 },
    sustained: { limit: 20, ttl: 60 * 60 * 1000 },
  })
  @ApiOperation({
    summary:
      'Exchange credentials for an access token (body) and a refresh token (httpOnly cookie).',
  })
  async login(
    @Body() dto: LoginDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const { refreshToken, ...session } = await this.authService.login(
      dto,
      req.get('user-agent'),
    );

    this.setRefreshCookie(res, refreshToken);
    return session;
  }

  /**
   * The refresh token is read from the cookie and NEVER from the body — a
   * body-accepting variant would be a second, weaker path to the most
   * sensitive credential in the system. That is why there is no RefreshDto.
   */
  @Post('refresh')
  @Public()
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 30, ttl: 15 * 60 * 1000 } })
  @ApiCookieAuth(REFRESH_COOKIE)
  @ApiOperation({
    summary: 'Rotate the refresh token and issue a fresh access token.',
  })
  async refresh(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const { refreshToken, ...session } = await this.authService.refresh(
      this.readRefreshCookie(req),
      req.get('user-agent'),
    );

    this.setRefreshCookie(res, refreshToken);
    return session;
  }

  @Post('logout')
  @AllowIncompleteProfile()
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiCookieAuth(REFRESH_COOKIE)
  @ApiOperation({ summary: "Revoke the caller's entire refresh-token family." })
  async logout(
    @CurrentUser() user: AuthenticatedUser,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ): Promise<void> {
    await this.authService.logout(this.readRefreshCookie(req), user.sub);

    // Cleared with the same attributes it was set with — a mismatched path
    // leaves the original cookie in place.
    res.clearCookie(REFRESH_COOKIE, REFRESH_COOKIE_OPTIONS);
  }

  @Get('me')
  @AllowIncompleteProfile()
  @ApiOperation({
    summary:
      "The caller's own record. The only endpoint that returns their email.",
  })
  me(@CurrentUser() user: AuthenticatedUser) {
    // Identity comes from the verified token, never from a path or query
    // parameter (§9) — there is no way to ask for someone else's record here.
    return this.authService.me(user.sub);
  }

  // ===========================================================================
  // Cookie handling lives here, in the controller — never in the service.
  // ===========================================================================

  private setRefreshCookie(res: Response, token: string): void {
    res.cookie(REFRESH_COOKIE, token, {
      ...REFRESH_COOKIE_OPTIONS,
      maxAge: REFRESH_COOKIE_MAX_AGE,
    });
  }

  private readRefreshCookie(req: Request): string | undefined {
    const cookies = req.cookies as Record<string, string> | undefined;
    return cookies?.[REFRESH_COOKIE];
  }
}
