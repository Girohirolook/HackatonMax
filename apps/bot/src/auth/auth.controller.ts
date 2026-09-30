import { Body, Controller, HttpCode, HttpStatus, Patch, Post } from '@nestjs/common';
import { AuthService } from './auth.service';
import type { RegisterDto } from './dto/register.dto';
import type { UpdateProfileDto } from './dto/update-profile.dto';

@Controller('api/auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('check')
  @HttpCode(HttpStatus.OK)
  async check(@Body('initData') initData: string) {
    return this.authService.checkUser(initData);
  }

  @Post('register')
  @HttpCode(HttpStatus.CREATED)
  async register(@Body('initData') initData: string, @Body() dto: RegisterDto) {
    return this.authService.register(initData, dto);
  }

  @Patch('profile')
  @HttpCode(HttpStatus.OK)
  async updateProfile(
    @Body('initData') initData: string,
    @Body() dto: UpdateProfileDto,
  ) {
    return this.authService.updateProfile(initData, dto);
  }

  @Post('verify-contact')
  @HttpCode(HttpStatus.OK)
  async verifyContact(
    @Body('initData') initData: string,
    @Body('phone') phone: string,
  ) {
    return this.authService.verifyContact(initData, phone);
  }
}