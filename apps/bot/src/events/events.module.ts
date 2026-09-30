import { Module } from '@nestjs/common';
import { EventsController } from './events.controller';
import { EventsService } from './events.service';
import { PrismaModule } from '../prisma/prisma.module';
import { AuthModule } from '../auth/auth.module';
import { MaxMessengerService } from './max-messenger.service';
import { BotModule } from '../bot/bot.module';

@Module({
  imports: [PrismaModule, AuthModule, BotModule],
  controllers: [EventsController],
  providers: [EventsService, MaxMessengerService],
})
export class EventsModule {}