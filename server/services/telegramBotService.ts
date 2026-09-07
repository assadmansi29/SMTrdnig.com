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
  permanent?: boolean;
  statusCode?: number;
}

export interface DestinationValidationResult {
  destination: string;
  accessible: boolean;
  canPostMessages: boolean;
  chatType?: 'channel' | 'supergroup' | 'group' | 'private' | 'unknown';
  channelTitle?: string;
  statusText?: string;
  error?: string;
  validatedAt: number;
}

export class TelegramBotService {
  private botToken: string | null;
  private channelId: string | null;
  private isEnabled: boolean;
  private defaultTimezone: string = 'UTC';
  private rateLimitResetTime: number = 0;
  private botId: number | null = null;
  private botUsername: string | null = null;
  private destinationValidationCache: Map<string, DestinationValidationResult> = new Map();
  private validationTtlMs: number = 5 * 60 * 1000; // 5 minutes cache
  private loggedInaccessibleDestinations: Set<string> = new Set();

  constructor() {
    this.botToken = process.env.TELEGRAM_BOT_TOKEN?.trim() || null;
    this.channelId = process.env.TELEGRAM_CHANNEL_ID?.trim() || null;
    this.isEnabled = process.env.TELEGRAM_BOT_ENABLED !== 'false';
  }

  public isConfigured(): boolean {
    return Boolean(this.botToken && this.channelId && this.isEnabled);
  }

  public getChannelId(): string | null {
    return this.channelId;
  }

  public setDefaultTimezone(tz: string): void {
    if (tz && tz.trim()) {
      this.defaultTimezone = tz.trim();
    }
  }

  public getDefaultTimezone(): string {
    return this.defaultTimezone;
  }

  public async getBotIdentity(): Promise<{ id: number; username: string } | null> {
    if (this.botId && this.botUsername) {
      return { id: this.botId, username: this.botUsername };
    }
    if (!this.botToken) return null;

    try {
      const res = await fetch(`https://api.telegram.org/bot${this.botToken}/getMe`, {
        signal: AbortSignal.timeout(8000),
      });
      const data: any = await res.json().catch(() => ({}));
      if (res.ok && data.ok && data.result?.id) {
        this.botId = Number(data.result.id);
        this.botUsername = data.result.username || null;
        return { id: this.botId, username: this.botUsername || '' };
      }
    } catch {
      // Network or timeout
    }
    return null;
  }

  /**
   * Validates whether the bot can access the destination chat/channel and has Post Messages permission.
   * Caches validation results to prevent unnecessary Telegram API polling.
   */
  public async validateDestination(
    destinationChatId?: string | null,
    forceRefresh: boolean = false
  ): Promise<DestinationValidationResult> {
    const target = (destinationChatId || this.channelId)?.trim();
    if (!target) {
      return {
        destination: '',
        accessible: false,
        canPostMessages: false,
        error: 'Destination Chat ID is missing or empty.',
        validatedAt: Date.now(),
      };
    }

    if (!this.botToken) {
      return {
        destination: target,
        accessible: false,
        canPostMessages: false,
        error: 'TELEGRAM_BOT_TOKEN is not configured.',
        validatedAt: Date.now(),
      };
    }

    if (!forceRefresh) {
      const cached = this.destinationValidationCache.get(target);
      if (cached && Date.now() - cached.validatedAt < this.validationTtlMs) {
        return cached;
      }
    }

    // 1. Verify Bot Identity
    const botInfo = await this.getBotIdentity();
    if (!botInfo) {
      const res: DestinationValidationResult = {
        destination: target,
        accessible: false,
        canPostMessages: false,
        error: 'Bot authentication failed. Verify TELEGRAM_BOT_TOKEN.',
        validatedAt: Date.now(),
      };
      this.destinationValidationCache.set(target, res);
      return res;
    }

    // 2. Check Channel / Chat Accessibility (/getChat)
    try {
      const chatUrl = `https://api.telegram.org/bot${this.botToken}/getChat?chat_id=${encodeURIComponent(target)}`;
      const chatRes = await fetch(chatUrl, {
        method: 'GET',
        headers: { 'Accept': 'application/json' },
        signal: AbortSignal.timeout(8000),
      });
      const chatData: any = await chatRes.json().catch(() => ({}));

      if (!chatRes.ok || !chatData.ok) {
        const errMsg = chatData.description || `HTTP ${chatRes.status}`;
        const res: DestinationValidationResult = {
          destination: target,
          accessible: false,
          canPostMessages: false,
          statusText: 'inaccessible',
          error: errMsg,
          validatedAt: Date.now(),
        };
        this.destinationValidationCache.set(target, res);
        if (!this.loggedInaccessibleDestinations.has(target)) {
          console.warn(`[Telegram Bot Permission] Destination "${target}" is inaccessible: ${errMsg}. Ensure bot is an Administrator with "Post Messages" rights in the channel.`);
          this.loggedInaccessibleDestinations.add(target);
        }
        return res;
      }

      const chatType = chatData.result?.type || 'channel';
      const chatTitle = chatData.result?.title || chatData.result?.first_name || target;

      // In direct private chats, successful /getChat means user has started conversation with bot
      if (chatType === 'private') {
        const res: DestinationValidationResult = {
          destination: target,
          accessible: true,
          canPostMessages: true,
          chatType: 'private',
          channelTitle: chatTitle,
          statusText: 'private_chat',
          validatedAt: Date.now(),
        };
        this.destinationValidationCache.set(target, res);
        this.loggedInaccessibleDestinations.delete(target);
        return res;
      }

      // 3. Test Channel Member / Administrator Rights (/getChatMember)
      const memberUrl = `https://api.telegram.org/bot${this.botToken}/getChatMember?chat_id=${encodeURIComponent(target)}&user_id=${botInfo.id}`;
      const memberRes = await fetch(memberUrl, {
        method: 'GET',
        headers: { 'Accept': 'application/json' },
        signal: AbortSignal.timeout(8000),
      });
      const memberData: any = await memberRes.json().catch(() => ({}));

      if (!memberRes.ok || !memberData.ok || !memberData.result) {
        const errMsg = memberData.description || `HTTP ${memberRes.status}`;
        const res: DestinationValidationResult = {
          destination: target,
          accessible: true,
          canPostMessages: false,
          chatType,
          channelTitle: chatTitle,
          statusText: 'lacks_permissions',
          error: errMsg,
          validatedAt: Date.now(),
        };
        this.destinationValidationCache.set(target, res);
        if (!this.loggedInaccessibleDestinations.has(target)) {
          console.warn(`[Telegram Bot Permission] Destination "${target}" member permission check failed: ${errMsg}.`);
          this.loggedInaccessibleDestinations.add(target);
        }
        return res;
      }

      const status = memberData.result.status;
      let canPost = false;
      if (status === 'creator') {
        canPost = true;
      } else if (status === 'administrator') {
        canPost = Boolean(memberData.result.can_post_messages);
      } else if (chatType === 'group' || chatType === 'supergroup') {
        canPost = status === 'member';
      }

      let permError: string | undefined;
      if (!canPost) {
        permError = status === 'administrator'
          ? 'Bot is an Administrator but "Post Messages" permission is disabled'
          : `Bot is only a ${status || 'member'}, not an Administrator with "Post Messages" rights`;
      }

      const res: DestinationValidationResult = {
        destination: target,
        accessible: true,
        canPostMessages: canPost,
        chatType,
        channelTitle: chatTitle,
        statusText: status,
        error: permError,
        validatedAt: Date.now(),
      };
      this.destinationValidationCache.set(target, res);

      if (!canPost) {
        if (!this.loggedInaccessibleDestinations.has(target)) {
          console.warn(`[Telegram Bot Permission] Destination "${target}" (${chatTitle}) permission check: ${permError}.`);
          this.loggedInaccessibleDestinations.add(target);
        }
      } else {
        this.loggedInaccessibleDestinations.delete(target);
      }

      return res;
    } catch (err: any) {
      const res: DestinationValidationResult = {
        destination: target,
        accessible: false,
        canPostMessages: false,
        error: `Network error during Telegram destination check: ${err.message}`,
        validatedAt: Date.now(),
      };
      return res;
    }
  }

  public getConfigSummary() {
    const cachedDefault = this.channelId ? this.destinationValidationCache.get(this.channelId) : undefined;
    return {
      configured: this.isConfigured(),
      enabled: this.isEnabled,
      channelId: this.channelId || 'Not set',
      tokenMasked: this.botToken
        ? `${this.botToken.substring(0, 6)}...${this.botToken.substring(this.botToken.length - 4)}`
        : 'Not set',
      rateLimitedUntil: this.rateLimitResetTime > Date.now() ? new Date(this.rateLimitResetTime).toISOString() : null,
      timezone: this.defaultTimezone,
      destinationStatus: cachedDefault ? {
        accessible: cachedDefault.accessible,
        canPostMessages: cachedDefault.canPostMessages,
        channelTitle: cachedDefault.channelTitle,
        error: cachedDefault.error,
      } : null,
    };
  }

  /**
   * Dispatches a professional Arabic reminder for an upcoming economic event (60m, 30m, or 5m)
   * converted to the recipient's configured timezone.
   */
  public async sendEventReminder(
    event: EconomicEventRecord,
    minutesBefore: number,
    targetTimezone?: string,
    targetChatId?: string | null
  ): Promise<TelegramSendResult> {
    const tz = (targetTimezone && targetTimezone.trim()) ? targetTimezone.trim() : (this.defaultTimezone || 'UTC');
    const text = generateArabicReminderMessage(event, minutesBefore, tz);
    return this.sendMessage(text, 0, targetChatId || undefined);
  }

  /**
   * Dispatches a professional Arabic live release announcement when Actual figures are published,
   * converted to the recipient's configured timezone.
   */
  public async sendLiveReleaseAlert(
    event: EconomicEventRecord,
    targetTimezone?: string,
    targetChatId?: string | null
  ): Promise<TelegramSendResult> {
    const tz = (targetTimezone && targetTimezone.trim()) ? targetTimezone.trim() : (this.defaultTimezone || 'UTC');
    const text = generateArabicLiveReleaseMessage(event, tz);
    return this.sendMessage(text, 0, targetChatId || undefined);
  }

  /**
   * Sends a diagnostic test message in Arabic to verify the bot and channel configuration.
   */
  public async sendTestAlert(
    callerUsername: string,
    targetTimezone?: string,
    targetChatId?: string | null
  ): Promise<TelegramSendResult> {
    const tz = (targetTimezone && targetTimezone.trim()) ? targetTimezone.trim() : (this.defaultTimezone || 'UTC');
    // Force refresh destination validation so manual testing immediately reflects newly added permissions
    await this.validateDestination(targetChatId || this.channelId, true);
    const text = generateArabicTestMessage(callerUsername, tz);
    return this.sendMessage(text, 0, targetChatId || undefined);
  }

  /**
   * Sends a message with automatic rate-limit backing off, retry logic,
   * and destination permission validation to prevent repeated dispatches to inaccessible channels.
   */
  public async sendMessage(
    htmlText: string,
    retryAttempt: number = 0,
    overrideChatId?: string
  ): Promise<TelegramSendResult> {
    const destinationChatId = (overrideChatId || this.channelId)?.trim();
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

    // Pre-flight destination validation: do not dispatch to inaccessible destinations
    const validation = await this.validateDestination(destinationChatId);
    if (!validation.accessible || !validation.canPostMessages) {
      return {
        success: false,
        permanent: true,
        statusCode: 403,
        error: `Destination "${destinationChatId}" is inaccessible or bot lacks Post Messages permission: ${validation.error || 'Permission denied'}`,
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

      const data: any = await response.json().catch(() => ({}));

      // Handle Telegram Rate Limit (HTTP 429)
      if (response.status === 429) {
        const retryAfter = data?.parameters?.retry_after || 5;
        this.rateLimitResetTime = Date.now() + retryAfter * 1000;
        console.warn(`[Telegram Bot] Rate limited by Telegram API. Pausing for ${retryAfter}s.`);

        if (retryAttempt < 2) {
          await new Promise((r) => setTimeout(r, retryAfter * 1000));
          return this.sendMessage(htmlText, retryAttempt + 1, overrideChatId);
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
        const isPermanent = response.status === 403 || /forbidden|not a member|blocked|chat not found|not enough rights/i.test(errMsg);
        if (isPermanent) {
          // Immediately update cached destination validation to prevent repeated dispatches
          this.destinationValidationCache.set(destinationChatId, {
            destination: destinationChatId,
            accessible: false,
            canPostMessages: false,
            error: errMsg,
            validatedAt: Date.now(),
          });
          if (!this.loggedInaccessibleDestinations.has(destinationChatId)) {
            console.warn(`[Telegram Bot Permission] Destination "${destinationChatId}" is inaccessible: ${errMsg}. Ensure bot is an Administrator with "Post Messages" rights in the channel.`);
            this.loggedInaccessibleDestinations.add(destinationChatId);
          }
        } else {
          console.error(`[Telegram Bot Error] Failed to send message: ${errMsg}`);
        }
        return {
          success: false,
          permanent: isPermanent,
          statusCode: response.status,
          error: errMsg,
        };
      }

      return {
        success: true,
        messageId: data.result?.message_id,
        channelId: this.channelId || destinationChatId,
      };
    } catch (err: any) {
      console.error(`[Telegram Bot Network Error]: ${err.message}`);
      if (retryAttempt < 2) {
        await new Promise((r) => setTimeout(r, 1000 * (retryAttempt + 1)));
        return this.sendMessage(htmlText, retryAttempt + 1, overrideChatId);
      }
      return {
        success: false,
        error: `Network error reaching Telegram API: ${err.message}`,
      };
    }
  }
}

export const telegramBotService = new TelegramBotService();
