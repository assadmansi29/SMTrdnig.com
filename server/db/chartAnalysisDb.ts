import { Pool as PgPool } from 'pg';

export type AnalysisBias = 'bullish' | 'bearish' | 'neutral';

export type DrawingType = 
  | 'order_block' 
  | 'fvg' 
  | 'key_level' 
  | 'market_structure' 
  | 'trendline' 
  | 'callout';

export interface BaseDrawing {
  id: string;
  type: DrawingType;
  label: string;
  color?: string;
}

export interface OrderBlockDrawing extends BaseDrawing {
  type: 'order_block';
  subType: 'bullish_demand' | 'bearish_supply';
  priceHigh: number;
  priceLow: number;
  timeframe?: string;
  tested?: boolean;
}

export interface FvgDrawing extends BaseDrawing {
  type: 'fvg';
  subType: 'bullish' | 'bearish';
  priceHigh: number;
  priceLow: number;
  timeframe?: string;
}

export interface KeyLevelDrawing extends BaseDrawing {
  type: 'key_level';
  subType: 'support' | 'resistance' | 'equal_highs' | 'equal_lows' | 'daily_open' | 'session_high' | 'session_low';
  price: number;
  lineStyle?: 'solid' | 'dashed' | 'dotted';
}

export interface MarketStructureDrawing extends BaseDrawing {
  type: 'market_structure';
  subType: 'bos' | 'choch' | 'liquidity_sweep';
  direction: 'bullish' | 'bearish';
  price: number;
}

export interface TrendlineDrawing extends BaseDrawing {
  type: 'trendline';
  priceStart: number;
  priceEnd: number;
  direction?: 'up' | 'down' | 'horizontal';
}

export interface CalloutDrawing extends BaseDrawing {
  type: 'callout';
  price: number;
  text: string;
}

export type ChartDrawing = 
  | OrderBlockDrawing 
  | FvgDrawing 
  | KeyLevelDrawing 
  | MarketStructureDrawing 
  | TrendlineDrawing 
  | CalloutDrawing;

export interface TradeSetup {
  direction: 'long' | 'short';
  entryPrice: number;
  stopLoss: number;
  takeProfit1: number;
  takeProfit2?: number;
  takeProfit3?: number;
  riskRewardRatio: number;
  status: 'pending' | 'active' | 'tp_hit' | 'sl_hit' | 'closed';
  invalidationLevel?: number;
  notes?: string;
}

export interface ChartAnalysisRecord {
  id: string;
  symbol: string;
  interval: string;
  title: string;
  bias: AnalysisBias;
  summary?: string;
  drawings: ChartDrawing[];
  tradeSetup?: TradeSetup;
  authorId: string;
  authorUsername: string;
  authorRole: string;
  isPublished: boolean;
  publishedAt?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateAnalysisInput {
  symbol: string;
  interval: string;
  title: string;
  bias: AnalysisBias;
  summary?: string;
  drawings?: ChartDrawing[];
  tradeSetup?: TradeSetup;
  isPublished?: boolean;
  authorId: string;
  authorUsername: string;
  authorRole: string;
}

export interface UpdateAnalysisInput {
  symbol?: string;
  interval?: string;
  title?: string;
  bias?: AnalysisBias;
  summary?: string;
  drawings?: ChartDrawing[];
  tradeSetup?: TradeSetup;
  isPublished?: boolean;
}

/**
 * Initializes and migrates the admin_chart_analyses table in PostgreSQL.
 */
export async function ensureChartAnalysisTable(pool: PgPool): Promise<void> {
  const client = await pool.connect();
  try {
    await client.query(`
      CREATE TABLE IF NOT EXISTS admin_chart_analyses (
        id VARCHAR(64) PRIMARY KEY,
        symbol VARCHAR(64) NOT NULL,
        interval VARCHAR(16) NOT NULL,
        title VARCHAR(255) NOT NULL,
        bias VARCHAR(20) NOT NULL DEFAULT 'neutral',
        summary TEXT,
        drawings JSONB NOT NULL DEFAULT '[]',
        trade_setup JSONB,
        author_id VARCHAR(64) NOT NULL,
        author_username VARCHAR(100) NOT NULL,
        author_role VARCHAR(32) NOT NULL,
        is_published BOOLEAN DEFAULT false,
        published_at TIMESTAMPTZ,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      );

      CREATE INDEX IF NOT EXISTS idx_chart_analyses_lookup 
      ON admin_chart_analyses (symbol, interval, is_published);

      CREATE INDEX IF NOT EXISTS idx_chart_analyses_author 
      ON admin_chart_analyses (author_id);

      CREATE INDEX IF NOT EXISTS idx_chart_analyses_updated 
      ON admin_chart_analyses (updated_at DESC);
    `);
    console.log('[PostgreSQL] Table admin_chart_analyses verified and ready.');
  } catch (err: any) {
    console.error('[PostgreSQL Error] Failed ensuring admin_chart_analyses table:', err.message);
    throw err;
  } finally {
    client.release();
  }
}

function mapRow(row: any): ChartAnalysisRecord {
  return {
    id: row.id,
    symbol: row.symbol,
    interval: row.interval,
    title: row.title,
    bias: row.bias as AnalysisBias,
    summary: row.summary || undefined,
    drawings: typeof row.drawings === 'string' ? JSON.parse(row.drawings) : (row.drawings || []),
    tradeSetup: typeof row.trade_setup === 'string' ? JSON.parse(row.trade_setup) : (row.trade_setup || undefined),
    authorId: row.author_id,
    authorUsername: row.author_username,
    authorRole: row.author_role,
    isPublished: Boolean(row.is_published),
    publishedAt: row.published_at ? new Date(row.published_at).toISOString() : null,
    createdAt: new Date(row.created_at).toISOString(),
    updatedAt: new Date(row.updated_at).toISOString(),
  };
}

export class ChartAnalysisDb {
  /**
   * Public retrieval: Only published analyses, optionally filtered by symbol and/or interval
   */
  static async getPublishedAnalyses(
    pool: PgPool,
    options?: { symbol?: string; interval?: string }
  ): Promise<ChartAnalysisRecord[]> {
    const conditions: string[] = ['is_published = true'];
    const values: any[] = [];
    let idx = 1;

    if (options?.symbol) {
      // Normalize symbol matching: e.g. "XAUUSD" matches "OANDA:XAUUSD" or "XAUUSD"
      const sym = options.symbol.trim();
      const baseSym = sym.includes(':') ? sym.split(':')[1] : sym;
      conditions.push(`(symbol = $${idx} OR symbol ILIKE $${idx + 1} OR symbol ILIKE $${idx + 2})`);
      values.push(sym, `%:${baseSym}`, `${baseSym}`);
      idx += 3;
    }

    if (options?.interval) {
      conditions.push(`interval = $${idx}`);
      values.push(options.interval.trim());
      idx++;
    }

    const query = `
      SELECT * FROM admin_chart_analyses
      WHERE ${conditions.join(' AND ')}
      ORDER BY updated_at DESC
      LIMIT 50
    `;

    const res = await pool.query(query, values);
    return res.rows.map(mapRow);
  }

  /**
   * Admin retrieval: All analyses (drafts and published) with optional filters
   */
  static async getAllForAdmin(
    pool: PgPool,
    options?: { symbol?: string; isPublished?: boolean }
  ): Promise<ChartAnalysisRecord[]> {
    const conditions: string[] = [];
    const values: any[] = [];
    let idx = 1;

    if (options?.symbol) {
      const sym = options.symbol.trim();
      const baseSym = sym.includes(':') ? sym.split(':')[1] : sym;
      conditions.push(`(symbol = $${idx} OR symbol ILIKE $${idx + 1} OR symbol ILIKE $${idx + 2})`);
      values.push(sym, `%:${baseSym}`, `${baseSym}`);
      idx += 3;
    }

    if (options?.isPublished !== undefined) {
      conditions.push(`is_published = $${idx}`);
      values.push(options.isPublished);
      idx++;
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    const query = `
      SELECT * FROM admin_chart_analyses
      ${whereClause}
      ORDER BY updated_at DESC
      LIMIT 100
    `;

    const res = await pool.query(query, values);
    return res.rows.map(mapRow);
  }

  /**
   * Get single analysis by ID
   */
  static async getById(pool: PgPool, id: string): Promise<ChartAnalysisRecord | null> {
    const res = await pool.query(
      'SELECT * FROM admin_chart_analyses WHERE id = $1 LIMIT 1',
      [id]
    );
    if (res.rows.length === 0) return null;
    return mapRow(res.rows[0]);
  }

  /**
   * Create a new chart analysis
   */
  static async create(pool: PgPool, input: CreateAnalysisInput): Promise<ChartAnalysisRecord> {
    const id = `analysis_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
    const isPublished = Boolean(input.isPublished);
    const publishedAt = isPublished ? new Date() : null;

    const res = await pool.query(
      `
      INSERT INTO admin_chart_analyses (
        id, symbol, interval, title, bias, summary, 
        drawings, trade_setup, author_id, author_username, 
        author_role, is_published, published_at, created_at, updated_at
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, NOW(), NOW())
      RETURNING *
      `,
      [
        id,
        input.symbol.trim(),
        input.interval.trim(),
        input.title.trim(),
        input.bias,
        input.summary?.trim() || null,
        JSON.stringify(input.drawings || []),
        input.tradeSetup ? JSON.stringify(input.tradeSetup) : null,
        input.authorId,
        input.authorUsername,
        input.authorRole,
        isPublished,
        publishedAt,
      ]
    );

    return mapRow(res.rows[0]);
  }

  /**
   * Update an existing chart analysis
   */
  static async update(
    pool: PgPool,
    id: string,
    input: UpdateAnalysisInput
  ): Promise<ChartAnalysisRecord | null> {
    const existing = await this.getById(pool, id);
    if (!existing) return null;

    const fields: string[] = ['updated_at = NOW()'];
    const values: any[] = [];
    let idx = 1;

    if (input.symbol !== undefined) {
      fields.push(`symbol = $${idx++}`);
      values.push(input.symbol.trim());
    }

    if (input.interval !== undefined) {
      fields.push(`interval = $${idx++}`);
      values.push(input.interval.trim());
    }

    if (input.title !== undefined) {
      fields.push(`title = $${idx++}`);
      values.push(input.title.trim());
    }

    if (input.bias !== undefined) {
      fields.push(`bias = $${idx++}`);
      values.push(input.bias);
    }

    if (input.summary !== undefined) {
      fields.push(`summary = $${idx++}`);
      values.push(input.summary ? input.summary.trim() : null);
    }

    if (input.drawings !== undefined) {
      fields.push(`drawings = $${idx++}`);
      values.push(JSON.stringify(input.drawings));
    }

    if (input.tradeSetup !== undefined) {
      fields.push(`trade_setup = $${idx++}`);
      values.push(input.tradeSetup ? JSON.stringify(input.tradeSetup) : null);
    }

    if (input.isPublished !== undefined) {
      fields.push(`is_published = $${idx++}`);
      values.push(input.isPublished);

      if (input.isPublished && !existing.isPublished) {
        fields.push(`published_at = NOW()`);
      } else if (!input.isPublished) {
        fields.push(`published_at = NULL`);
      }
    }

    values.push(id);
    const query = `
      UPDATE admin_chart_analyses
      SET ${fields.join(', ')}
      WHERE id = $${idx}
      RETURNING *
    `;

    const res = await pool.query(query, values);
    if (res.rows.length === 0) return null;
    return mapRow(res.rows[0]);
  }

  /**
   * Delete an analysis
   */
  static async delete(pool: PgPool, id: string): Promise<boolean> {
    const res = await pool.query('DELETE FROM admin_chart_analyses WHERE id = $1', [id]);
    return (res.rowCount ?? 0) > 0;
  }
}
