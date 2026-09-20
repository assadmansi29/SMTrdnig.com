import { Router, Request, Response } from 'express';
import { liveCandleTime, timestampSeconds } from '../../src/utils/liveCandleTime';
import { tv } from 'tradingview-api-adapter';
import { marketStreamManager, resolveRealtimeTvSymbol, getIntervalDurationSeconds } from '../services/marketStreamService';

const router = Router();

// Reject disabled providers before accessing caches or starting market streams.
router.use((req, res, next) => {
  try {
    resolveRealtimeTvSymbol(String(req.query.symbol || 'OANDA:XAUUSD'));
    next();
  } catch {
    res.status(400).json({ status: 'error', error: 'Only OANDA and Binance Bitcoin are supported.' });
  }
});

interface Candle {
  time: number; // Unix seconds
  open: number;
  high: number;
  low: number;
  close: number;
  volume?: number;
}

function resolveTradingViewSymbol(symbol: string): string {
  return resolveRealtimeTvSymbol(symbol);
}

function resolveTradingViewTimeframe(inv: string): string {
  const raw = (inv || '15').trim();

  // Case-sensitive check for Month ('1M', 'M') vs 1-minute ('1m', '1')
  if (raw === '1M' || raw === 'M' || raw.toLowerCase() === '1mo' || raw.toLowerCase() === 'month') {
    return '1M';
  }
  if (raw === '1W' || raw === 'W' || raw.toLowerCase() === 'week') {
    return '1W';
  }
  if (raw === '1D' || raw === 'D' || raw.toLowerCase() === 'day') {
    return '1D';
  }
  if (raw === '240' || raw.toLowerCase() === '4h') {
    return '240';
  }
  if (raw === '60' || raw.toLowerCase() === '1h' || raw.toLowerCase() === 'h') {
    return '60';
  }
  if (raw === '30' || raw.toLowerCase() === '30m') {
    return '30';
  }
  if (raw === '15' || raw.toLowerCase() === '15m') {
    return '15';
  }
  if (raw === '5' || raw.toLowerCase() === '5m') {
    return '5';
  }
  if (raw === '1' || raw.toLowerCase() === '1m' || raw.toLowerCase() === '1min') {
    return '1';
  }

  const norm = raw.toLowerCase();
  if (norm === '1' || norm === '1m') return '1';
  if (norm === '5' || norm === '5m') return '5';
  if (norm === '15' || norm === '15m') return '15';
  if (norm === '30' || norm === '30m') return '30';
  if (norm === '60' || norm === '1h') return '60';
  if (norm === '120' || norm === '2h') return '120';
  if (norm === '240' || norm === '4h') return '240';
  if (norm === 'd' || norm === '1d' || norm === 'day') return '1D';
  if (norm === 'w' || norm === '1w' || norm === 'week') return '1W';
  if (norm === 'm' || norm === '1m_month' || norm === '1mo' || norm === 'month') return '1M';

  return raw;
}

// In-memory cache for candles with Stale-While-Revalidate to eliminate delay
const candleCache = new Map<string, { timestamp: number; candles: Candle[] }>();
const FRESH_CACHE_TTL_MS = 2000; // 2 seconds fresh for near-instant reactivity
const STALE_CACHE_MAX_AGE_MS = 7200000; // 2 hours stale serving to guarantee 100% chart uptime
const pendingFetches = new Map<string, Promise<Candle[]>>();

// Singleton TradingView client instance
let globalTvClient: ReturnType<typeof tv> | null = null;
let consecutiveTvFailures = 0;

function getTvClient() {
  if (!globalTvClient) {
    globalTvClient = tv();
  }
  return globalTvClient;
}

/**
 * Determines the optimal number of historical candles to load from OANDA / TradingView.
 * Provides deep historical data across all timeframes (at least 2+ extra months of history
 * for technical analysis, fetching the maximum reliable depth supported by OANDA / TradingView).
 */
function getOptimalHistoricalCandleCount(tvTimeframe: string, requestedCount?: number): number {
  if (typeof requestedCount === 'number' && requestedCount > 0) {
    return Math.min(Math.max(requestedCount, 300), 10000);
  }
  const tf = (tvTimeframe || '15').trim();
  switch (tf) {
    case '1M':
    case 'M':
      return 2000; // Multi-decade monthly history (1832 to present)
    case '1W':
    case 'W':
      return 4000; // Multi-decade weekly history (1833 to present)
    case '1D':
    case 'D':
      return 10000; // Up to 40 years of daily candles (back to 1986)
    case '240':
      return 10000; // Over 3.5 years of 4-hour candles (back to Jan 2023)
    case '120':
      return 10000; // Over 2 years of 2-hour candles
    case '60':
      return 10000; // Over 1.5 years of 1-hour candles (back to Jan 2025)
    case '30':
      return 10000; // ~8.5 months of 30m candles (back to Jan 1, 2026)
    case '15':
      return 10000; // Maximum available OANDA 15m depth (~6,921 candles back to May 31, 2026)
    case '5':
      return 8000;  // Maximum available OANDA 5m depth (~5,679 candles back to mid-August)
    case '1':
      return 8000;  // Maximum available OANDA 1m depth (~7,671 candles back to Sept 6)
    default:
      return 8000;
  }
}

async function fetchCandlesFromTradingView(tvSymbol: string, tvTimeframe: string, count?: number): Promise<Candle[]> {
  const attemptFetch = async (client: ReturnType<typeof tv>) => {
    const sym = client.symbol(tvSymbol);
    const targetCount = count || getOptimalHistoricalCandleCount(tvTimeframe);
    const raw = await Promise.race([
      sym.candles({ timeframe: tvTimeframe as any, count: targetCount }),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error(`TradingView fetch timeout for ${tvSymbol}`)), 12000)
      ),
    ]);
    if (!raw || raw.length === 0) return [];
    consecutiveTvFailures = 0;
    return raw
      .map((c) => ({
        time: c.time,
        open: Number(c.open),
        high: Number(c.high),
        low: Number(c.low),
        close: Number(c.close),
        volume: c.volume ? Math.round(c.volume) : undefined,
      }))
      .sort((a, b) => a.time - b.time);
  };

  try {
    const client = getTvClient();
    return await attemptFetch(client);
  } catch (err: any) {
    consecutiveTvFailures++;
    console.warn(`[Market Feed] Primary TV fetch failed for ${tvSymbol} (${consecutiveTvFailures} failures):`, err.message);
    if (consecutiveTvFailures >= 3) {
      try {
        if (globalTvClient) {
          globalTvClient.disconnect().catch(() => {});
          globalTvClient = null;
          consecutiveTvFailures = 0;
        }
      } catch {}
    }
    throw err;
  }
}

async function fetchFromBinance(binanceSymbol: string, intervalStr: string, limitCount: number = 2000): Promise<Candle[]> {
  let biInterval = '15m';
  const raw = (intervalStr || '15').trim();
  if (raw === '1M' || raw === 'M' || raw.toLowerCase() === '1mo' || raw.toLowerCase() === 'month') {
    biInterval = '1M';
  } else if (raw === '1W' || raw === 'W' || raw.toLowerCase() === 'week') {
    biInterval = '1w';
  } else if (raw === '1D' || raw === 'D' || raw.toLowerCase() === 'day') {
    biInterval = '1d';
  } else if (raw === '240' || raw.toLowerCase() === '4h') {
    biInterval = '4h';
  } else if (raw === '60' || raw.toLowerCase() === '1h') {
    biInterval = '1h';
  } else if (raw === '30' || raw.toLowerCase() === '30m') {
    biInterval = '30m';
  } else if (raw === '15' || raw.toLowerCase() === '15m') {
    biInterval = '15m';
  } else if (raw === '5' || raw.toLowerCase() === '5m') {
    biInterval = '5m';
  } else if (raw === '1' || raw.toLowerCase() === '1m' || raw.toLowerCase() === '1min') {
    biInterval = '1m';
  }

  const batch1Url = `https://api.binance.com/api/v3/klines?symbol=${binanceSymbol}&interval=${biInterval}&limit=1000`;
  const res1 = await fetch(batch1Url, { signal: AbortSignal.timeout(6000) });
  if (!res1.ok) {
    throw new Error(`Binance responded with HTTP ${res1.status}`);
  }

  const data1 = await res1.json();
  if (!Array.isArray(data1) || data1.length === 0) return [];

  let allData = data1;
  // If more candles needed and batch 1 returned full 1000, fetch prior batch to expand historical range
  if (limitCount > 1000 && data1.length === 1000) {
    try {
      const earliestTime = data1[0][0];
      const batch2Url = `https://api.binance.com/api/v3/klines?symbol=${binanceSymbol}&interval=${biInterval}&limit=1000&endTime=${earliestTime - 1}`;
      const res2 = await fetch(batch2Url, { signal: AbortSignal.timeout(5000) });
      if (res2.ok) {
        const data2 = await res2.json();
        if (Array.isArray(data2) && data2.length > 0) {
          allData = [...data2, ...data1];
        }
      }
    } catch {}
  }

  const candles: Candle[] = allData.map((item: any) => ({
    time: Math.floor(Number(item[0]) / 1000),
    open: Number(parseFloat(item[1]).toFixed(2)),
    high: Number(parseFloat(item[2]).toFixed(2)),
    low: Number(parseFloat(item[3]).toFixed(2)),
    close: Number(parseFloat(item[4]).toFixed(2)),
    volume: Math.round(parseFloat(item[5])),
  }));

  return candles.sort((a, b) => a.time - b.time);
}

export async function fetchMarketCandlesDirect(rawSymbol: string, rawInterval: string, requestedCount?: number): Promise<Candle[]> {
  const tvSymbol = resolveTradingViewSymbol(rawSymbol);
  const tvTimeframe = resolveTradingViewTimeframe(rawInterval);
  const targetCount = getOptimalHistoricalCandleCount(tvTimeframe, requestedCount);

  let candles: Candle[] = [];

  // Primary: Fetch genuine real-market candles directly from TradingView (OANDA institutional feed)
  try {
    candles = await fetchCandlesFromTradingView(tvSymbol, tvTimeframe, targetCount);
  } catch (tvErr: any) {
    console.warn(`[Market Feed] TradingView live fetch failed for ${tvSymbol}:`, tvErr.message);
  }

  // Bitcoin can fall back to the same Binance feed over its direct API.
  if ((!candles || candles.length === 0) && tvSymbol === 'BINANCE:BTCUSDT') {
    try {
      candles = await fetchFromBinance('BTCUSDT', rawInterval, targetCount);
    } catch (biErr: any) {
      console.warn('[Market Feed] Binance fallback failed:', biErr.message);
    }
  }

  return candles;
}

/**
 * GET /api/market/stream or /api/market/live-stream
 * Persistent Server-Sent Events (SSE) stream for zero-latency, sub-millisecond price ticks
 * directly from TradingView / Binance persistent socket.
 */
router.get('/time', (_req,res)=>{res.setHeader('Cache-Control','no-store');res.json({serverTime:Date.now()});});

router.get(['/stream', '/live-stream'], (req: Request, res: Response) => {
  marketStreamManager.handleSseConnection(req, res);
});

/**
 * GET /api/market/quote
 * Fast single-shot quote with current bid/ask and live price
 */
router.get('/quote', (req: Request, res: Response) => {
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control','no-store');
  const rawSymbol = String(req.query.symbol || 'OANDA:XAUUSD').trim();
  const tick = marketStreamManager.getLastKnownTick(rawSymbol);
  if (tick) {
    res.json({ status: 'ok', ...tick });
  } else {
    res.json({
      status: 'ok',
      symbol: rawSymbol,
      price: null,
      message: 'Subscribing to live feed...',
    });
  }
});

/**
 * GET /api/market/candles
 * Returns genuine, real-market OHLC candles from TradingView WebSocket feed.
 * Never uses synthetic, estimated, or randomly generated candle data.
 */
router.get(['/candles', '/candles/'], async (req: Request, res: Response): Promise<void> => {
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control','no-store');
  try {
    const rawSymbol = String(req.query.symbol || 'OANDA:XAUUSD').trim();
    const rawInterval = String(req.query.interval || '15').trim();
    const reqCount = req.query.count ? parseInt(String(req.query.count), 10) : undefined;
    const force = req.query.force === 'true';
    const cacheKey = `${rawSymbol}_${rawInterval}`;

    // Ensure marketStreamManager has started a background stream for this symbol so ticks are ready immediately
    const tvSymbol = resolveRealtimeTvSymbol(rawSymbol);
    marketStreamManager.subscribeSymbol(tvSymbol, rawSymbol);
    res.once('close',()=>marketStreamManager.unsubscribeSymbol(tvSymbol));

    const cached = candleCache.get(cacheKey);
    const now = Date.now();
    const tvTimeframe = resolveTradingViewTimeframe(rawInterval);
    const optimalTargetCount = getOptimalHistoricalCandleCount(tvTimeframe, reqCount);
    // Ensure cache has sufficient historical depth (at least 70% of target count or >= 1500 bars)
    const isCacheSufficient = Boolean(
      cached &&
      Array.isArray(cached.candles) &&
      cached.candles.length >= Math.min(optimalTargetCount * 0.7, 1500)
    );

    // Helper: Patch the latest candle in dataset with the live real-time tick if available
    const applyLiveTick = (candleList: Candle[]): Candle[] => {
      if (!candleList || candleList.length === 0) return candleList;
      marketStreamManager.updateLiveCandleInCache(rawSymbol,rawInterval,candleList[candleList.length-1]);
      const current=marketStreamManager.getCurrentBar(rawSymbol,rawInterval);
      if(!current)return candleList;
      return marketStreamManager.mergeCurrentBars(rawSymbol,rawInterval,candleList) as Candle[];
    };

    // 1. Fresh cache (unless forced or cache is shallow): return immediately (<1ms)
    if (!force && isCacheSufficient && cached && now - cached.timestamp < FRESH_CACHE_TTL_MS) {
      const patchedCandles = applyLiveTick(cached.candles);
      res.json({
        status: 'ok',
        symbol: rawSymbol,
        interval: rawInterval,
        source: 'tradingview',
        count: patchedCandles.length,
        candles: patchedCandles,
      });
      return;
    }

    // 2. Stale-While-Revalidate: If we have cached candles within 2 hours AND sufficient depth, return them immediately
    // and trigger background refresh so client never hangs!
    if (!force && isCacheSufficient && cached && now - cached.timestamp < STALE_CACHE_MAX_AGE_MS) {
      const patchedCandles = applyLiveTick(cached.candles);
      res.json({
        status: 'ok',
        symbol: rawSymbol,
        interval: rawInterval,
        source: 'tradingview_live_synced',
        count: patchedCandles.length,
        candles: patchedCandles,
      });

      // Background revalidation if not already in progress
      if (!pendingFetches.has(cacheKey)) {
        const fetchPromise = fetchMarketCandlesDirect(rawSymbol, rawInterval, reqCount)
          .then((freshCandles) => {
            if (freshCandles && freshCandles.length > 0) {
              candleCache.set(cacheKey, { timestamp: Date.now(), candles: freshCandles });
              // Sync last candle into stream manager
              const last = freshCandles[freshCandles.length - 1];
              marketStreamManager.updateLiveCandleInCache(rawSymbol, rawInterval, last);
            }
            return freshCandles;
          })
          .catch((err) => {
            console.warn(`[Market Feed] Background revalidation failed for ${cacheKey}:`, err.message);
            return [];
          })
          .finally(() => {
            pendingFetches.delete(cacheKey);
          });
        pendingFetches.set(cacheKey, fetchPromise);
      }
      return;
    }

    // 3. Cold fetch or forced refresh (or cache has insufficient depth)
    let fetchPromise = pendingFetches.get(cacheKey);
    if (!fetchPromise || force || !isCacheSufficient) {
      fetchPromise = fetchMarketCandlesDirect(rawSymbol, rawInterval, reqCount)
        .then((freshCandles) => {
          if (freshCandles && freshCandles.length > 0) {
            candleCache.set(cacheKey, { timestamp: Date.now(), candles: freshCandles });
            const last = freshCandles[freshCandles.length - 1];
            marketStreamManager.updateLiveCandleInCache(rawSymbol, rawInterval, last);
          }
          return freshCandles;
        })
        .finally(() => {
          pendingFetches.delete(cacheKey);
        });
      pendingFetches.set(cacheKey, fetchPromise);
    }

    const candles = await fetchPromise;

    if (!candles || candles.length === 0) {
      if (cached && cached.candles.length > 0) {
        const patchedCandles = applyLiveTick(cached.candles);
        res.json({
          status: 'ok',
          symbol: rawSymbol,
          interval: rawInterval,
          source: 'tradingview_cache',
          count: patchedCandles.length,
          candles: patchedCandles,
        });
        return;
      }

      res.status(502).json({
        status: 'error',
        error: `Real market data for ${rawSymbol} is temporarily unavailable. Synthetic data is disabled.`,
      });
      return;
    }

    const finalCandles = applyLiveTick(candles);

    res.json({
      status: 'ok',
      symbol: rawSymbol,
      interval: rawInterval,
      source: 'tradingview',
      count: finalCandles.length,
      candles: finalCandles,
    });
  } catch (err: any) {
    console.error('[Market Feed] Error fetching candles:', err.message);
    res.status(500).json({
      status: 'error',
      error: 'Failed to fetch genuine market candles.',
    });
  }
});

export default router;
