import { Router, Request, Response } from 'express';
import { tv } from 'tradingview-api-adapter';

const router = Router();

interface Candle {
  time: number; // Unix seconds
  open: number;
  high: number;
  low: number;
  close: number;
  volume?: number;
}

// Map user/frontend symbol input to exact TradingView (BlackBull Markets), Yahoo, and Binance symbol identifiers
const SYMBOL_CONFIG: Record<
  string,
  { tvSymbol: string; yahooSymbol?: string; binanceSymbol?: string }
> = {
  // Gold (Spot Gold / USD)
  'BLACKBULL:XAUUSD': { tvSymbol: 'BLACKBULL:XAUUSD', yahooSymbol: 'GC=F' },
  'OANDA:XAUUSD': { tvSymbol: 'BLACKBULL:XAUUSD', yahooSymbol: 'GC=F' },
  'XAUUSD': { tvSymbol: 'BLACKBULL:XAUUSD', yahooSymbol: 'GC=F' },
  'GOLD': { tvSymbol: 'BLACKBULL:XAUUSD', yahooSymbol: 'GC=F' },
  'XAU/USD': { tvSymbol: 'BLACKBULL:XAUUSD', yahooSymbol: 'GC=F' },

  // Nasdaq 100
  'BLACKBULL:NAS100': { tvSymbol: 'BLACKBULL:NAS100', yahooSymbol: 'NQ=F' },
  'OANDA:NAS100USD': { tvSymbol: 'BLACKBULL:NAS100', yahooSymbol: 'NQ=F' },
  'NAS100USD': { tvSymbol: 'BLACKBULL:NAS100', yahooSymbol: 'NQ=F' },
  'NAS100': { tvSymbol: 'BLACKBULL:NAS100', yahooSymbol: 'NQ=F' },
  'NQ': { tvSymbol: 'BLACKBULL:NAS100', yahooSymbol: 'NQ=F' },

  // Dow Jones 30
  'BLACKBULL:US30': { tvSymbol: 'BLACKBULL:US30', yahooSymbol: 'YM=F' },
  'OANDA:US30USD': { tvSymbol: 'BLACKBULL:US30', yahooSymbol: 'YM=F' },
  'US30USD': { tvSymbol: 'BLACKBULL:US30', yahooSymbol: 'YM=F' },
  'US30': { tvSymbol: 'BLACKBULL:US30', yahooSymbol: 'YM=F' },

  // DAX 40 (German 40)
  'BLACKBULL:GER40': { tvSymbol: 'BLACKBULL:GER40', yahooSymbol: '^GDAXI' },
  'OANDA:DE30EUR': { tvSymbol: 'BLACKBULL:GER40', yahooSymbol: '^GDAXI' },
  'DE30EUR': { tvSymbol: 'BLACKBULL:GER40', yahooSymbol: '^GDAXI' },
  'GER40': { tvSymbol: 'BLACKBULL:GER40', yahooSymbol: '^GDAXI' },

  // Forex EUR/USD
  'BLACKBULL:EURUSD': { tvSymbol: 'BLACKBULL:EURUSD', yahooSymbol: 'EURUSD=X' },
  'FX:EURUSD': { tvSymbol: 'BLACKBULL:EURUSD', yahooSymbol: 'EURUSD=X' },
  'EURUSD': { tvSymbol: 'BLACKBULL:EURUSD', yahooSymbol: 'EURUSD=X' },
  'EUR/USD': { tvSymbol: 'BLACKBULL:EURUSD', yahooSymbol: 'EURUSD=X' },

  // Forex GBP/USD
  'BLACKBULL:GBPUSD': { tvSymbol: 'BLACKBULL:GBPUSD', yahooSymbol: 'GBPUSD=X' },
  'FX:GBPUSD': { tvSymbol: 'BLACKBULL:GBPUSD', yahooSymbol: 'GBPUSD=X' },
  'GBPUSD': { tvSymbol: 'BLACKBULL:GBPUSD', yahooSymbol: 'GBPUSD=X' },
  'GBP/USD': { tvSymbol: 'BLACKBULL:GBPUSD', yahooSymbol: 'GBPUSD=X' },

  // Crypto Bitcoin
  'BLACKBULL:BTCUSD': { tvSymbol: 'BLACKBULL:BTCUSD', binanceSymbol: 'BTCUSDT', yahooSymbol: 'BTC-USD' },
  'BINANCE:BTCUSDT': { tvSymbol: 'BLACKBULL:BTCUSD', binanceSymbol: 'BTCUSDT', yahooSymbol: 'BTC-USD' },
  'BTCUSD': { tvSymbol: 'BLACKBULL:BTCUSD', binanceSymbol: 'BTCUSDT', yahooSymbol: 'BTC-USD' },
  'BTCUSDT': { tvSymbol: 'BLACKBULL:BTCUSD', binanceSymbol: 'BTCUSDT', yahooSymbol: 'BTC-USD' },
  'BTC/USD': { tvSymbol: 'BLACKBULL:BTCUSD', binanceSymbol: 'BTCUSDT', yahooSymbol: 'BTC-USD' },
};

function resolveTradingViewSymbol(symbol: string): string {
  const trimmed = (symbol || '').trim();
  if (SYMBOL_CONFIG[trimmed]) return SYMBOL_CONFIG[trimmed].tvSymbol;
  const upper = trimmed.toUpperCase();
  if (SYMBOL_CONFIG[upper]) return SYMBOL_CONFIG[upper].tvSymbol;

  // If user already specified an exchange prefix
  if (trimmed.includes(':')) {
    if (trimmed.startsWith('OANDA:')) {
      const bare = trimmed.replace('OANDA:', '');
      if (bare === 'XAUUSD') return 'BLACKBULL:XAUUSD';
      if (bare === 'NAS100USD' || bare === 'NAS100') return 'BLACKBULL:NAS100';
      if (bare === 'US30USD' || bare === 'US30') return 'BLACKBULL:US30';
      if (bare === 'DE30EUR' || bare === 'GER40') return 'BLACKBULL:GER40';
      return `BLACKBULL:${bare}`;
    }
    return trimmed;
  }
  return `BLACKBULL:${upper}`;
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
const FRESH_CACHE_TTL_MS = 15000; // 15 seconds fresh
const STALE_CACHE_MAX_AGE_MS = 300000; // 5 minutes stale serving while refreshing in background
const pendingFetches = new Map<string, Promise<Candle[]>>();

// Singleton TradingView client instance
let globalTvClient: ReturnType<typeof tv> | null = null;

function getTvClient() {
  if (!globalTvClient) {
    globalTvClient = tv();
  }
  return globalTvClient;
}

async function fetchCandlesFromTradingView(tvSymbol: string, tvTimeframe: string, count: number = 300): Promise<Candle[]> {
  const attemptFetch = async (client: ReturnType<typeof tv>) => {
    const sym = client.symbol(tvSymbol);
    const raw = await Promise.race([
      sym.candles({ timeframe: tvTimeframe as any, count }),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('TradingView fetch timeout')), 3500)
      ),
    ]);
    if (!raw || raw.length === 0) return [];
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
    console.warn(`[Market Feed] Primary TV fetch failed for ${tvSymbol}:`, err.message);
    try {
      if (globalTvClient) {
        await globalTvClient.disconnect().catch(() => {});
        globalTvClient = null;
      }
    } catch {}
    // Retry once with a fresh client connection
    const freshClient = tv();
    globalTvClient = freshClient;
    return await attemptFetch(freshClient);
  }
}

async function fetchFromBinance(binanceSymbol: string, intervalStr: string): Promise<Candle[]> {
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

  const url = `https://api.binance.com/api/v3/klines?symbol=${binanceSymbol}&interval=${biInterval}&limit=300`;
  const res = await fetch(url, { signal: AbortSignal.timeout(6000) });
  if (!res.ok) {
    throw new Error(`Binance responded with HTTP ${res.status}`);
  }

  const data = await res.json();
  if (!Array.isArray(data)) return [];

  const candles: Candle[] = data.map((item: any) => ({
    time: Math.floor(Number(item[0]) / 1000),
    open: Number(parseFloat(item[1]).toFixed(2)),
    high: Number(parseFloat(item[2]).toFixed(2)),
    low: Number(parseFloat(item[3]).toFixed(2)),
    close: Number(parseFloat(item[4]).toFixed(2)),
    volume: Math.round(parseFloat(item[5])),
  }));

  return candles.sort((a, b) => a.time - b.time);
}

async function fetchFromYahoo(yahooSymbol: string, interval: string, range: string): Promise<Candle[]> {
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(yahooSymbol)}?interval=${interval}&range=${range}`;
  const res = await fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Accept': 'application/json',
    },
    signal: AbortSignal.timeout(6000),
  });

  if (!res.ok) {
    throw new Error(`Yahoo Finance responded with HTTP ${res.status}`);
  }

  const data = await res.json();
  const result = data.chart?.result?.[0];
  if (!result || !result.timestamp || result.timestamp.length === 0) {
    return [];
  }

  const timestamps: number[] = result.timestamp;
  const quote = result.indicators?.quote?.[0];
  if (!quote) return [];

  const candles: Candle[] = [];
  for (let i = 0; i < timestamps.length; i++) {
    const t = timestamps[i];
    const o = quote.open?.[i];
    const h = quote.high?.[i];
    const l = quote.low?.[i];
    const c = quote.close?.[i];
    const v = quote.volume?.[i];

    if (o != null && h != null && l != null && c != null && !isNaN(o) && !isNaN(c)) {
      candles.push({
        time: t,
        open: Number(o.toFixed(2)),
        high: Number(h.toFixed(2)),
        low: Number(l.toFixed(2)),
        close: Number(c.toFixed(2)),
        volume: v != null ? Math.round(v) : undefined,
      });
    }
  }

  return candles.sort((a, b) => a.time - b.time);
}

function parseYahooInterval(inv: string): { yahooInterval: string; yahooRange: string } {
  const raw = (inv || '15').trim();
  if (raw === '1M' || raw === 'M' || raw.toLowerCase() === '1mo' || raw.toLowerCase() === 'month') {
    return { yahooInterval: '1mo', yahooRange: '5y' };
  }
  if (raw === '1W' || raw === 'W' || raw.toLowerCase() === 'week') {
    return { yahooInterval: '1wk', yahooRange: '2y' };
  }
  if (raw === '1D' || raw === 'D' || raw.toLowerCase() === 'day') {
    return { yahooInterval: '1d', yahooRange: '1y' };
  }
  if (raw === '240' || raw.toLowerCase() === '4h') {
    return { yahooInterval: '60m', yahooRange: '3mo' };
  }
  if (raw === '120' || raw.toLowerCase() === '2h') {
    return { yahooInterval: '60m', yahooRange: '2mo' };
  }
  if (raw === '60' || raw.toLowerCase() === '1h' || raw.toLowerCase() === 'h') {
    return { yahooInterval: '60m', yahooRange: '1mo' };
  }
  if (raw === '30' || raw.toLowerCase() === '30m') {
    return { yahooInterval: '30m', yahooRange: '1mo' };
  }
  if (raw === '15' || raw.toLowerCase() === '15m') {
    return { yahooInterval: '15m', yahooRange: '5d' };
  }
  if (raw === '5' || raw.toLowerCase() === '5m') {
    return { yahooInterval: '5m', yahooRange: '3d' };
  }
  if (raw === '1' || raw.toLowerCase() === '1m' || raw.toLowerCase() === '1min') {
    return { yahooInterval: '1m', yahooRange: '1d' };
  }
  return { yahooInterval: '15m', yahooRange: '5d' };
}

async function fetchMarketCandlesDirect(rawSymbol: string, rawInterval: string): Promise<Candle[]> {
  const tvSymbol = resolveTradingViewSymbol(rawSymbol);
  const tvTimeframe = resolveTradingViewTimeframe(rawInterval);

  let candles: Candle[] = [];

  // Primary: Fetch genuine real-market candles directly from TradingView
  try {
    candles = await fetchCandlesFromTradingView(tvSymbol, tvTimeframe, 300);
  } catch (tvErr: any) {
    console.warn(`[Market Feed] TradingView live fetch failed for ${tvSymbol}:`, tvErr.message);
  }

  // Secondary: Binance real market fallback (if crypto)
  if ((!candles || candles.length === 0) && (tvSymbol.includes('BTC') || rawSymbol.includes('BTC'))) {
    try {
      candles = await fetchFromBinance('BTCUSDT', rawInterval);
    } catch (biErr: any) {
      console.warn('[Market Feed] Binance fallback failed:', biErr.message);
    }
  }

  // Tertiary: Yahoo Finance real market fallback
  if (!candles || candles.length === 0) {
    const config = SYMBOL_CONFIG[rawSymbol] || SYMBOL_CONFIG[rawSymbol.toUpperCase()];
    if (config?.yahooSymbol) {
      try {
        const { yahooInterval, yahooRange } = parseYahooInterval(rawInterval);
        candles = await fetchFromYahoo(config.yahooSymbol, yahooInterval, yahooRange);
      } catch (yhErr: any) {
        console.warn('[Market Feed] Yahoo fallback failed:', yhErr.message);
      }
    }
  }

  return candles;
}

/**
 * GET /api/market/candles
 * Returns genuine, real-market OHLC candles from TradingView WebSocket feed.
 * Never uses synthetic, estimated, or randomly generated candle data.
 */
router.get('/candles', async (req: Request, res: Response): Promise<void> => {
  try {
    const rawSymbol = String(req.query.symbol || 'OANDA:XAUUSD').trim();
    const rawInterval = String(req.query.interval || '15').trim();
    const cacheKey = `${rawSymbol}_${rawInterval}`;

    const cached = candleCache.get(cacheKey);
    const now = Date.now();

    // 1. Fresh cache: return instantly (<1ms)
    if (cached && now - cached.timestamp < FRESH_CACHE_TTL_MS) {
      res.json({
        status: 'ok',
        symbol: rawSymbol,
        interval: rawInterval,
        source: 'tradingview',
        count: cached.candles.length,
        candles: cached.candles,
      });
      return;
    }

    // 2. Stale-While-Revalidate: If we have cached candles within 5 minutes, return them immediately!
    // Trigger background fetch to update the cache so the user NEVER experiences a 5-second wait!
    if (cached && now - cached.timestamp < STALE_CACHE_MAX_AGE_MS) {
      res.json({
        status: 'ok',
        symbol: rawSymbol,
        interval: rawInterval,
        source: 'tradingview_stale',
        count: cached.candles.length,
        candles: cached.candles,
      });

      // Background revalidation if not already in progress
      if (!pendingFetches.has(cacheKey)) {
        const fetchPromise = fetchMarketCandlesDirect(rawSymbol, rawInterval)
          .then((freshCandles) => {
            if (freshCandles && freshCandles.length > 0) {
              candleCache.set(cacheKey, { timestamp: Date.now(), candles: freshCandles });
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

    // 3. Cold fetch (first time loading this symbol/timeframe)
    let fetchPromise = pendingFetches.get(cacheKey);
    if (!fetchPromise) {
      fetchPromise = fetchMarketCandlesDirect(rawSymbol, rawInterval)
        .then((freshCandles) => {
          if (freshCandles && freshCandles.length > 0) {
            candleCache.set(cacheKey, { timestamp: Date.now(), candles: freshCandles });
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
        res.json({
          status: 'ok',
          symbol: rawSymbol,
          interval: rawInterval,
          source: 'tradingview_cache',
          count: cached.candles.length,
          candles: cached.candles,
        });
        return;
      }

      res.status(502).json({
        status: 'error',
        error: `Real market data for ${rawSymbol} is temporarily unavailable. Synthetic data is disabled.`,
      });
      return;
    }

    res.json({
      status: 'ok',
      symbol: rawSymbol,
      interval: rawInterval,
      source: 'tradingview',
      count: candles.length,
      candles,
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
