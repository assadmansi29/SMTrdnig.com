import { Router, Response } from 'express';
import { authenticateToken, requireRole, AuthRequest } from '../auth';
import { getPool, Database } from '../db';
import { economicScheduler } from '../services/economicScheduler';
import { telegramBotService } from '../services/telegramBotService';
import { biquoteService } from '../services/biquoteService';
import { runTelegramDiagnostic } from '../../src/utils/telegramDiagnostic';
import {
  getEconomicBotStats,
  getUpcomingHighImpactEvents,
  getConfiguredTimezone,
  setBotSetting,
} from '../db/economicDb';

const router = Router();

// All routes require valid authentication & Admin / Super Admin privileges
router.use(authenticateToken);
router.use(requireRole(['super_admin', 'admin']));

/**
 * GET /api/telegram/status
 * Returns system health, scheduler state, API credentials check, delivery statistics, and configured timezone.
 */
router.get('/status', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const pool = getPool();
    if (!pool) {
      res.status(503).json({ error: 'Database connection pool unavailable.' });
      return;
    }

    const schedulerStatus = economicScheduler.getStatus();
    const stats = await getEconomicBotStats(pool);
    const configuredTz = await getConfiguredTimezone(pool);
    telegramBotService.setDefaultTimezone(configuredTz);

    res.json({
      success: true,
      scheduler: schedulerStatus,
      statistics: stats,
      biquote: {
        configured: biquoteService.isConfigured(),
        baseUrl: biquoteService.getBaseUrl(),
      },
      telegram: {
        ...telegramBotService.getConfigSummary(),
        configuredTimezone: configuredTz,
      },
    });
  } catch (err: any) {
    res.status(500).json({ error: `Failed to fetch Telegram bot status: ${err.message}` });
  }
});

/**
 * GET /api/telegram/diagnostic
 * Performs in-depth real-time diagnostic checks on Telegram connectivity, credentials, and channel permissions.
 */
router.get('/diagnostic', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const report = await runTelegramDiagnostic({ silent: false });
    res.json({
      success: true,
      report,
    });
  } catch (err: any) {
    res.status(500).json({ error: `Diagnostic execution failed: ${err.message}` });
  }
});

/**
 * POST /api/telegram/test
 * Sends an immediate diagnostic test message in professional Arabic to the configured Telegram channel.
 */
router.post('/test', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const pool = getPool();
    const caller = req.user!.username;
    console.log(`[Admin Action] Test Telegram Arabic alert triggered by @${caller}`);

    const targetTz = (req.body?.timezone as string)?.trim() || (pool ? await getConfiguredTimezone(pool) : undefined);
    const result = await telegramBotService.sendTestAlert(caller, targetTz);

    // Audit log this action in PostgreSQL
    await Database.addAuditLog({
      actorId: req.user!.id,
      actorUsername: req.user!.username,
      actorRole: req.user!.role,
      action: 'telegram_bot_test',
      details: `Telegram Arabic test alert triggered. Result: ${result.success ? 'Delivered' : 'Failed'} (${result.error || 'Message ID ' + result.messageId})`,
      metadata: { result, timezone: targetTz },
    });

    if (!result.success) {
      res.status(400).json({
        success: false,
        error: result.error,
        rateLimited: result.rateLimited,
        retryAfterSec: result.retryAfterSec,
      });
      return;
    }

    res.json({
      success: true,
      message: 'Test message successfully delivered in Arabic to Telegram channel.',
      messageId: result.messageId,
      channelId: result.channelId,
      timezone: targetTz,
    });
  } catch (err: any) {
    res.status(500).json({ error: `Failed to send Telegram test message: ${err.message}` });
  }
});

/**
 * POST /api/telegram/timezone
 * Configures the persistent timezone used to convert and display release times in Telegram alerts.
 */
router.post('/timezone', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const pool = getPool();
    if (!pool) {
      res.status(503).json({ error: 'Database connection pool unavailable.' });
      return;
    }

    const { timezone } = req.body;
    if (!timezone || typeof timezone !== 'string') {
      res.status(400).json({ error: 'Valid timezone string is required (e.g. Asia/Riyadh, Asia/Dubai, Africa/Cairo).' });
      return;
    }

    const cleanedTz = timezone.trim();
    try {
      Intl.DateTimeFormat(undefined, { timeZone: cleanedTz });
    } catch {
      res.status(400).json({
        error: `Invalid IANA timezone identifier: "${cleanedTz}". Examples: Asia/Riyadh, Asia/Dubai, Africa/Cairo, UTC.`,
      });
      return;
    }

    await setBotSetting(pool, 'telegram_timezone', cleanedTz);
    telegramBotService.setDefaultTimezone(cleanedTz);

    await Database.addAuditLog({
      actorId: req.user!.id,
      actorUsername: req.user!.username,
      actorRole: req.user!.role,
      action: 'telegram_bot_timezone_update',
      details: `Telegram alert timezone updated to ${cleanedTz}`,
      metadata: { timezone: cleanedTz },
    });

    res.json({
      success: true,
      message: `Telegram alert timezone successfully updated to ${cleanedTz}`,
      timezone: cleanedTz,
    });
  } catch (err: any) {
    res.status(500).json({ error: `Failed to update bot timezone: ${err.message}` });
  }
});

/**
 * POST /api/telegram/sync
 * Manually triggers an immediate synchronization with BiQuote API and updates scheduled reminders.
 */
router.post('/sync', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const caller = req.user!.username;
    console.log(`[Admin Action] Manual BiQuote calendar sync initiated by @${caller}`);

    const syncResult = await economicScheduler.syncCalendar();

    // Audit log in PostgreSQL
    await Database.addAuditLog({
      actorId: req.user!.id,
      actorUsername: req.user!.username,
      actorRole: req.user!.role,
      action: 'economic_calendar_sync',
      details: `Manual BiQuote sync completed: ${syncResult.totalSaved} events updated (${syncResult.highImpactScheduled} high-impact reminders queued).`,
      metadata: { syncResult },
    });

    res.json({
      success: true,
      message: 'Economic calendar synchronized successfully from BiQuote official market feed.',
      result: syncResult,
    });
  } catch (err: any) {
    res.status(500).json({
      success: false,
      error: `Calendar sync failed: ${err.message}`,
    });
  }
});

/**
 * GET /api/telegram/events
 * Lists upcoming economic events currently monitored in PostgreSQL with their notification states.
 */
router.get('/events', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const pool = getPool();
    if (!pool) {
      res.status(503).json({ error: 'Database connection pool unavailable.' });
      return;
    }

    const events = await getUpcomingHighImpactEvents(pool, 40);
    res.json({
      success: true,
      events,
    });
  } catch (err: any) {
    res.status(500).json({ error: `Failed to retrieve economic events: ${err.message}` });
  }
});

export default router;
