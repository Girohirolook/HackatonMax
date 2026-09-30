import { Controller, Get } from '@nestjs/common';

@Controller('api')
export class AppController {
  @Get('health')
  async health() {
    return { status: 'ok' };
  }
}