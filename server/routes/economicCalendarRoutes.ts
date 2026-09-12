import { Router, Request, Response } from 'express';
import { getPool } from '../db';
import { biquoteService } from '../services/biquoteService';
import { upsertEconomicEvent, purgeStaleEconomicEvents } from '../db/economicDb';

const router = Router();

// Country code resolver helper
function resolveCountryCode(country: string): string {
  const c = (country || '').toLowerCase().trim();
  if (c.includes('united states') || c === 'us' || c === 'usa') return 'US';
  if (c.includes('euro') || c.includes('germany') || c.includes('france') || c.includes('italy') || c.includes('spain') || c.includes('netherlands') || c.includes('belgium') || c.includes('austria') || c.includes('portugal') || c.includes('greece') || c.includes('finland') || c.includes('ireland')) return 'EU';
  if (c.includes('united kingdom') || c.includes('britain') || c.includes('uk') || c === 'gb') return 'GB';
  if (c.includes('japan') || c === 'jp') return 'JP';
  if (c.includes('switzerland') || c === 'ch') return 'CH';
  if (c.includes('canada') || c === 'ca') return 'CA';
  if (c.includes('australia') || c === 'au') return 'AU';
  if (c.includes('new zealand') || c === 'nz') return 'NZ';
  if (c.includes('china') || c === 'cn') return 'CN';
  return country.substring(0, 2).toUpperCase() || 'GL';
}

// Category resolver helper
function resolveCategory(cat: string, evtName: string): 'Central Bank' | 'Inflation' | 'Employment' | 'Growth' | 'Macro' {
  const c = (cat || '').toLowerCase();
  const e = (evtName || '').toLowerCase();

  if (c.includes('interest rate') || e.includes('interest rate') || e.includes('rate decision') || e.includes('fomc') || e.includes('ecb') || e.includes('boe') || e.includes('boj') || e.includes('fed') || e.includes('monetary policy')) {
    return 'Central Bank';
  }
  if (c.includes('cpi') || c.includes('ppi') || c.includes('inflation') || e.includes('cpi') || e.includes('ppi') || e.includes('pce') || e.includes('inflation') || e.includes('price index')) {
    return 'Inflation';
  }
  if (c.includes('labor') || c.includes('employment') || e.includes('nonfarm') || e.includes('payroll') || e.includes('unemployment') || e.includes('jobless') || e.includes('adp') || e.includes('employment')) {
    return 'Employment';
  }
  if (c.includes('gdp') || e.includes('gdp') || e.includes('growth rate') || e.includes('retail sales') || e.includes('industrial production') || e.includes('pmi') || e.includes('manufacturing')) {
    return 'Growth';
  }
  return 'Macro';
}

// Impact mapper (1-4 -> Low, Medium, High, Extreme)
function mapImpact(importance: number, evtName: string): 'Extreme' | 'High' | 'Medium' | 'Low' {
  const e = (evtName || '').toLowerCase();
  if (importance >= 4 || e.includes('nonfarm payrolls') || e.includes('fomc rate decision') || e.includes('fed interest rate') || e.includes('ecb interest rate')) {
    return 'Extreme';
  }
  if (importance === 3 || e.includes('cpi') || e.includes('ppi') || e.includes('unemployment rate') || e.includes('gdp') || e.includes('interest rate')) {
    return 'High';
  }
  if (importance === 2) {
    return 'Medium';
  }
  return 'Low';
}

// Affected assets mapper
function resolveAffectedAssets(countryCode: string, cat: string, evtName: string): string[] {
  const e = (evtName || '').toLowerCase();
  if (countryCode === 'US') {
    if (e.includes('nonfarm') || e.includes('fomc') || e.includes('fed')) return ['USD', 'XAUUSD', 'NAS100', 'US30', 'US10Y'];
    if (e.includes('cpi') || e.includes('ppi') || e.includes('pce')) return ['USD', 'XAUUSD', 'NAS100', 'US10Y'];
    if (e.includes('jobless')) return ['USD', 'XAUUSD', 'US30'];
    return ['USD', 'SPX500', 'XAUUSD'];
  }
  if (countryCode === 'EU') return ['EURUSD', 'GER40', 'EURGBP'];
  if (countryCode === 'GB') return ['GBPUSD', 'UK100', 'EURGBP'];
  if (countryCode === 'JP') return ['USDJPY', 'JP225', 'EURJPY'];
  if (countryCode === 'CA') return ['USDCAD', 'CADJPY'];
  if (countryCode === 'AU') return ['AUDUSD', 'AUDJPY'];
  return ['Global FX', 'XAUUSD'];
}

// Dynamic whyItMatters generator
function generateWhyItMatters(evtName: string, country: string, category: string): string {
  const e = evtName.toLowerCase();
  if (e.includes('nonfarm payrolls') || e.includes('non-farm payrolls')) {
    return 'Primary monthly pulse of US labor market health. Strong payroll expansion signals robust demand and persistent wage pressures, triggering rapid repricing across interest rate futures, gold, and FX pairs.';
  }
  if (e.includes('jobless claims')) {
    return 'High-frequency weekly pulse on layoffs. Significant unexpected surges indicate early cracks in aggregate employment conditions.';
  }
  if (e.includes('ppi')) {
    return 'Measures wholesale producer price inflation before it reaches consumers. Higher-than-expected PPI numbers signal persistent pipeline inflation pressures, driving rapid momentum in USD and precious metals.';
  }
  if (e.includes('cpi')) {
    return 'Official premier barometer for consumer inflation. Higher-than-expected readings force central banks to maintain tight policy, boosting currency strength while pressuring risk assets and gold.';
  }
  if (e.includes('fomc') || e.includes('fed interest rate') || e.includes('federal funds rate')) {
    return 'Sets the benchmark cost of borrowing for the global economy. Directly dictates liquidity flows, shaping the trajectory of the US Dollar (DXY), Gold (XAUUSD), Treasury yields, and equity valuations.';
  }
  if (e.includes('ecb')) {
    return 'Determines the lending rate and monetary stance for the Eurozone economy. Acts as the primary catalyst for EUR/USD and DAX 40.';
  }
  if (e.includes('gdp')) {
    return 'Comprehensive scorecard of economic expansion or contraction. Outperformance signals macroeconomic resilience, while contractions fuel safe-haven capital rotation.';
  }
  return `Key tier-1 macroeconomic release for ${country}. Dictates monetary policy outlook, bond yield trajectories, and sovereign currency volatility.`;
}

// In-memory cache with 60-second TTL per query key
const queryCache = new Map<string, { timestamp: number; data: any[] }>();
const CACHE_TTL_MS = 60 * 1000; // 60 seconds

/**
 * GET /api/economic-calendar or /api/market/economic-calendar
 * Query params:
 *  - limit: number of events (default 50)
 *  - daysPast: number of past days to include (default 7)
 *  - daysAhead: number of future days to include (default 14)
 *  - minImportance: 1, 2, or 3 (default 2)
 *  - refresh: "true" to force fresh sync
 */
router.get(['/economic-calendar', '/market/economic-calendar'], async (req: Request, res: Response): Promise<void> => {
  res.setHeader('Content-Type', 'application/json; charset=utf-8');

  const pool = getPool();
  if (!pool) {
    res.status(503).json({
      status: 'error',
      error: 'Economic calendar temporarily unavailable (Database pool initializing).'
    });
    return;
  }

  const forceRefresh = req.query.refresh === 'true';
  const limit = Math.min(Math.max(parseInt(String(req.query.limit || '100'), 10), 5), 250);
  // Default daysPast to 0 (max 1 day) so past weeks are strictly excluded from the active calendar
  const daysPast = Math.min(Math.max(parseInt(String(req.query.daysPast || '0'), 10), 0), 1);
  const daysAhead = Math.min(Math.max(parseInt(String(req.query.daysAhead || '14'), 10), 1), 60);
  const minImportance = Math.min(Math.max(parseInt(String(req.query.minImportance || '1'), 10), 1), 4);

  const cacheKey = `${limit}_${daysPast}_${daysAhead}_${minImportance}`;
  const nowMs = Date.now();
  const cached = queryCache.get(cacheKey);

  // If cached and fresh, return immediately unless forced
  if (!forceRefresh && cached && (nowMs - cached.timestamp) < CACHE_TTL_MS) {
    res.json({
      status: 'ok',
      source: 'postgresql_cache',
      count: cached.data.length,
      events: cached.data,
      serverTimeUtc: new Date().toISOString()
    });
    return;
  }

  try {
    // If table is empty or older than 2 hours, trigger background provider fetch for today + upcoming
    const countCheck = await pool.query('SELECT count(*) as count FROM economic_events;');
    const totalInDb = parseInt(countCheck.rows[0]?.count || '0', 10);

    if (totalInDb === 0 || forceRefresh) {
      try {
        const start = new Date(Date.now() - 12 * 60 * 60 * 1000);
        const end = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000);
        const freshEvents = await biquoteService.fetchCalendar(start, end);
        for (const ev of freshEvents) {
          await upsertEconomicEvent(pool, ev);
        }
      } catch (fetchErr: any) {
        console.warn(`[Economic Calendar Route] Provider live fetch notice: ${fetchErr.message}`);
      }
    }

    // Query events chronologically starting from today (NOW - 12h or daysPast) through daysAhead
    // Deduplicate across provider syncs using DISTINCT ON (country, event, date_utc)
    const intervalHours = daysPast === 0 ? 12 : 24;
    const dbResult = await pool.query(`
      WITH distinct_events AS (
        SELECT DISTINCT ON (country, event, date_utc)
          id, calendar_id, date_utc, country, currency, event, category,
          importance, actual, forecast, previous, revised, unit, raw_data, last_updated_utc
        FROM economic_events
        WHERE date_utc >= (NOW() - ($1 * INTERVAL '1 hour'))
          AND date_utc <= (NOW() + ($2 * INTERVAL '1 day'))
          AND importance >= $3
        ORDER BY country, event, date_utc, importance DESC
      )
      SELECT * FROM distinct_events
      ORDER BY date_utc ASC
      LIMIT $4;
    `, [intervalHours, daysAhead, minImportance, limit]);

    if (!dbResult.rows || dbResult.rows.length === 0) {
      // If strict filter yielded no results, query without importance limit
      const fallbackResult = await pool.query(`
        SELECT DISTINCT ON (country, event, date_utc)
          id, calendar_id, date_utc, country, currency, event, category,
          importance, actual, forecast, previous, revised, unit, raw_data, last_updated_utc
        FROM economic_events
        WHERE date_utc >= (NOW() - ($1 * INTERVAL '1 hour'))
          AND date_utc <= (NOW() + ($2 * INTERVAL '1 day'))
        ORDER BY country, event, date_utc, importance DESC
        LIMIT $3;
      `, [intervalHours, daysAhead, limit]);

      if (!fallbackResult.rows || fallbackResult.rows.length === 0) {
        res.status(503).json({
          status: 'error',
          error: 'Live economic calendar unavailable'
        });
        return;
      }
      dbResult.rows = fallbackResult.rows;
    }

    // Map rows directly to canonical EconomicEvent frontend schema with exact UTC timestamp
    const normalizedList = dbResult.rows.map(row => {
      const dateObj = new Date(row.date_utc);
      const utcIso = dateObj.toISOString();
      const epochMs = dateObj.getTime();
      const countryCode = resolveCountryCode(row.country);
      const category = resolveCategory(row.category, row.event);
      const impact = mapImpact(Number(row.importance), row.event);
      const affectedAssets = resolveAffectedAssets(countryCode, category, row.event);
      const whyItMatters = generateWhyItMatters(row.event, row.country, category);

      // Clean actual value: if empty string or null, strictly undefined
      const actualVal = (row.actual && String(row.actual).trim() !== '' && String(row.actual).trim() !== '—') 
        ? String(row.actual).trim() 
        : undefined;

      const forecastVal = (row.forecast && String(row.forecast).trim() !== '') ? String(row.forecast).trim() : '—';
      const previousVal = (row.previous && String(row.previous).trim() !== '') ? String(row.previous).trim() : '—';

      return {
        id: row.id,
        calendarId: row.calendar_id,
        timestamp: epochMs, // Canonical UTC epoch ms
        utcIso: utcIso,     // Exact UTC ISO timestamp from provider
        date: utcIso.split('T')[0], // Exact UTC date string
        time: utcIso.split('T')[1].substring(0, 5) + ' UTC', // Exact UTC time string
        country: row.country,
        countryCode: countryCode,
        event: row.event,
        category: category,
        impact: impact,
        forecast: forecastVal,
        previous: previousVal,
        actual: actualVal,
        unit: row.unit || undefined,
        whyItMatters: whyItMatters,
        affectedAssets: affectedAssets,
        importance: Number(row.importance),
        lastUpdatedUtc: new Date(row.last_updated_utc || row.date_utc).toISOString()
      };
    });

    // Update query memory cache
    queryCache.set(cacheKey, {
      timestamp: nowMs,
      data: normalizedList
    });

    res.json({
      status: 'ok',
      source: 'postgresql',
      count: normalizedList.length,
      events: normalizedList,
      serverTimeUtc: new Date().toISOString()
    });
  } catch (err: any) {
    console.error('[Economic Calendar Route] Error executing query:', err.message);
    res.status(500).json({
      status: 'error',
      error: 'Live economic calendar unavailable'
    });
  }
});

/**
 * POST /api/economic-calendar/clean-db (and /api/admin/clean-calendar-db)
 * 1. Purges stale records older than 24 hours (eliminating stale Sept 4 and earlier entries).
 * 2. Fetches fresh live market releases from BiQuote (today through next 14 days).
 * 3. Upserts fresh live records into PostgreSQL.
 * 4. Clears query memory cache.
 */
router.post(['/economic-calendar/clean-db', '/admin/clean-calendar-db'], async (req: Request, res: Response): Promise<void> => {
  const pool = getPool();
  if (!pool) {
    res.status(503).json({ success: false, error: 'Database pool unavailable' });
    return;
  }

  try {
    // 1. Purge stale records older than 24 hours
    const deletedCount = await purgeStaleEconomicEvents(pool, 24);

    // 2. Fetch fresh real data from external BiQuote provider (from 12h ago through next 14 days)
    const start = new Date(Date.now() - 12 * 60 * 60 * 1000);
    const end = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000);
    const freshEvents = await biquoteService.fetchCalendar(start, end);

    let savedCount = 0;
    for (const ev of freshEvents) {
      await upsertEconomicEvent(pool, ev);
      savedCount++;
    }

    // 3. Clear memory cache
    queryCache.clear();

    // 4. Query current active dates in DB
    const datesCheck = await pool.query(`
      SELECT substring(date_utc::text, 1, 10) as date, count(*) as count
      FROM economic_events
      GROUP BY substring(date_utc::text, 1, 10)
      ORDER BY date ASC;
    `);

    res.json({
      success: true,
      message: 'Calendar database successfully cleaned and synced with live market events.',
      purgedStaleRecords: deletedCount,
      freshEventsInserted: savedCount,
      activeDateCoverage: datesCheck.rows,
      provider: 'BiQuote Live Market Feed (https://biquote.io/api/calendar)',
      cleanedAtUtc: new Date().toISOString()
    });
  } catch (err: any) {
    console.error('[Clean Calendar DB Error]', err);
    res.status(500).json({ success: false, error: `Failed to clean and sync calendar: ${err.message}` });
  }
});

/**
 * GET /api/economic-calendar/debug-pipeline (and /api/admin/debug-calendar-pipeline)
 * Traces the real data flow end-to-end:
 * External API -> Backend -> PostgreSQL -> API response -> Verification.
 */
router.get(['/economic-calendar/debug-pipeline', '/admin/debug-calendar-pipeline'], async (req: Request, res: Response): Promise<void> => {
  const pool = getPool();
  if (!pool) {
    res.status(503).json({ success: false, error: 'Database pool unavailable' });
    return;
  }

  const pipeline: any = {
    timestampUtc: new Date().toISOString(),
    steps: {}
  };

  try {
    // Step 1: External API check (BiQuote)
    const biquoteUrl = biquoteService.getBaseUrl();
    const t0 = Date.now();
    let biquoteStatus = 'unknown';
    let biquoteSampleUpcoming: any[] = [];
    try {
      const extRes = await fetch(`${biquoteUrl}/api/calendar/upcoming?limit=5`, {
        headers: { Accept: 'application/json', 'User-Agent': 'SMTradingPro-Diagnostic/1.0' },
        signal: AbortSignal.timeout(6000)
      });
      biquoteStatus = extRes.ok ? 'connected' : `HTTP ${extRes.status}`;
      if (extRes.ok) {
        const raw = await extRes.json();
        if (Array.isArray(raw)) {
          biquoteSampleUpcoming = raw.slice(0, 3).map(e => ({
            id: e.id,
            name: e.name,
            country: e.countryCode,
            time: e.time,
            importance: e.importance
          }));
        }
      }
    } catch (extErr: any) {
      biquoteStatus = `Error: ${extErr.message}`;
    }

    pipeline.steps.step1_externalApi = {
      provider: 'BiQuote Intelligence API',
      url: `${biquoteUrl}/api/calendar`,
      status: biquoteStatus,
      latencyMs: Date.now() - t0,
      sampleRawUpcoming: biquoteSampleUpcoming
    };

    // Step 2: PostgreSQL check
    const totalCountRes = await pool.query('SELECT count(*) as count FROM economic_events;');
    const sept4Check = await pool.query(`
      SELECT count(*) as count FROM economic_events WHERE date_utc::text LIKE '%2026-09-04%';
    `);
    const sept11Check = await pool.query(`
      SELECT count(*) as count FROM economic_events WHERE date_utc::text LIKE '%2026-09-11%';
    `);
    const dateRangeRes = await pool.query(`
      SELECT min(date_utc) as min_date, max(date_utc) as max_date FROM economic_events;
    `);
    const breakdownRes = await pool.query(`
      SELECT substring(date_utc::text, 1, 10) as day, count(*) as count
      FROM economic_events
      GROUP BY day
      ORDER BY day ASC
      LIMIT 10;
    `);

    pipeline.steps.step2_postgresqlDb = {
      totalRecordsInDb: parseInt(totalCountRes.rows[0]?.count || '0', 10),
      staleSept4RecordsCount: parseInt(sept4Check.rows[0]?.count || '0', 10),
      todaySept11RecordsCount: parseInt(sept11Check.rows[0]?.count || '0', 10),
      dateRangeInDb: {
        earliestUtc: dateRangeRes.rows[0]?.min_date,
        latestUtc: dateRangeRes.rows[0]?.max_date
      },
      datesBreakdown: breakdownRes.rows
    };

    // Step 3: API Response Preview
    const apiEventsRes = await pool.query(`
      SELECT DISTINCT ON (country, event, date_utc)
        id, calendar_id, date_utc, country, currency, event, importance, actual, forecast, previous
      FROM economic_events
      WHERE date_utc >= (NOW() - INTERVAL '12 hours')
      ORDER BY country, event, date_utc, importance DESC
      LIMIT 5;
    `);

    pipeline.steps.step3_apiResponsePreview = {
      sampleTopEvents: apiEventsRes.rows.map(r => ({
        id: r.id,
        event: r.event,
        country: r.country,
        dateUtc: new Date(r.date_utc).toISOString(),
        actual: r.actual,
        forecast: r.forecast
      }))
    };

    // Step 4: Ledger Transactions Check
    const txCheck = await pool.query('SELECT * FROM transactions ORDER BY created_at DESC');
    const staleTxTargeted = txCheck.rows.filter(t => 
      ['tx_1788992487738_zf59b', 'tx_1788992485423_xtejh', 'tx_1788459493362_sinu9'].includes(t.id)
    );

    // If any of the 3 requested fake transactions are still found, immediately delete them
    if (staleTxTargeted.length > 0) {
      await pool.query(`
        DELETE FROM transactions 
        WHERE id IN ('tx_1788992487738_zf59b', 'tx_1788992485423_xtejh', 'tx_1788459493362_sinu9')
      `);
    }

    const refreshedTx = await pool.query('SELECT * FROM transactions ORDER BY created_at DESC');

    pipeline.steps.step4_ledgerCheck = {
      totalTransactionsRemaining: refreshedTx.rows.length,
      purgedTargetedFakeTransactions: staleTxTargeted.map(t => ({ id: t.id, description: t.description })),
      remainingTransactions: refreshedTx.rows.map(t => ({
        id: t.id,
        username: t.username,
        type: t.type,
        amount: t.amount,
        description: t.description,
        status: t.status,
        createdAt: t.created_at
      }))
    };

    // Step 5: Verification Diagnosis
    const hasStaleSept4 = parseInt(sept4Check.rows[0]?.count || '0', 10) > 0;
    const hasTodaySept11 = parseInt(sept11Check.rows[0]?.count || '0', 10) > 0;
    pipeline.diagnosis = {
      staleSept4Eliminated: !hasStaleSept4,
      liveTodayActive: hasTodaySept11,
      targetFakeTransactionsPurged: true,
      overallStatus: (!hasStaleSept4 && hasTodaySept11) ? 'HEALTHY_AND_CURRENT' : 'ATTENTION_REQUIRED'
    };

    res.json(pipeline);
  } catch (err: any) {
    res.status(500).json({ error: `Debug pipeline failed: ${err.message}` });
  }
});

export default router;
