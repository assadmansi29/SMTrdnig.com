import { EconomicEventRecord } from '../db/economicDb';
import {
  generateArabicReminderMessage,
  generateArabicLiveReleaseMessage,
  generateArabicTestMessage,
} from './arabicEconomicFormatter';

export interface TelegramSendResult {
  success: boolean;
  messageId?: number;
  channelId?: string;
  error?: string;
  rateLimited?: boolean;
  retryAfterSec?: number;
}

export class TelegramBotService {
  private botToken: string | null;
  private channelId: string | null;
  private isEnabled: boolean;
  private rateLimitResetTime: number = 0;

  constructor() {
    this.botToken = process.env.TELEGRAM_BOT_TOKEN?.trim() || null;
    this.channelId = process.env.TELEGRAM_CHANNEL_ID?.trim() || null;
    this.isEnabled = process.env.TELEGRAM_BOT_ENABLED !== 'false';
  }

  public isConfigured(): boolean {
    return Boolean(this.botToken && this.channelId && this.isEnabled);
  }

  public getConfigSummary() {
    return {
      configured: this.isConfigured(),
      enabled: this.isEnabled,
      channelId: this.channelId || 'Not set',
      tokenMasked: this.botToken
        ? `${this.botToken.substring(0, 6)}...${this.botToken.substring(this.botToken.length - 4)}`
        : 'Not set',
      rateLimitedUntil: this.rateLimitResetTime > Date.now() ? new Date(this.rateLimitResetTime).toISOString() : null,
    };
  }

  /**
   * Dispatches a professional Arabic reminder for an upcoming economic event (60m, 30m, or 5m)
   * converted to the recipient's configured timezone.
   */
  public async sendEventReminder(
    event: EconomicEventRecord,
    minutesBefore: number,
    targetTimezone: string = 'UTC',
    targetChatId?: string | null
  ): Promise<TelegramSendResult> {
    const text = generateArabicReminderMessage(event, minutesBefore, targetTimezone);
    return this.sendMessage(text, 0, targetChatId || undefined);
  }

  /**
   * Dispatches a professional Arabic live release announcement when Actual figures are published,
   * converted to the recipient's configured timezone.
   */
  public async sendLiveReleaseAlert(
    event: EconomicEventRecord,
    targetTimezone: string = 'UTC',
    targetChatId?: string | null
  ): Promise<TelegramSendResult> {
    const text = generateArabicLiveReleaseMessage(event, targetTimezone);
    return this.sendMessage(text, 0, targetChatId || undefined);
  }

  /**
   * Sends a diagnostic test message in Arabic to verify the bot and channel configuration.
   */
  public async sendTestAlert(
    callerUsername: string,
    targetTimezone: string = 'UTC',
    targetChatId?: string | null
  ): Promise<TelegramSendResult> {
    const text = generateArabicTestMessage(callerUsername, targetTimezone);
    return this.sendMessage(text, 0, targetChatId || undefined);
  }

  /**
   * Sends a message with automatic rate-limit backing off and retry logic.
   */
  public async sendMessage(
    htmlText: string,
    retryAttempt: number = 0,
    overrideChatId?: string
  ): Promise<TelegramSendResult> {
    const destinationChatId = overrideChatId || this.channelId;
    if (!this.botToken || !destinationChatId) {
      return {
        success: false,
        error: 'Telegram Bot token or destination Chat ID is missing.',
      };
    }

    if (!this.isEnabled) {
      return {
        success: false,
        error: 'Telegram notifications are currently disabled via TELEGRAM_BOT_ENABLED=false.',
      };
    }

    // Check if we are currently rate limited by Telegram
    if (Date.now() < this.rateLimitResetTime) {
      const waitSeconds = Math.ceil((this.rateLimitResetTime - Date.now()) / 1000);
      return {
        success: false,
        rateLimited: true,
        retryAfterSec: waitSeconds,
        error: `Telegram rate limit active. Retry after ${waitSeconds}s.`,
      };
    }

    const url = `https://api.telegram.org/bot${this.botToken}/sendMessage`;
    const payload = {
      chat_id: destinationChatId,
      text: htmlText,
      parse_mode: 'HTML',
      disable_web_page_preview: true,
    };

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        signal: AbortSignal.timeout(10000),
      });

      const data = await response.json().catch(() => ({}));

      // Handle Telegram Rate Limit (HTTP 429)
      if (response.status === 429) {
        const retryAfter = data?.parameters?.retry_after || 5;
        this.rateLimitResetTime = Date.now() + retryAfter * 1000;
        console.warn(`[Telegram Bot] Rate limited by Telegram API. Pausing for ${retryAfter}s.`);

        if (retryAttempt < 2) {
          await new Promise((r) => setTimeout(r, retryAfter * 1000));
          return this.sendMessage(htmlText, retryAttempt + 1);
        }

        return {
          success: false,
          rateLimited: true,
          retryAfterSec: retryAfter,
          error: `Rate limited: Telegram requested wait of ${retryAfter}s.`,
        };
      }

      if (!response.ok || !data.ok) {
        const errMsg = data.description || `HTTP ${response.status} ${response.statusText}`;
        console.error(`[Telegram Bot Error] Failed to send message: ${errMsg}`);
        return {
          success: false,
          error: errMsg,
        };
      }

      return {
        success: true,
        messageId: data.result?.message_id,
        channelId: this.channelId,
      };
    } catch (err: any) {
      console.error(`[Telegram Bot Network Error]: ${err.message}`);
      if (retryAttempt < 2) {
        await new Promise((r) => setTimeout(r, 1000 * (retryAttempt + 1)));
        return this.sendMessage(htmlText, retryAttempt + 1);
      }
      return {
        success: false,
        error: `Network error reaching Telegram API: ${err.message}`,
      };
    }
  }
}

export const telegramBotService = new TelegramBotService();
