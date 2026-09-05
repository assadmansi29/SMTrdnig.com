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
        type VARCHAR(64) NOT NULL,
        data JSONB NOT NULL,
        created_by VARCHAR(64) DEFAULT 'admin',
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      );

      CREATE INDEX IF NOT EXISTS idx_chart_drawings_lookup 
      ON chart_drawings (symbol, interval);
    `);
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

/**
 * GET /api/chart-drawings
 * Public route for all visitors and users to fetch published admin drawings for a symbol & timeframe.
 */
router.get('/', async (req: Request, res: Response): Promise<void> => {
  try {
    const pool = getDbPool();
    const symbol = normalizeSymbol(String(req.query.symbol || 'OANDA:XAUUSD'));
    const interval = normalizeInterval(String(req.query.interval || '15'));

    // Match symbol exact or stripped prefix (e.g. XAUUSD vs OANDA:XAUUSD)
    const altSymbol = symbol.includes(':') ? symbol.split(':')[1] : `OANDA:${symbol}`;

    const query = `
      SELECT id, symbol, interval, type, data, created_by, updated_at
      FROM chart_drawings
      WHERE (symbol = $1 OR symbol = $2) AND interval = $3
      ORDER BY created_at ASC
    `;

    const result = await pool.query(query, [symbol, altSymbol, interval]);

    const drawings = result.rows.map(row => {
      // Ensure data is parsed object
      const parsed = typeof row.data === 'string' ? JSON.parse(row.data) : row.data;
      return {
        ...parsed,
        id: row.id,
        type: row.type || parsed.type,
      };
    });

    res.json({
      status: 'ok',
      symbol,
      interval,
      count: drawings.length,
      drawings,
    });
  } catch (err: any) {
    console.error('[Chart Drawings API] GET error:', err.message);
    res.status(500).json({ status: 'error', error: err.message, drawings: [] });
  }
});

/**
 * PUT /api/chart-drawings/batch
 * Admin & Super Admin ONLY: Atomically synchronizes all drawings for a symbol & timeframe.
 */
router.put('/batch', authenticateToken, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userRole = req.user?.role;
    if (userRole !== 'super_admin' && userRole !== 'admin') {
      res.status(403).json({ error: 'Forbidden. Admin or Super Admin role required to publish drawings.' });
      return;
    }

    const pool = getDbPool();
    const symbol = normalizeSymbol(String(req.body.symbol || 'OANDA:XAUUSD'));
    const interval = normalizeInterval(String(req.body.interval || '15'));
    const drawings = Array.isArray(req.body.drawings) ? req.body.drawings : [];
    const createdBy = req.user?.username || 'admin';

    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // Remove existing drawings for this symbol and timeframe
      const altSymbol = symbol.includes(':') ? symbol.split(':')[1] : `OANDA:${symbol}`;
      await client.query(
        `DELETE FROM chart_drawings WHERE (symbol = $1 OR symbol = $2) AND interval = $3`,
        [symbol, altSymbol, interval]
      );

      // Insert updated drawings batch
      for (const d of drawings) {
        if (!d || !d.id || !d.type) continue;
        await client.query(
          `INSERT INTO chart_drawings (id, symbol, interval, type, data, created_by, updated_at)
           VALUES ($1, $2, $3, $4, $5, $6, NOW())`,
          [
            d.id,
            symbol,
            interval,
            d.type,
            JSON.stringify(d),
            createdBy,
          ]
        );
      }

      await client.query('COMMIT');
      res.json({ status: 'ok', count: drawings.length });
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
});

/**
 * POST /api/chart-drawings
 * Admin & Super Admin ONLY: Create or update a single drawing.
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
    const interval = normalizeInterval(String(req.body.interval || '15'));
    const drawing = req.body.drawing;

    if (!drawing || !drawing.id || !drawing.type) {
      res.status(400).json({ error: 'Invalid drawing payload: missing id or type' });
      return;
    }

    const createdBy = req.user?.username || 'admin';

    await pool.query(
      `INSERT INTO chart_drawings (id, symbol, interval, type, data, created_by, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, NOW())
       ON CONFLICT (id) DO UPDATE 
       SET data = EXCLUDED.data, updated_at = NOW(), symbol = EXCLUDED.symbol, interval = EXCLUDED.interval`,
      [
        drawing.id,
        symbol,
        interval,
        drawing.type,
        JSON.stringify(drawing),
        createdBy,
      ]
    );

    res.json({ status: 'ok', id: drawing.id });
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
