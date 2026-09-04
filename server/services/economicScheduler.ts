import type { Pool as PgPool } from 'pg';
import {
  ensureEconomicTables,
  upsertEconomicEvent,
  scheduleEventReminders,
  getDueNotifications,
  markNotificationSent,
  markNotificationFailed,
  queueLiveReleaseNotification,
  getEconomicBotStats,
  resolveUserTimezone,
  EconomicEventRecord,
} from '../db/economicDb';
import { biquoteService } from './biquoteService';
import { telegramBotService } from './telegramBotService';

export class EconomicScheduler {
  private pool: PgPool | null = null;
  private isRunning: boolean = false;
  private syncTimer: NodeJS.Timeout | null = null;
  private dispatchTimer: NodeJS.Timeout | null = null;
  private liveCheckTimer: NodeJS.Timeout | null = null;
  private lastSyncTime: string | null = null;
  private lastSyncStatus: string = 'Not yet executed';
  private lastSyncError: string | null = null;

  /**
   * Initializes the scheduler, runs table migrations, and starts the background loops.
   */
  public async start(pool: PgPool): Promise<void> {
    if (this.isRunning) {
      console.log('[Economic Scheduler] Already running.');
      return;
    }

    this.pool = pool;
    this.isRunning = true;

    console.log('[Economic Scheduler] Initializing tables and background workers...');
    try {
      await ensureEconomicTables(this.pool);
      console.log('[Economic Scheduler] PostgreSQL economic tables verified.');
    } catch (err: any) {
      console.error(`[Economic Scheduler Error] Migration failed: ${err.message}`);
    }

    // 1. Run initial calendar sync in background
    this.syncCalendar().catch(err => {
      console.warn(`[Economic Scheduler] Initial calendar sync deferred: ${err.message}`);
    });

    // 2. Schedule regular calendar sync (every 15 minutes)
    const syncIntervalMs = 15 * 60 * 1000;
    this.syncTimer = setInterval(() => {
      this.syncCalendar().catch(err => {
        console.error(`[Economic Scheduler] Periodic calendar sync failed: ${err.message}`);
      });
    }, syncIntervalMs);

    // 3. Notification dispatch worker (every 15 seconds)
    this.dispatchTimer = setInterval(() => {
      this.dispatchDueNotifications().catch(err => {
        console.error(`[Economic Scheduler] Notification dispatch error: ${err.message}`);
      });
    }, 15000);

    // 4. Live actual release detector (every 25 seconds)
    this.liveCheckTimer = setInterval(() => {
      this.detectLiveReleases().catch(err => {
        console.error(`[Economic Scheduler] Live release check error: ${err.message}`);
      });
    }, 25000);

    console.log('[Economic Scheduler] Active: BiQuote Calendar Sync (15m), Dispatch Worker (15s), Live Detector (25s).');
  }

  public stop(): void {
    if (!this.isRunning) return;
    this.isRunning = false;

    if (this.syncTimer) clearInterval(this.syncTimer);
    if (this.dispatchTimer) clearInterval(this.dispatchTimer);
    if (this.liveCheckTimer) clearInterval(this.liveCheckTimer);

    this.syncTimer = null;
    this.dispatchTimer = null;
    this.liveCheckTimer = null;
    console.log('[Economic Scheduler] Background loops halted.');
  }

  public getStatus() {
    return {
      running: this.isRunning,
      lastSyncTime: this.lastSyncTime,
      lastSyncStatus: this.lastSyncStatus,
      lastSyncError: this.lastSyncError,
      biquoteConfigured: biquoteService.isConfigured(),
      biquoteUrl: biquoteService.getBaseUrl(),
      telegramConfigured: telegramBotService.isConfigured(),
      telegramDetails: telegramBotService.getConfigSummary(),
    };
  }

  /**
   * Synchronizes calendar events from BiQuote Market Intelligence into PostgreSQL.
   */
  public async syncCalendar(): Promise<{ totalFetched: number; totalSaved: number; highImpactScheduled: number }> {
    if (!this.pool) throw new Error('[Economic Scheduler] Database pool not initialized.');

    this.lastSyncTime = new Date().toISOString();
    try {
      // Look from 2 hours in past to 7 days ahead
      const start = new Date(Date.now() - 2 * 60 * 60 * 1000);
      const end = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

      const events = await biquoteService.fetchCalendar(start, end);
      let savedCount = 0;
      let scheduledCount = 0;

      for (const event of events) {
        const saved = await upsertEconomicEvent(this.pool, event);
        savedCount++;

        // For all High Impact events (importance >= 3), ensure reminders are registered
        if (saved.importance >= 3) {
          await scheduleEventReminders(this.pool, saved.id, new Date(saved.dateUtc));
          scheduledCount++;
        }
      }

      this.lastSyncStatus = `Success: Synced ${savedCount} events (${scheduledCount} high-impact scheduled).`;
      this.lastSyncError = null;
      console.log(`[Economic Scheduler] ${this.lastSyncStatus}`);

      return {
        totalFetched: events.length,
        totalSaved: savedCount,
        highImpactScheduled: scheduledCount,
      };
    } catch (err: any) {
      this.lastSyncStatus = 'Failed';
      this.lastSyncError = err.message;
      console.error(`[Economic Scheduler] Calendar sync failed: ${err.message}`);
      throw err;
    }
  }

  /**
   * Processes all pending notifications whose scheduled time has arrived.
   * Formats alert times in each user's own configured timezone from PostgreSQL.
   */
  private async dispatchDueNotifications(): Promise<void> {
    if (!this.pool || !this.isRunning) return;

    // Grab up to 15 due notifications
    const dueList = await getDueNotifications(this.pool, 15);
    if (dueList.length === 0) return;

    for (const item of dueList) {
      const { notification, event } = item;
      try {
        // Resolve target timezone for this recipient from PostgreSQL
        const targetTz = notification.targetTimezone || await resolveUserTimezone(this.pool, notification.userId);
        const destinationChatId = notification.targetChatId || undefined;

        let result;
        if (notification.notificationType === 'reminder_60m') {
          result = await telegramBotService.sendEventReminder(event, 60, targetTz, destinationChatId);
        } else if (notification.notificationType === 'reminder_30m') {
          result = await telegramBotService.sendEventReminder(event, 30, targetTz, destinationChatId);
        } else if (notification.notificationType === 'reminder_5m') {
          result = await telegramBotService.sendEventReminder(event, 5, targetTz, destinationChatId);
        } else if (notification.notificationType === 'live_release') {
          result = await telegramBotService.sendLiveReleaseAlert(event, targetTz, destinationChatId);
        }

        if (result && result.success) {
          await markNotificationSent(
            this.pool,
            notification.id,
            result.messageId || null,
            result.channelId || destinationChatId || 'telegram'
          );
          console.log(`[Telegram Alert Delivered] Notification #${notification.id} (${notification.notificationType}) for "${event.event}" sent (Timezone: ${targetTz}).`);
        } else if (result && result.rateLimited) {
          // Rate limited: keep pending for next tick after cooldown
          console.warn(`[Telegram Bot] Notification #${notification.id} postponed: rate limited (${result.retryAfterSec}s).`);
          break; // Stop loop to honor Telegram backoff
        } else {
          const errMsg = result?.error || 'Unknown send error';
          await markNotificationFailed(this.pool, notification.id, errMsg, notification.retryCount >= 3);
          console.error(`[Telegram Alert Failed] Notification #${notification.id}: ${errMsg}`);
        }
      } catch (err: any) {
        await markNotificationFailed(this.pool, notification.id, err.message, notification.retryCount >= 3);
      }
    }
  }

  /**
   * Detects when live actual numbers are released for events currently in their release window.
   */
  private async detectLiveReleases(): Promise<void> {
    if (!this.pool || !this.isRunning) return;
    if (!biquoteService.isConfigured()) return;

    try {
      // Find high-impact events within [-15m, +10m] of NOW where actual is still missing
      const query = `
        SELECT * FROM economic_events
        WHERE importance >= 3
          AND actual IS NULL
          AND date_utc >= (NOW() - INTERVAL '15 minutes')
          AND date_utc <= (NOW() + INTERVAL '10 minutes')
        ORDER BY date_utc ASC;
      `;
      const res = await this.pool.query(query);
      if (res.rows.length === 0) return;

      console.log(`[Economic Scheduler] Checking live actuals via BiQuote for ${res.rows.length} active window events...`);
      const liveUpdates = await biquoteService.fetchLiveUpdates();

      for (const update of liveUpdates) {
        if (!update.actual) continue;

        // Check if this matches one of our awaiting events
        const matchingRow = res.rows.find(
          r => r.calendar_id === update.calendarId || 
               r.id === update.id ||
               (r.event === update.event && r.country === update.country)
        );
        if (matchingRow) {
          console.log(`[BiQuote Live Actual Detected] "${update.event}" published actual: ${update.actual} (Forecast: ${update.forecast})`);

          // Update event in PostgreSQL
          const updatedEvent = await upsertEconomicEvent(this.pool, update);

          // Queue atomic live release notifications in each user's configured timezone
          await queueLiveReleaseNotification(this.pool, updatedEvent.id);

          // Immediately trigger dispatch to deliver the queued live release alerts
          await this.dispatchDueNotifications();
        }
      }
    } catch (err: any) {
      console.warn(`[Economic Scheduler] Live release check encountered: ${err.message}`);
    }
  }
}

export const economicScheduler = new EconomicScheduler();
