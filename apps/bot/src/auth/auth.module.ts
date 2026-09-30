import { Module } from '@nestjs/common';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { PrismaModule } from '../prisma/prisma.module';
import { UploadController } from './upload.controller';

@Module({
  imports: [PrismaModule],
  controllers: [AuthController, UploadController],
  providers: [AuthService],
  exports: [AuthService],
})
export class AuthModule {}