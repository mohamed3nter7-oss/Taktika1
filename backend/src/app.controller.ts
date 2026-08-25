import { Controller, Get } from '@nestjs/common';
import { AppService } from './app.service';
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
}