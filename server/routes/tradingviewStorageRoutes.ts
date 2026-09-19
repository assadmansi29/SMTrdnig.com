import { Router, Request, Response } from 'express';
import { getPool } from '../db';

const router = Router();

// Helper to get active PostgreSQL pool
function getDbPool() {
  const pool = getPool();
  if (!pool) {
    throw new Error('Database pool not available');
  }
  return pool;
}

// Ensure storage table exists on initialization
export async function ensureTradingViewStorageTable(): Promise<void> {
  const pool = getPool();
  if (!pool) return;

  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS tradingview_saved_charts (
        id SERIAL PRIMARY KEY,
        client_id VARCHAR(64) NOT NULL DEFAULT 'smtrading.pro',
        user_id VARCHAR(64) NOT NULL DEFAULT 'admin',
        symbol VARCHAR(64) NOT NULL,
        resolution VARCHAR(16) NOT NULL,
        name VARCHAR(255) NOT NULL,
        content TEXT NOT NULL,
        timestamp BIGINT NOT NULL,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      );

      CREATE INDEX IF NOT EXISTS idx_tv_charts_lookup 
      ON tradingview_saved_charts (client_id, user_id, symbol, resolution);
    `);
    console.log('[TradingView Storage] Storage table initialized successfully.');
  } catch (err: any) {
    console.error('[TradingView Storage] Table init notice:', err.message);
  }
}

/**
 * GET /api/tradingview-storage/1.1/charts
 * TradingView High-Level Charts Storage API Specification
 * Used by TradingView widget to load saved chart layouts and drawings.
 */
router.get('/1.1/charts', async (req: Request, res: Response): Promise<void> => {
  try {
    const pool = getDbPool();
    const clientId = typeof req.query.client === 'string' ? req.query.client : 'smtrading.pro';
    const userId = typeof req.query.user === 'string' ? req.query.user : 'admin';
    const chartId = req.query.chart ? parseInt(String(req.query.chart), 10) : undefined;

    if (chartId && !isNaN(chartId)) {
      // Return specific chart content with drawings
      const result = await pool.query(
        `SELECT id, name, timestamp, content, symbol, resolution 
         FROM tradingview_saved_charts 
         WHERE id = $1`,
        [chartId]
      );

      if (result.rows.length === 0) {
        res.json({ status: 'error', error: 'Chart not found' });
        return;
      }

      const row = result.rows[0];
      res.json({
        status: 'ok',
        data: {
          id: row.id,
          name: row.name,
          timestamp: Number(row.timestamp),
          content: row.content,
        }
      });
      return;
    }

    // Return list of saved charts for user/client (or fallback to admin charts for visitors)
    const result = await pool.query(
      `SELECT id, name, timestamp, symbol, resolution 
       FROM tradingview_saved_charts 
       WHERE client_id = $1 AND (user_id = $2 OR user_id = 'admin')
       ORDER BY updated_at DESC`,
      [clientId, userId]
    );

    const charts = result.rows.map(row => ({
      id: row.id,
      name: row.name,
      timestamp: Number(row.timestamp),
      symbol: row.symbol,
      resolution: row.resolution,
    }));

    res.json({
      status: 'ok',
      data: charts,
    });
  } catch (err: any) {
    console.error('[TradingView Storage] GET charts error:', err.message);
    res.json({ status: 'error', error: err.message });
  }
});

/**
 * POST /api/tradingview-storage/1.1/charts
 * Used by TradingView widget when saving/updating charts.
 */
router.post('/1.1/charts', async (req: Request, res: Response): Promise<void> => {
  try {
    const pool = getDbPool();
    const clientId = typeof req.query.client === 'string' ? req.query.client : 'smtrading.pro';
    const userId = typeof req.query.user === 'string' ? req.query.user : 'admin';
    const chartId = req.query.chart ? parseInt(String(req.query.chart), 10) : undefined;

    const { name, content, symbol, resolution } = req.body;
    const nowTimestamp = Math.floor(Date.now() / 1000);

    if (chartId && !isNaN(chartId)) {
      // Update existing chart
      await pool.query(
        `UPDATE tradingview_saved_charts 
         SET name = COALESCE($1, name), 
             content = COALESCE($2, content), 
             timestamp = $3,
             updated_at = NOW() 
         WHERE id = $4`,
        [name, content, nowTimestamp, chartId]
      );

      res.json({ status: 'ok' });
      return;
    }

    // Insert new chart
    const insertRes = await pool.query(
      `INSERT INTO tradingview_saved_charts (client_id, user_id, symbol, resolution, name, content, timestamp, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())
       RETURNING id`,
      [
        clientId,
        userId,
        symbol || 'OANDA:XAUUSD',
        resolution || '15',
        name || 'Admin Chart Analysis',
        typeof content === 'string' ? content : JSON.stringify(content),
        nowTimestamp
      ]
    );

    const newId = insertRes.rows[0].id;
    res.json({
      status: 'ok',
      id: newId,
    });
  } catch (err: any) {
    console.error('[TradingView Storage] POST chart error:', err.message);
    res.json({ status: 'error', error: err.message });
  }
});

/**
 * DELETE /api/tradingview-storage/1.1/charts
 */
router.delete('/1.1/charts', async (req: Request, res: Response): Promise<void> => {
  try {
    const pool = getDbPool();
    const chartId = req.query.chart ? parseInt(String(req.query.chart), 10) : undefined;

    if (chartId && !isNaN(chartId)) {
      await pool.query('DELETE FROM tradingview_saved_charts WHERE id = $1', [chartId]);
    }

    res.json({ status: 'ok' });
  } catch (err: any) {
    console.error('[TradingView Storage] DELETE chart error:', err.message);
    res.json({ status: 'error', error: err.message });
  }
});

/**
 * GET & POST /api/tradingview-storage/1.1/study_templates
 */
router.get('/1.1/study_templates', (req: Request, res: Response): void => {
  res.json({ status: 'ok', data: [] });
});

router.post('/1.1/study_templates', (req: Request, res: Response): void => {
  res.json({ status: 'ok' });
});

/**
 * GET & POST /api/tradingview-storage/1.1/drawings
 */
router.get('/1.1/drawings', (req: Request, res: Response): void => {
  res.json({ status: 'ok', data: [] });
});

router.post('/1.1/drawings', (req: Request, res: Response): void => {
  res.json({ status: 'ok' });
});

export default router;
