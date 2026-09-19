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

// Normalize symbols so BlackBull symbols and raw tickers resolve to institutional feeds (OANDA/Binance)
function normalizeSymbol(sym: string): string {
  if (!sym) return 'OANDA:XAUUSD';
  const clean = sym.trim().toUpperCase();
  if (clean === 'BLACKBULL:XAUUSD' || clean === 'XAUUSD' || clean === 'GOLD' || clean === 'XAU/USD') {
    return 'OANDA:XAUUSD';
  }
  if (clean === 'BLACKBULL:NAS100' || clean === 'NAS100' || clean === 'NAS100USD' || clean === 'NQ') {
    return 'OANDA:NAS100USD';
  }
  if (clean === 'BLACKBULL:US30' || clean === 'BLACKBULL:US3O' || clean === 'US30' || clean === 'US3O' || clean === 'DOW') {
    return 'OANDA:US30USD';
  }
  if (clean === 'BLACKBULL:GER40' || clean === 'BLACKBULL:DAX' || clean === 'GER40' || clean === 'DAX' || clean === 'DE30EUR') {
    return 'OANDA:DE30EUR';
  }
  if (clean === 'BLACKBULL:EURUSD') {
    return 'OANDA:EURUSD';
  }
  if (clean === 'BLACKBULL:GBPUSD') {
    return 'OANDA:GBPUSD';
  }
  if (clean === 'BLACKBULL:BTCUSD') {
    return 'BINANCE:BTCUSDT';
  }
  return clean;
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

function getAssetSymbolMatches(sym: string): string[] {
  const clean = sym.trim().toUpperCase();
  const base = clean.includes(':') ? clean.split(':')[1] : clean;
  const set = new Set<string>([clean, base]);

  // Gold aliases across all brokers (OANDA, FOREX.com, Pepperstone, FXCM, Capital.com, Saxo, TVC, etc.)
  if (base === 'XAUUSD' || base === 'GOLD' || base === 'XAU/USD' || base === 'GC1!') {
    ['XAUUSD', 'GOLD', 'GC1!', 'XAU/USD'].forEach(t => {
      set.add(t);
      set.add(`OANDA:${t}`);
      set.add(`FOREXCOM:${t}`);
      set.add(`PEPPERSTONE:${t}`);
      set.add(`FXCM:${t}`);
      set.add(`CAPITALCOM:${t}`);
      set.add(`TVC:${t}`);
      set.add(`SAXO:${t}`);
      set.add(`ICMARKETS:${t}`);
    });
  } else if (base === 'NAS100' || base === 'NAS100USD' || base === 'US100' || base === 'NQ' || base === 'NQ1!' || base === 'USTEC') {
    ['NAS100', 'NAS100USD', 'US100', 'NQ', 'NQ1!', 'USTEC'].forEach(t => {
      set.add(t);
      set.add(`OANDA:${t}`);
      set.add(`CME_MINI:${t}`);
      set.add(`FOREXCOM:${t}`);
      set.add(`PEPPERSTONE:${t}`);
      set.add(`FXCM:${t}`);
      set.add(`CAPITALCOM:${t}`);
    });
  } else if (base === 'US30' || base === 'US30USD' || base === 'US3O' || base === 'US3OUSD' || base === 'DJ30' || base === 'YM' || base === 'YM1!' || base === 'DOW') {
    ['US30', 'US30USD', 'US3O', 'YM', 'YM1!', 'DJ30', 'DOW'].forEach(t => {
      set.add(t);
      set.add(`OANDA:${t}`);
      set.add(`FOREXCOM:${t}`);
      set.add(`PEPPERSTONE:${t}`);
      set.add(`FXCM:${t}`);
      set.add(`CAPITALCOM:${t}`);
    });
  } else if (base === 'GER40' || base === 'DE30EUR' || base === 'DAX' || base === 'DAX40' || base === 'DE40') {
    ['GER40', 'DE30EUR', 'DAX', 'DAX40', 'DE40'].forEach(t => {
      set.add(t);
      set.add(`OANDA:${t}`);
      set.add(`FXCM:${t}`);
    });
  } else if (base === 'EURUSD' || base === 'EUR/USD') {
    ['EURUSD', 'EUR/USD'].forEach(t => {
      set.add(t);
      set.add(`OANDA:${t}`);
      set.add(`FOREXCOM:${t}`);
      set.add(`PEPPERSTONE:${t}`);
      set.add(`FXCM:${t}`);
    });
  } else if (base === 'GBPUSD' || base === 'GBP/USD') {
    ['GBPUSD', 'GBP/USD'].forEach(t => {
      set.add(t);
      set.add(`OANDA:${t}`);
      set.add(`FOREXCOM:${t}`);
      set.add(`PEPPERSTONE:${t}`);
      set.add(`FXCM:${t}`);
    });
  } else if (base === 'BTCUSD' || base === 'BTCUSDT' || base === 'BITCOIN') {
    ['BTCUSD', 'BTCUSDT', 'BITCOIN'].forEach(t => {
      set.add(t);
      set.add(`BINANCE:${t}`);
      set.add(`BYBIT:${t}`);
    });
  } else if (base === 'ES1!' || base === 'SPX' || base === 'US500' || base === 'SP500') {
    ['ES1!', 'SPX', 'US500', 'SP500'].forEach(t => {
      set.add(t);
      set.add(`CME_MINI:${t}`);
    });
  } else if (base === 'DXY' || base === 'USDX' || base === 'DX1!') {
    ['DXY', 'USDX', 'DX1!'].forEach(t => {
      set.add(t);
      set.add(`CAPITALCOM:${t}`);
      set.add(`TVC:${t}`);
    });
  } else {
    set.add(`OANDA:${base}`);
  }

  return Array.from(set);
}

/**
 * GET /api/chart-drawings
 * Public route for all visitors and users to fetch published admin drawings for a symbol, timeframe, and strategy.
 */
router.get('/', async (req: Request, res: Response): Promise<void> => {
  try {
    const pool = getDbPool();
    const rawSymbol = String(req.query.symbol || 'OANDA:XAUUSD');
    const symbol = normalizeSymbol(rawSymbol);
    const interval = normalizeInterval(String(req.query.interval || 'ALL'));
    const strategy = normalizeStrategy(req.query.strategy ? String(req.query.strategy) : undefined);

    // Match symbol across all broker prefixes and asset aliases
    const symbolMatches = getAssetSymbolMatches(symbol);
    const baseTicker = symbol.includes(':') ? symbol.split(':')[1] : symbol;

    // Drawings are strictly partitioned by Strategy View (144, SMC, Fibonacci, or default)
    const query = `
      SELECT id, symbol, interval, strategy, type, data, created_by, updated_at
      FROM chart_drawings
      WHERE (
        symbol = ANY($1::text[])
        OR symbol LIKE ('%:' || $2)
      )
      AND (
        strategy = $3 
        OR ($3 = 'default' AND (strategy IS NULL OR strategy = 'default' OR strategy = ''))
      )
      ORDER BY created_at ASC
    `;

    const result = await pool.query(query, [symbolMatches, baseTicker, strategy]);

    const drawings = result.rows
      .map(row => {
        // Ensure data is parsed object
        const parsed = typeof row.data === 'string' ? JSON.parse(row.data) : row.data;
        return {
          ...parsed,
          id: row.id,
          type: row.type || parsed.type,
          strategy: row.strategy || 'default',
        };
      })
      .filter(d => {
        if (!d || !Array.isArray(d.anchors) || d.anchors.length === 0) return false;
        // Verify anchor prices are valid finite positive numbers within realistic financial bounds
        return d.anchors.every((a: any) => {
          const p = typeof a?.price === 'number' ? a.price : parseFloat(a?.price);
          const t = typeof a?.time === 'number' ? a.time : parseFloat(a?.time);
          return !isNaN(p) && isFinite(p) && p > 0 && p < 1e9 && !isNaN(t) && t > 0;
        });
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
    const rawSymbol = String(req.body.symbol || 'OANDA:XAUUSD');
    const symbol = normalizeSymbol(rawSymbol);
    const interval = normalizeInterval(String(req.body.interval || '15'));
    const strategy = normalizeStrategy(req.body.strategy ? String(req.body.strategy) : undefined);
    const rawDrawings = Array.isArray(req.body.drawings) ? req.body.drawings : [];
    const allowClearAll = req.body.allowClearAll === true;
    const createdBy = req.user?.username || 'admin';

    // Deduplicate drawings by id, keeping the latest valid version
    const drawingMap = new Map<string, any>();
    for (const d of rawDrawings) {
      if (!d) continue;
      const id = String(d.id || '').trim();
      if (!id) continue;
      if (!Array.isArray(d.anchors) || d.anchors.length === 0) continue;
      const allValid = d.anchors.every((a: any) => {
        const p = typeof a?.price === 'number' ? a.price : parseFloat(a?.price);
        const t = typeof a?.time === 'number' ? a.time : parseFloat(a?.time);
        return !isNaN(p) && isFinite(p) && p > 0 && p < 1e9 && !isNaN(t) && t > 0;
      });
      if (!allValid) continue;
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

    // CRITICAL: An empty drawing array such as drawings: [] must NEVER be interpreted as an automatic delete!
    // Empty payloads from initialization, loading, synchronization, or accidental calls are strictly rejected.
    // Deletion must be MANUAL ONLY via the explicit /delete-strategy endpoint with confirmation.
    if (validDrawings.length === 0) {
      console.warn(`[Chart Drawings API] Rejected batch save with 0 valid drawings for ${symbol} (${strategy}). Manual Save Only policy in effect.`);
      res.status(400).json({
        status: 'ignored',
        error: 'Empty drawings payload cannot overwrite or delete saved strategy. To delete, use the explicit Clear/Delete Strategy action.',
        count: 0
      });
      return;
    }

    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      const symbolMatches = getAssetSymbolMatches(symbol);
      const baseTicker = symbol.includes(':') ? symbol.split(':')[1] : symbol;

      // 1. Remove drawings for this symbol & strategy that are NOT present in the incoming batch
      const placeholders = validIds.map((_, i) => `$${i + 4}`).join(', ');
      await client.query(
        `DELETE FROM chart_drawings 
         WHERE (
           symbol = ANY($1::text[])
           OR symbol LIKE ('%:' || $2)
         )
         AND (
           strategy = $3 
           OR ($3 = 'default' AND (strategy IS NULL OR strategy = 'default' OR strategy = ''))
         )
         AND id NOT IN (${placeholders})`,
        [symbolMatches, baseTicker, strategy, ...validIds]
      );

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
 * POST /api/chart-drawings/delete-strategy
 * MANUAL ONLY: Explicitly deletes all drawings for a specific strategy & symbol.
 * Requires admin or super_admin role AND confirmation flag: confirmManualDelete === true.
 */
router.post('/delete-strategy', authenticateToken, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userRole = req.user?.role;
    if (userRole !== 'super_admin' && userRole !== 'admin') {
      res.status(403).json({ error: 'Forbidden. Admin or Super Admin role required to delete strategy.' });
      return;
    }

    const confirmManualDelete = req.body.confirmManualDelete === true;
    if (!confirmManualDelete) {
      res.status(400).json({ error: 'Manual delete action requires explicit confirmation: confirmManualDelete: true' });
      return;
    }

    const pool = getDbPool();
    const rawSymbol = String(req.body.symbol || 'OANDA:XAUUSD');
    const symbol = normalizeSymbol(rawSymbol);
    const strategy = normalizeStrategy(req.body.strategy ? String(req.body.strategy) : undefined);
    const symbolMatches = getAssetSymbolMatches(symbol);
    const baseTicker = symbol.includes(':') ? symbol.split(':')[1] : symbol;

    const result = await pool.query(
      `DELETE FROM chart_drawings 
       WHERE (
         symbol = ANY($1::text[])
         OR symbol LIKE ('%:' || $2)
       )
       AND (
         strategy = $3 
         OR ($3 = 'default' AND (strategy IS NULL OR strategy = 'default' OR strategy = ''))
       )`,
      [symbolMatches, baseTicker, strategy]
    );

    res.json({
      status: 'ok',
      message: 'Strategy drawings permanently deleted from database',
      deletedCount: result.rowCount,
      symbol,
      strategy,
    });
  } catch (err: any) {
    console.error('[Chart Drawings API] Delete strategy error:', err.message);
    res.status(500).json({ status: 'error', error: err.message });
  }
});

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
