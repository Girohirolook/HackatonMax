import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Bot, Keyboard } from '@maxhub/max-bot-api';
import { PrismaService } from '../prisma/prisma.service';
import type { IncomingMessage, ServerResponse } from 'node:http';

export type WebhookRoute = {
  path: string;
  handler: (req: IncomingMessage, res: ServerResponse) => void;
};

@Injectable()
export class MaxBotAdapter {
  private readonly logger = new Logger(MaxBotAdapter.name);
  private bot!: Bot;
  private botUsername: string | null = null;   // ← добавить эту строку


  constructor(
    private readonly config: ConfigService,
    private readonly prisma: PrismaService,
  ) {}

  /** Username бота для формирования диплинков */
  getBotUsername(): string | null {
    return this.botUsername;
  }

  /** Публичный доступ к bot для отправки сообщений из других сервисов */
  getBot(): Bot {
    return this.bot;
  }

    /** Ссылка для открытия мини-приложения */
  private getMiniAppUrl(): string | null {
    if (this.botUsername) {
      return `https://max.ru/${this.botUsername}?startapp`;
    }
    const webappUrl = this.config.get<string>('WEBAPP_URL');
    return webappUrl || null;
  }

  /** Приветственное сообщение с кнопкой открытия мини-приложения */
  private async sendWelcomeMessage(ctx: any) {
    const text =
      'Привет! Я помогаю находить волонтёрские мероприятия и управлять ими. ' +
      'Нажмите кнопку ниже, чтобы открыть приложение.';
    const url = this.getMiniAppUrl();

    if (url) {
      // 1) Кнопка открытия мини-приложения
      try {
        await ctx.reply(text, {
          attachments: [
            Keyboard.inlineKeyboard([
              [Keyboard.button.openApp('Открыть приложение', url)],
            ]),
          ],
        });
        return;
      } catch (e: any) {
        this.logger.warn(
          `open_app отклонён: ${e?.message ?? e}; пробую link-кнопку`,
        );
      }

      // 2) Фолбэк: обычная ссылка
      try {
        await ctx.reply(text, {
          attachments: [
            Keyboard.inlineKeyboard([
              [Keyboard.button.link('Открыть приложение', url)],
            ]),
          ],
        });
        return;
      } catch (e: any) {
        this.logger.warn(
          `link-кнопка отклонена: ${e?.message ?? e}; шлю без кнопки`,
        );
      }
    }

    // 3) Финальный фолбэк: просто текст
    await ctx.reply(text);
  }

  /**
   * Создаёт бота, регистрирует обработчики событий
   * и регистрирует webhook-подписку в MAX.
   */
  async startWebhook(): Promise<WebhookRoute> {
    const token = this.config.getOrThrow<string>('BOT_TOKEN');
    const domain = this.config.getOrThrow<string>('WEBHOOK_DOMAIN');
    const secret = this.config.get<string>('WEBHOOK_SECRET') || undefined;
    const path = '/bot/webhook';

    this.bot = new Bot(token);

    try {
      const botInfo = await this.bot.api.getMyInfo();
      this.botUsername = botInfo.username ?? null;
      this.logger.log(`Bot username: @${this.botUsername}`);
    } catch (e: any) {
      this.logger.warn(`Не удалось получить bot username: ${e?.message || e}`);
    }

    this.bot.catch((err) =>
      this.logger.error(`Ошибка в обработчике: ${String(err)}`),
    );

    // Сохраняем chat_id при любом событии от пользователя
    const saveChatId = async (ctx: any) => {
      try {
        const userId = ctx?.user?.user_id ?? ctx?.from?.user_id;
        const chatId = ctx?.chat?.chat_id;
        if (!userId || chatId === undefined) return;
        await this.prisma.user.updateMany({
          where: { maxBridgeId: String(userId) },
          data: { maxChatId: BigInt(chatId) },
        });
      } catch (e) {
        this.logger.warn(`Не удалось сохранить maxChatId: ${String(e)}`);
      }
    };

    this.bot.on('bot_started', async (ctx) => {
      await saveChatId(ctx);
      await this.sendWelcomeMessage(ctx);
    });

    this.bot.on('message_created', async (ctx) => {
      await saveChatId(ctx);
      await this.sendWelcomeMessage(ctx);
    });

    const handler = await this.bot.createWebhook({
      domain,
      path,
      secret,
      allowedUpdates: ['message_created', 'bot_started'],
    });

    this.logger.log(`Webhook зарегистрирован: ${domain}${path}`);
    return { path, handler };
  }
}


