import { Body, Controller, HttpCode, HttpStatus, Post } from '@nestjs/common';
import { DadataService } from './dadata.service';
import { AuthService } from '../auth/auth.service';

@Controller('api/dadata')
export class DadataController {
  constructor(
    private readonly dadata: DadataService,
    private readonly authService: AuthService,
  ) {}

  @Post('suggest')
  @HttpCode(HttpStatus.OK)
  async suggest(
    @Body('initData') initData: string,
    @Body('query') query: string,
  ) {
    this.authService.validateInitData(initData);
    return this.dadata.suggest(query ?? '');
  }

  @Post('clean')
  @HttpCode(HttpStatus.OK)
  async clean(
    @Body('initData') initData: string,
    @Body('address') address: string,
  ) {
    this.authService.validateInitData(initData);
    return this.dadata.clean(address ?? '');
  }
}