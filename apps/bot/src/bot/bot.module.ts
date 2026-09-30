import { Module } from '@nestjs/common';
import { MaxBotAdapter } from './max-bot.adapter';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  providers: [MaxBotAdapter],
  exports: [MaxBotAdapter],
})
export class BotModule {}