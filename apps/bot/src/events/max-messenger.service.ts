import { Injectable, Logger } from '@nestjs/common';
import { Keyboard } from '@maxhub/max-bot-api';
import { MaxBotAdapter } from '../bot/max-bot.adapter';

interface MessageButton {
  text: string;
  url: string;
}

@Injectable()
export class MaxMessengerService {
  private readonly logger = new Logger(MaxMessengerService.name);

  constructor(private readonly adapter: MaxBotAdapter) {}

  /**
   * Личное сообщение пользователю MAX по user_id.
   * Каскад: кнопка «открыть мини-апп» -> обычная ссылка -> просто текст.
   * Возвращает true, если хотя бы одна попытка успешна.
   */
  async sendMessage(
    userId: number,
    text: string,
    button?: MessageButton,
  ): Promise<boolean> {
    const bot = this.adapter.getBot();
    if (!bot) {
      this.logger.warn('Отправка пропущена: бот ещё не инициализирован');
      return false;
    }

    if (button) {
      // 1) Кнопка открытия мини-приложения
      try {
        await bot.api.sendMessageToUser(userId, text, {
          attachments: [
            Keyboard.inlineKeyboard([
              [Keyboard.button.openApp(button.text, button.url)],
            ]),
          ],
        });
        this.logger.log(`sendMessage ok (open_app) для user ${userId}`);
        return true;
      } catch (e: any) {
        this.logger.warn(
          `open_app отклонён: ${e?.message ?? e}; пробую link-кнопку`,
        );
      }

      // 2) Фолбэк: обычная ссылка
      try {
        await bot.api.sendMessageToUser(userId, text, {
          attachments: [
            Keyboard.inlineKeyboard([
              [Keyboard.button.link(button.text, button.url)],
            ]),
          ],
        });
        this.logger.log(`sendMessage ok (link) для user ${userId}`);
        return true;
      } catch (e: any) {
        this.logger.warn(
          `link-кнопка отклонена: ${e?.message ?? e}; шлю без кнопки`,
        );
      }
    }

    // 3) Финальный фолбэк: просто текст
    try {
      await bot.api.sendMessageToUser(userId, text);
      this.logger.log(`sendMessage ok (без кнопки) для user ${userId}`);
      return true;
    } catch (e: any) {
      this.logger.error(`sendMessage failed: ${e?.message ?? e}`);
      return false;
    }
  }
}