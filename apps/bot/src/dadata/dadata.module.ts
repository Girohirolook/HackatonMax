import { Module } from '@nestjs/common';
import { DadataController } from './dadata.controller';
import { DadataService } from './dadata.service';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [AuthModule],
  controllers: [DadataController],
  providers: [DadataService],
})
export class DadataModule {}