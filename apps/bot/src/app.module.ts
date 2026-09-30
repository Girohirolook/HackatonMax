import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { PrismaModule } from './prisma/prisma.module';
import { BotModule } from './bot/bot.module'; // <-- проверьте этот импорт
import { AuthModule } from './auth/auth.module';
import { EventsModule } from './events/events.module';
import { DadataModule } from './dadata/dadata.module';



@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
    BotModule, // <-- добавьте BotModule в массив imports
    AuthModule, // ← добавили
    EventsModule, // ← добавить
    DadataModule
  ],
  controllers: [AppController],
})
export class AppModule {}