import type { Pool as PgPool } from 'pg';

export interface EconomicEventRecord {
  id: string; // e.g. 'bq_313646'
  calendarId: string;
  dateUtc: string; // ISO 8601 UTC
  country: string;
  currency: string;
  event: string;
  category: string;
  importance: number; // 1 = Low, 2 = Medium, 3 = High
  actual: string | null;
  forecast: string | null;
  previous: string | null;
  revised: string | null;
  unit: string | null;
  rawData?: any;
  lastUpdatedUtc: string;
  createdAt: string;
}

export type NotificationType = 'reminder_60m' | 'reminder_30m' | 'reminder_5m' | 'live_release';
export type NotificationStatus = 'pending' | 'sent' | 'failed' | 'skipped';

export interface EventNotificationRecord {
  id: number;
  eventId: string;
  userId?: string | null;
  targetTimezone?: string | null;
  targetChatId?: string | null;
  notificationType: NotificationType;
  scheduledForUtc: string;
  sentAtUtc: string | null;
  status: NotificationStatus;
  telegramMessageId: number | null;
  telegramChannelId: string | null;
  retryCount: number;
  errorMessage: string | null;
  createdAt: string;
}

/**
 * Initializes and migrates economic events and notification tables in PostgreSQL.
 * Strict unique constraints ensure complete idempotency and zero duplicate notifications.
 */
export async function ensureEconomicTables(pool: PgPool): Promise<void> {
  const client = await pool.connect();
  try {
    await client.query(`
      CREATE TABLE IF NOT EXISTS economic_events (
        id VARCHAR(100) PRIMARY KEY,
        calendar_id VARCHAR(100) UNIQUE NOT NULL,
        date_utc TIMESTAMPTZ NOT NULL,
        country VARCHAR(100) NOT NULL,
        currency VARCHAR(20) NOT NULL,
        event VARCHAR(255) NOT NULL,
        category VARCHAR(100),
        importance INT NOT NULL DEFAULT 1,
        actual VARCHAR(50),
        forecast VARCHAR(50),
        previous VARCHAR(50),
        revised VARCHAR(50),
        unit VARCHAR(50),
        raw_data JSONB,
        last_updated_utc TIMESTAMPTZ DEFAULT NOW(),
        created_at TIMESTAMPTZ DEFAULT NOW()
      );

      CREATE INDEX IF NOT EXISTS idx_economic_events_date_utc ON economic_events(date_utc);
      CREATE INDEX IF NOT EXISTS idx_economic_events_importance ON economic_events(importance);

      CREATE TABLE IF NOT EXISTS event_notifications (
        id SERIAL PRIMARY KEY,
        event_id VARCHAR(100) NOT NULL REFERENCES economic_events(id) ON DELETE CASCADE,
        user_id VARCHAR(100) REFERENCES users(id) ON DELETE CASCADE,
        target_timezone VARCHAR(100),
        target_chat_id VARCHAR(100),
        notification_type VARCHAR(50) NOT NULL,
        scheduled_for_utc TIMESTAMPTZ NOT NULL,
        sent_at_utc TIMESTAMPTZ,
        status VARCHAR(30) DEFAULT 'pending',
        telegram_message_id BIGINT,
        telegram_channel_id VARCHAR(100),
        retry_count INT DEFAULT 0,
        error_message TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW()
      );

      ALTER TABLE event_notifications ADD COLUMN IF NOT EXISTS user_id VARCHAR(100) REFERENCES users(id) ON DELETE CASCADE;
      ALTER TABLE event_notifications ADD COLUMN IF NOT EXISTS target_timezone VARCHAR(100);
      ALTER TABLE event_notifications ADD COLUMN IF NOT EXISTS target_chat_id VARCHAR(100);

      CREATE INDEX IF NOT EXISTS idx_notifications_status_scheduled ON event_notifications(status, scheduled_for_utc);
      CREATE UNIQUE INDEX IF NOT EXISTS idx_uq_event_user_notification ON event_notifications(event_id, notification_type, COALESCE(user_id, 'GLOBAL'));

      CREATE TABLE IF NOT EXISTS economic_bot_settings (
        key VARCHAR(50) PRIMARY KEY,
        value TEXT NOT NULL,
        updated_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);
  } finally {
    client.release();
  }
}

/**
 * Retrieves a persistent bot setting from PostgreSQL with fallback.
 */
export async function getBotSetting(pool: PgPool, key: string, defaultValue: string): Promise<string> {
  try {
    const res = await pool.query('SELECT value FROM economic_bot_settings WHERE key = $1', [key]);
    if (res.rows.length > 0 && res.rows[0].value) {
      return res.rows[0].value;
    }
    return defaultValue;
  } catch {
    return defaultValue;
  }
}

/**
 * Persists a bot setting to PostgreSQL.
 */
export async function setBotSetting(pool: PgPool, key: string, value: string): Promise<void> {
  await pool.query(`
    INSERT INTO economic_bot_settings (key, value, updated_at)
    VALUES ($1, $2, NOW())
    ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = NOW();
  `, [key, value]);
}

/**
 * Resolves the configured timezone for an individual user or admin from PostgreSQL.
 * If userId is provided, queries that user's record in the PostgreSQL users table.
 * If userId is not provided, queries the primary admin user's configured timezone from PostgreSQL.
 * If no timezone is configured in the database, defaults strictly to 'UTC'.
 * Never assumes Berlin or any single global timezone.
 */
export async function resolveUserTimezone(pool: PgPool, userId?: string | null): Promise<string> {
  try {
    if (userId) {
      const res = await pool.query('SELECT timezone FROM users WHERE id = $1', [userId]);
      if (res.rows.length > 0 && res.rows[0].timezone && res.rows[0].timezone.trim()) {
        return res.rows[0].timezone.trim();
      }
    }

    // Look up primary administrator's configured timezone from PostgreSQL users table
    const adminRes = await pool.query(`
      SELECT timezone FROM users 
      WHERE (role = 'super_admin' OR role = 'admin') 
        AND timezone IS NOT NULL 
        AND TRIM(timezone) != ''
      ORDER BY CASE WHEN username = 'abuasad2299' THEN 0 ELSE 1 END, id ASC 
      LIMIT 1;
    `);

    if (adminRes.rows.length > 0 && adminRes.rows[0].timezone && adminRes.rows[0].timezone.trim()) {
      return adminRes.rows[0].timezone.trim();
    }

    // Check persistent database setting as secondary source
    const dbSetting = await getBotSetting(pool, 'telegram_timezone', '');
    if (dbSetting && dbSetting.trim()) {
      return dbSetting.trim();
    }

    // Check if any registered user has configured a timezone in PostgreSQL
    const anyUserRes = await pool.query(`
      SELECT timezone FROM users 
      WHERE timezone IS NOT NULL AND TRIM(timezone) != '' 
      ORDER BY id ASC 
      LIMIT 1;
    `);

    if (anyUserRes.rows.length > 0 && anyUserRes.rows[0].timezone && anyUserRes.rows[0].timezone.trim()) {
      return anyUserRes.rows[0].timezone.trim();
    }

    return 'UTC';
  } catch (err: any) {
    console.warn(`[Timezone] Failed to resolve user timezone from PostgreSQL: ${err.message}. Defaulting to UTC.`);
    return 'UTC';
  }
}

/**
 * Upserts an economic event from BiQuote Market Intelligence.
 * If event already exists, updates actual, forecast, previous, revised, and last_updated_utc.
 */
export async function upsertEconomicEvent(pool: PgPool, event: Omit<EconomicEventRecord, 'createdAt' | 'lastUpdatedUtc'>): Promise<EconomicEventRecord> {
  const query = `
    INSERT INTO economic_events (
      id, calendar_id, date_utc, country, currency, event, category,
      importance, actual, forecast, previous, revised, unit, raw_data,
      last_updated_utc, created_at
    ) VALUES (
      $1, $2, $3, $4, $5, $6, $7,
      $8, $9, $10, $11, $12, $13, $14,
      NOW(), NOW()
    )
    ON CONFLICT (calendar_id) DO UPDATE SET
      date_utc = EXCLUDED.date_utc,
      actual = COALESCE(EXCLUDED.actual, economic_events.actual),
      forecast = COALESCE(EXCLUDED.forecast, economic_events.forecast),
      previous = COALESCE(EXCLUDED.previous, economic_events.previous),
      revised = COALESCE(EXCLUDED.revised, economic_events.revised),
      importance = EXCLUDED.importance,
      raw_data = EXCLUDED.raw_data,
      last_updated_utc = NOW()
    RETURNING *;
  `;

  const res = await pool.query(query, [
    event.id,
    event.calendarId,
    event.dateUtc,
    event.country,
    event.currency,
    event.event,
    event.category,
    event.importance,
    event.actual,
    event.forecast,
    event.previous,
    event.revised,
    event.unit,
    event.rawData ? JSON.stringify(event.rawData) : null,
  ]);

  return mapEconomicEventRow(res.rows[0]);
}

/**
 * Ensures scheduled reminder rows exist in PostgreSQL for a high-impact event.
 * Reminders: 60 minutes, 30 minutes, and 5 minutes before release.
 * Converts release alerts according to each user's configured timezone in PostgreSQL.
 * ON CONFLICT DO NOTHING guarantees idempotency across re-syncs.
 */
export async function scheduleEventReminders(
  pool: PgPool,
  eventId: string,
  eventDateUtc: Date
): Promise<void> {
  const now = new Date();
  const intervals: Array<{ type: NotificationType; minutesBefore: number }> = [
    { type: 'reminder_60m', minutesBefore: 60 },
    { type: 'reminder_30m', minutesBefore: 30 },
    { type: 'reminder_5m', minutesBefore: 5 },
  ];

  // 1. Resolve primary admin user's configured timezone for channel broadcast
  const adminTimezone = await resolveUserTimezone(pool, null);

  // 2. Query all registered users with active Telegram alerts configured in PostgreSQL
  let usersWithAlerts: Array<{ id: string; timezone: string | null; telegram_chat_id: string | null }> = [];
  try {
    const userRes = await pool.query(`
      SELECT id, timezone, telegram_chat_id 
      FROM users 
      WHERE telegram_chat_id IS NOT NULL 
        AND TRIM(telegram_chat_id) != ''
        AND telegram_notifications_enabled = true;
    `);
    usersWithAlerts = userRes.rows;
  } catch (err: any) {
    console.warn(`[Schedule Reminders] Could not fetch alert subscribers: ${err.message}`);
  }

  for (const item of intervals) {
    const scheduledTime = new Date(eventDateUtc.getTime() - item.minutesBefore * 60 * 1000);
    
    // If the reminder window has already passed by more than 5 minutes, mark as skipped
    const isPast = (now.getTime() - scheduledTime.getTime()) > (5 * 60 * 1000);
    const initialStatus = isPast ? 'skipped' : 'pending';

    // Broadcast channel reminder (user_id = NULL)
    await pool.query(`
      INSERT INTO event_notifications (
        event_id, user_id, target_timezone, target_chat_id, notification_type, scheduled_for_utc, status, created_at
      ) VALUES ($1, NULL, $2, NULL, $3, $4, $5, NOW())
      ON CONFLICT DO NOTHING;
    `, [eventId, adminTimezone, item.type, scheduledTime.toISOString(), initialStatus]);

    // Individual user reminders in each user's own configured timezone
    for (const u of usersWithAlerts) {
      const userTz = (u.timezone && u.timezone.trim()) ? u.timezone.trim() : 'UTC';
      await pool.query(`
        INSERT INTO event_notifications (
          event_id, user_id, target_timezone, target_chat_id, notification_type, scheduled_for_utc, status, created_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())
        ON CONFLICT DO NOTHING;
      `, [eventId, u.id, userTz, u.telegram_chat_id, item.type, scheduledTime.toISOString(), initialStatus]);
    }
  }
}

/**
 * Prepares atomic records for a live release notification in each recipient's configured timezone.
 * Returns notification id if record was newly inserted, null otherwise.
 */
export async function queueLiveReleaseNotification(
  pool: PgPool,
  eventId: string
): Promise<number | null> {
  const adminTimezone = await resolveUserTimezone(pool, null);

  const res = await pool.query(`
    INSERT INTO event_notifications (
      event_id, user_id, target_timezone, target_chat_id, notification_type, scheduled_for_utc, status, created_at
    ) VALUES ($1, NULL, $2, NULL, 'live_release', NOW(), 'pending', NOW())
    ON CONFLICT DO NOTHING
    RETURNING id;
  `, [eventId, adminTimezone]);

  // Also queue for individual users with configured Telegram alerts
  try {
    const userRes = await pool.query(`
      SELECT id, timezone, telegram_chat_id 
      FROM users 
      WHERE telegram_chat_id IS NOT NULL 
        AND TRIM(telegram_chat_id) != ''
        AND telegram_notifications_enabled = true;
    `);
    for (const u of userRes.rows) {
      const userTz = (u.timezone && u.timezone.trim()) ? u.timezone.trim() : 'UTC';
      await pool.query(`
        INSERT INTO event_notifications (
          event_id, user_id, target_timezone, target_chat_id, notification_type, scheduled_for_utc, status, created_at
        ) VALUES ($1, $2, $3, $4, 'live_release', NOW(), 'pending', NOW())
        ON CONFLICT DO NOTHING;
      `, [eventId, u.id, userTz, u.telegram_chat_id]);
    }
  } catch (err: any) {
    console.warn(`[Live Release Queue] Could not queue user-specific live releases: ${err.message}`);
  }

  return res.rows.length > 0 ? Number(res.rows[0].id) : null;
}

/**
 * Retrieves pending notifications due for delivery (scheduled_for_utc <= NOW()).
 */
export async function getDueNotifications(
  pool: PgPool,
  limit: number = 20
): Promise<Array<{ notification: EventNotificationRecord; event: EconomicEventRecord }>> {
  const query = `
    SELECT 
      n.id as n_id, n.event_id, n.user_id, n.target_timezone, n.target_chat_id,
      n.notification_type, n.scheduled_for_utc, n.sent_at_utc, n.status,
      n.telegram_message_id, n.telegram_channel_id, n.retry_count, n.error_message,
      n.created_at as n_created_at,
      e.id as e_id, e.calendar_id, e.date_utc, e.country, e.currency,
      e.event as e_event, e.category, e.importance, e.actual, e.forecast,
      e.previous, e.revised, e.unit, e.raw_data, e.last_updated_utc, e.created_at as e_created_at
    FROM event_notifications n
    JOIN economic_events e ON n.event_id = e.id
    WHERE n.status = 'pending' 
      AND n.scheduled_for_utc <= NOW()
    ORDER BY n.scheduled_for_utc ASC
    LIMIT $1;
  `;

  const res = await pool.query(query, [limit]);
  return res.rows.map(row => ({
    notification: {
      id: row.n_id,
      eventId: row.event_id,
      userId: row.user_id,
      targetTimezone: row.target_timezone,
      targetChatId: row.target_chat_id,
      notificationType: row.notification_type as NotificationType,
      scheduledForUtc: new Date(row.scheduled_for_utc).toISOString(),
      sentAtUtc: row.sent_at_utc ? new Date(row.sent_at_utc).toISOString() : null,
      status: row.status as NotificationStatus,
      telegramMessageId: row.telegram_message_id ? Number(row.telegram_message_id) : null,
      telegramChannelId: row.telegram_channel_id,
      retryCount: row.retry_count,
      errorMessage: row.error_message,
      createdAt: new Date(row.n_created_at).toISOString(),
    },
    event: {
      id: row.e_id,
      calendarId: row.calendar_id,
      dateUtc: new Date(row.date_utc).toISOString(),
      country: row.country,
      currency: row.currency,
      event: row.e_event,
      category: row.category,
      importance: row.importance,
      actual: row.actual,
      forecast: row.forecast,
      previous: row.previous,
      revised: row.revised,
      unit: row.unit,
      rawData: row.raw_data,
      lastUpdatedUtc: new Date(row.last_updated_utc).toISOString(),
      createdAt: new Date(row.e_created_at).toISOString(),
    }
  }));
}

export async function markNotificationSent(
  pool: PgPool,
  notificationId: number,
  telegramMessageId: number | null,
  channelId: string
): Promise<void> {
  await pool.query(`
    UPDATE event_notifications
    SET 
      status = 'sent',
      sent_at_utc = NOW(),
      telegram_message_id = $1,
      telegram_channel_id = $2,
      error_message = NULL
    WHERE id = $3;
  `, [telegramMessageId, channelId, notificationId]);
}

export async function markNotificationFailed(
  pool: PgPool,
  notificationId: number,
  errorMessage: string,
  permanentFail: boolean = false
): Promise<void> {
  const status: NotificationStatus = permanentFail ? 'failed' : 'pending';
  await pool.query(`
    UPDATE event_notifications
    SET 
      status = $1,
      retry_count = retry_count + 1,
      error_message = $2
    WHERE id = $3;
  `, [status, errorMessage, notificationId]);
}

export async function getUpcomingHighImpactEvents(
  pool: PgPool,
  limit: number = 50
): Promise<EconomicEventRecord[]> {
  const res = await pool.query(`
    SELECT * FROM economic_events
    WHERE date_utc >= (NOW() - INTERVAL '2 hours')
    ORDER BY date_utc ASC
    LIMIT $1;
  `, [limit]);

  return res.rows.map(mapEconomicEventRow);
}

export async function getEconomicBotStats(pool: PgPool): Promise<{
  totalEventsTracked: number;
  highImpactCount: number;
  notificationsSent: number;
  notificationsPending: number;
  notificationsFailed: number;
  lastEventDateUtc: string | null;
}> {
  const eventsCount = await pool.query(`SELECT count(*) as count, count(*) FILTER (WHERE importance >= 3) as high_count FROM economic_events;`);
  const notifsCount = await pool.query(`
    SELECT 
      count(*) FILTER (WHERE status = 'sent') as sent_count,
      count(*) FILTER (WHERE status = 'pending') as pending_count,
      count(*) FILTER (WHERE status = 'failed') as failed_count
    FROM event_notifications;
  `);
  const latestEvent = await pool.query(`SELECT max(date_utc) as max_date FROM economic_events;`);

  return {
    totalEventsTracked: parseInt(eventsCount.rows[0]?.count || '0', 10),
    highImpactCount: parseInt(eventsCount.rows[0]?.high_count || '0', 10),
    notificationsSent: parseInt(notifsCount.rows[0]?.sent_count || '0', 10),
    notificationsPending: parseInt(notifsCount.rows[0]?.pending_count || '0', 10),
    notificationsFailed: parseInt(notifsCount.rows[0]?.failed_count || '0', 10),
    lastEventDateUtc: latestEvent.rows[0]?.max_date ? new Date(latestEvent.rows[0].max_date).toISOString() : null,
  };
}

function mapEconomicEventRow(row: any): EconomicEventRecord {
  return {
    id: row.id,
    calendarId: row.calendar_id,
    dateUtc: new Date(row.date_utc).toISOString(),
    country: row.country,
    currency: row.currency,
    event: row.event,
    category: row.category,
    importance: Number(row.importance),
    actual: row.actual,
    forecast: row.forecast,
    previous: row.previous,
    revised: row.revised,
    unit: row.unit,
    rawData: typeof row.raw_data === 'string' ? JSON.parse(row.raw_data) : row.raw_data,
    lastUpdatedUtc: new Date(row.last_updated_utc || row.created_at).toISOString(),
    createdAt: new Date(row.created_at).toISOString(),
  };
}
