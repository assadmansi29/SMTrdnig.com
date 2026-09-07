import { Router, Request, Response } from 'express';
import { getPool } from '../db';
import { authenticateToken, AuthRequest } from '../auth';

const router = Router();

function getDbPool() {
  const pool = getPool();
  if (!pool) {
    throw new Error('PostgreSQL database pool not available');
  }
  return pool;
}

export async function ensureChartDrawingsTable(): Promise<void> {
  const pool = getPool();
  if (!pool) return;

  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS chart_drawings (
        id VARCHAR(128) PRIMARY KEY,
        symbol VARCHAR(64) NOT NULL,
        interval VARCHAR(16) NOT NULL,
        strategy VARCHAR(32) DEFAULT 'default',
        type VARCHAR(64) NOT NULL,
        data JSONB NOT NULL,
        created_by VARCHAR(64) DEFAULT 'admin',
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      );

      CREATE INDEX IF NOT EXISTS idx_chart_drawings_lookup 
      ON chart_drawings (symbol, interval);
    `);

    // Ensure columns accommodate arbitrary string lengths without constraint errors
    await pool.query(`
      ALTER TABLE chart_drawings ALTER COLUMN id TYPE TEXT;
      ALTER TABLE chart_drawings ALTER COLUMN symbol TYPE TEXT;
      ALTER TABLE chart_drawings ALTER COLUMN interval TYPE TEXT;
      ALTER TABLE chart_drawings ALTER COLUMN type TYPE TEXT;
      ALTER TABLE chart_drawings ADD COLUMN IF NOT EXISTS strategy VARCHAR(32) DEFAULT 'default';
      CREATE INDEX IF NOT EXISTS idx_chart_drawings_strategy ON chart_drawings (symbol, strategy);
    `).catch(() => {});

    console.log('[Chart Drawings DB] Table initialized successfully.');
  } catch (err: any) {
    console.error('[Chart Drawings DB] Table ensure notice:', err.message);
  }
}

// Normalize symbols so "XAUUSD" and "OANDA:XAUUSD" resolve consistently
function normalizeSymbol(sym: string): string {
  if (!sym) return 'OANDA:XAUUSD';
  return sym.trim().toUpperCase();
}

function normalizeInterval(inv: string): string {
  if (!inv) return '15';
  const clean = inv.trim().toUpperCase();
  if (clean === 'D' || clean === '1D') return 'D';
  if (clean === 'W' || clean === '1W') return 'W';
  return clean;
}

function normalizeStrategy(strat?: string): string {
  if (!strat) return 'default';
  const clean = strat.trim().toLowerCase();
  if (clean === '144' || clean === 'smc' || clean === 'fib') return clean;
  return 'default';
}

/**
 * GET /api/chart-drawings
 * Public route for all visitors and users to fetch published admin drawings for a symbol, timeframe, and strategy.
 */
router.get('/', async (req: Request, res: Response): Promise<void> => {
  try {
    const pool = getDbPool();
    const symbol = normalizeSymbol(String(req.query.symbol || 'OANDA:XAUUSD'));
    const interval = normalizeInterval(String(req.query.interval || 'ALL'));
    const strategy = normalizeStrategy(req.query.strategy ? String(req.query.strategy) : undefined);

    // Match symbol exact or stripped prefix (e.g. XAUUSD vs OANDA:XAUUSD)
    const altSymbol = symbol.includes(':') ? symbol.split(':')[1] : `OANDA:${symbol}`;

    // Drawings are strictly partitioned by Strategy View (144, SMC, Fibonacci, or default)
    const query = `
      SELECT id, symbol, interval, strategy, type, data, created_by, updated_at
      FROM chart_drawings
      WHERE (symbol = $1 OR symbol = $2)
        AND (strategy = $3 OR ($3 = 'default' AND (strategy IS NULL OR strategy = 'default')))
      ORDER BY created_at ASC
    `;

    const result = await pool.query(query, [symbol, altSymbol, strategy]);

    const drawings = result.rows.map(row => {
      // Ensure data is parsed object
      const parsed = typeof row.data === 'string' ? JSON.parse(row.data) : row.data;
      return {
        ...parsed,
        id: row.id,
        type: row.type || parsed.type,
        strategy: row.strategy || 'default',
      };
    });

    res.json({
      status: 'ok',
      symbol,
      interval,
      strategy,
      count: drawings.length,
      drawings,
    });
  } catch (err: any) {
    console.error('[Chart Drawings API] GET error:', err.message);
    res.status(500).json({ status: 'error', error: err.message, drawings: [] });
  }
});

/**
 * Atomic batch synchronization handler for chart drawings.
 * Admin & Super Admin ONLY: Synchronizes drawings for a symbol & strategy view.
 * Supports both POST /api/chart-drawings/batch and PUT /api/chart-drawings/batch.
 */
async function handleBatchSave(req: AuthRequest, res: Response): Promise<void> {
  try {
    const userRole = req.user?.role;
    if (userRole !== 'super_admin' && userRole !== 'admin') {
      res.status(403).json({ error: 'Forbidden. Admin or Super Admin role required to publish drawings.' });
      return;
    }

    const pool = getDbPool();
    const symbol = normalizeSymbol(String(req.body.symbol || 'OANDA:XAUUSD'));
    const interval = normalizeInterval(String(req.body.interval || '15'));
    const strategy = normalizeStrategy(req.body.strategy ? String(req.body.strategy) : undefined);
    const rawDrawings = Array.isArray(req.body.drawings) ? req.body.drawings : [];
    const createdBy = req.user?.username || 'admin';

    // Deduplicate drawings by id, keeping the latest version
    const drawingMap = new Map<string, any>();
    for (const d of rawDrawings) {
      if (!d) continue;
      const id = String(d.id || '').trim();
      if (!id) continue;
      const type = String(d.type || d.options?.type || 'drawing').trim();
      drawingMap.set(id, {
        ...d,
        id,
        type,
        strategy,
      });
    }

    const validDrawings = Array.from(drawingMap.values());
    const validIds = Array.from(drawingMap.keys());

    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      const altSymbol = symbol.includes(':') ? symbol.split(':')[1] : `OANDA:${symbol}`;

      // 1. Remove drawings for this symbol & strategy that are NOT present in the incoming batch
      if (validIds.length > 0) {
        const placeholders = validIds.map((_, i) => `$${i + 4}`).join(', ');
        await client.query(
          `DELETE FROM chart_drawings 
           WHERE (symbol = $1 OR symbol = $2)
             AND (strategy = $3 OR ($3 = 'default' AND (strategy IS NULL OR strategy = 'default')))
             AND id NOT IN (${placeholders})`,
          [symbol, altSymbol, strategy, ...validIds]
        );
      } else {
        // If drawings array is empty (e.g. clear all), delete all drawings for this symbol & strategy
        await client.query(
          `DELETE FROM chart_drawings 
           WHERE (symbol = $1 OR symbol = $2)
             AND (strategy = $3 OR ($3 = 'default' AND (strategy IS NULL OR strategy = 'default')))`,
          [symbol, altSymbol, strategy]
        );
      }

      // 2. Upsert each drawing using ON CONFLICT (id) DO UPDATE with strategy
      for (const d of validDrawings) {
        await client.query(
          `INSERT INTO chart_drawings (id, symbol, interval, strategy, type, data, created_by, updated_at)
           VALUES ($1, $2, 'ALL', $3, $4, $5, $6, NOW())
           ON CONFLICT (id) DO UPDATE 
           SET symbol = EXCLUDED.symbol,
               interval = 'ALL',
               strategy = EXCLUDED.strategy,
               type = EXCLUDED.type,
               data = EXCLUDED.data,
               created_by = EXCLUDED.created_by,
               updated_at = NOW()`,
          [
            d.id,
            symbol,
            strategy,
            d.type,
            JSON.stringify(d),
            createdBy,
          ]
        );
      }

      await client.query('COMMIT');
      res.json({ status: 'ok', strategy, count: validDrawings.length });
    } catch (txErr) {
      await client.query('ROLLBACK');
      throw txErr;
    } finally {
      client.release();
    }
  } catch (err: any) {
    console.error('[Chart Drawings API] Batch save error:', err.message);
    res.status(500).json({ status: 'error', error: err.message });
  }
}

/**
 * POST & PUT /api/chart-drawings/batch
 * Atomically synchronizes all drawings for a symbol and strategy view across timeframes.
 */
router.post('/batch', authenticateToken, handleBatchSave);
router.put('/batch', authenticateToken, handleBatchSave);

/**
 * POST /api/chart-drawings
 * Admin & Super Admin ONLY: Create or update a single drawing (shared across timeframes in this strategy view).
 */
router.post('/', authenticateToken, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userRole = req.user?.role;
    if (userRole !== 'super_admin' && userRole !== 'admin') {
      res.status(403).json({ error: 'Forbidden. Admin or Super Admin role required to publish drawings.' });
      return;
    }

    const pool = getDbPool();
    const symbol = normalizeSymbol(String(req.body.symbol || 'OANDA:XAUUSD'));
    const strategy = normalizeStrategy(req.body.strategy ? String(req.body.strategy) : undefined);
    const drawing = req.body.drawing;

    if (!drawing || !drawing.id || !drawing.type) {
      res.status(400).json({ error: 'Invalid drawing payload: missing id or type' });
      return;
    }

    const createdBy = req.user?.username || 'admin';

    await pool.query(
      `INSERT INTO chart_drawings (id, symbol, interval, strategy, type, data, created_by, updated_at)
       VALUES ($1, $2, 'ALL', $3, $4, $5, $6, NOW())
       ON CONFLICT (id) DO UPDATE 
       SET symbol = EXCLUDED.symbol,
           interval = 'ALL',
           strategy = EXCLUDED.strategy,
           type = EXCLUDED.type,
           data = EXCLUDED.data,
           created_by = EXCLUDED.created_by,
           updated_at = NOW()`,
      [
        drawing.id,
        symbol,
        strategy,
        drawing.type,
        JSON.stringify(drawing),
        createdBy,
      ]
    );

    res.json({ status: 'ok', strategy, id: drawing.id });
  } catch (err: any) {
    console.error('[Chart Drawings API] POST error:', err.message);
    res.status(500).json({ status: 'error', error: err.message });
  }
});

/**
 * DELETE /api/chart-drawings/:id
 * Admin & Super Admin ONLY: Remove a drawing.
 */
router.delete('/:id', authenticateToken, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userRole = req.user?.role;
    if (userRole !== 'super_admin' && userRole !== 'admin') {
      res.status(403).json({ error: 'Forbidden. Admin or Super Admin role required to delete drawings.' });
      return;
    }

    const pool = getDbPool();
    const drawingId = req.params.id;

    await pool.query('DELETE FROM chart_drawings WHERE id = $1', [drawingId]);
    res.json({ status: 'ok', id: drawingId });
  } catch (err: any) {
    console.error('[Chart Drawings API] DELETE error:', err.message);
    res.status(500).json({ status: 'error', error: err.message });
  }
});

export default router;
