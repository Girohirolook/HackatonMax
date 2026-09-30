import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { MaxBotAdapter } from './bot/max-bot.adapter';
import { join } from 'node:path';


async function bootstrap() {
  const app = await NestFactory.create(AppModule);


  app.enableCors({
    origin: true,
    credentials: true,
  });

  
  // Поднимаем webhook MAX внутри нашего NestJS-сервера
  try {
    const adapter = app.get(MaxBotAdapter);
    const { path, handler } = await adapter.startWebhook();

    app.use((req: any, res: any, next: any) => {
      if ((req.url ?? '').split('?')[0] === path) {
        return handler(req, res);
      }
      return next();
    });
  } catch (error) {
    console.error('Не удалось поднять webhook:', error);
  }
  
  
  await app.listen(process.env.PORT ?? 3000);
  console.log(`Server started on port ${process.env.PORT ?? 3000}`);
}
bootstrap();