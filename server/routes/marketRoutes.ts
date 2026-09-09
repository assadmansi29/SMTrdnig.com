import { Router, Request, Response } from 'express';
import { tv } from 'tradingview-api-adapter';
import { marketStreamManager, resolveRealtimeTvSymbol, getIntervalDurationSeconds } from '../services/marketStreamService';

const router = Router();

interface Candle {
  time: number; // Unix seconds
  open: number;
  high: number;
  low: number;
  close: number;
  volume?: number;
}

// Map user/frontend symbol input to exact TradingView (OANDA, CME, Binance), Yahoo, and Binance symbol identifiers
const SYMBOL_CONFIG: Record<
  string,
  { tvSymbol: string; yahooSymbol?: string; binanceSymbol?: string }
> = {
  // Gold (Spot Gold / USD) - Use OANDA as the primary high-liquidity real-time feed
  'OANDA:XAUUSD': { tvSymbol: 'OANDA:XAUUSD', yahooSymbol: 'GC=F' },
  'BLACKBULL:XAUUSD': { tvSymbol: 'BLACKBULL:XAUUSD', yahooSymbol: 'GC=F' },
  'FOREXCOM:XAUUSD': { tvSymbol: 'FOREXCOM:XAUUSD', yahooSymbol: 'GC=F' },
  'SAXO:XAUUSD': { tvSymbol: 'SAXO:XAUUSD', yahooSymbol: 'GC=F' },
  'XAUUSD': { tvSymbol: 'OANDA:XAUUSD', yahooSymbol: 'GC=F' },
  'GOLD': { tvSymbol: 'OANDA:XAUUSD', yahooSymbol: 'GC=F' },
  'XAU/USD': { tvSymbol: 'OANDA:XAUUSD', yahooSymbol: 'GC=F' },

  // Nasdaq 100
  'BLACKBULL:NAS100': { tvSymbol: 'BLACKBULL:NAS100', yahooSymbol: 'NQ=F' },
  'OANDA:NAS100USD': { tvSymbol: 'OANDA:NAS100USD', yahooSymbol: 'NQ=F' },
  'NAS100USD': { tvSymbol: 'BLACKBULL:NAS100', yahooSymbol: 'NQ=F' },
  'NAS100': { tvSymbol: 'BLACKBULL:NAS100', yahooSymbol: 'NQ=F' },
  'NQ': { tvSymbol: 'BLACKBULL:NAS100', yahooSymbol: 'NQ=F' },
  'NQ (NASDAQ)': { tvSymbol: 'BLACKBULL:NAS100', yahooSymbol: 'NQ=F' },
  'NASDAQ': { tvSymbol: 'BLACKBULL:NAS100', yahooSymbol: 'NQ=F' },
  'NASDAQ 100': { tvSymbol: 'BLACKBULL:NAS100', yahooSymbol: 'NQ=F' },
  'NASDAQ100': { tvSymbol: 'BLACKBULL:NAS100', yahooSymbol: 'NQ=F' },

  // Dow Jones 30
  'BLACKBULL:US30': { tvSymbol: 'BLACKBULL:US30', yahooSymbol: 'YM=F' },
  'OANDA:US30USD': { tvSymbol: 'OANDA:US30USD', yahooSymbol: 'YM=F' },
  'US30USD': { tvSymbol: 'BLACKBULL:US30', yahooSymbol: 'YM=F' },
  'US30': { tvSymbol: 'BLACKBULL:US30', yahooSymbol: 'YM=F' },
  'US3O': { tvSymbol: 'BLACKBULL:US30', yahooSymbol: 'YM=F' },
  'BLACKBULL:US3O': { tvSymbol: 'BLACKBULL:US30', yahooSymbol: 'YM=F' },
  'US3OUSD': { tvSymbol: 'BLACKBULL:US30', yahooSymbol: 'YM=F' },
  'US30 (DOW)': { tvSymbol: 'BLACKBULL:US30', yahooSymbol: 'YM=F' },
  'DOW': { tvSymbol: 'BLACKBULL:US30', yahooSymbol: 'YM=F' },
  'DOW JONES': { tvSymbol: 'BLACKBULL:US30', yahooSymbol: 'YM=F' },

  // DAX 40 (German 40)
  'BLACKBULL:GER40': { tvSymbol: 'BLACKBULL:GER40', yahooSymbol: '^GDAXI' },
  'OANDA:DE30EUR': { tvSymbol: 'OANDA:DE30EUR', yahooSymbol: '^GDAXI' },
  'DE30EUR': { tvSymbol: 'BLACKBULL:GER40', yahooSymbol: '^GDAXI' },
  'GER40': { tvSymbol: 'BLACKBULL:GER40', yahooSymbol: '^GDAXI' },
  'DAX': { tvSymbol: 'BLACKBULL:GER40', yahooSymbol: '^GDAXI' },
  'DAX40': { tvSymbol: 'BLACKBULL:GER40', yahooSymbol: '^GDAXI' },
  'BLACKBULL:DAX': { tvSymbol: 'BLACKBULL:GER40', yahooSymbol: '^GDAXI' },
  'GER40 (DAX)': { tvSymbol: 'BLACKBULL:GER40', yahooSymbol: '^GDAXI' },
  'DE40': { tvSymbol: 'BLACKBULL:GER40', yahooSymbol: '^GDAXI' },

  // Forex EUR/USD
  'OANDA:EURUSD': { tvSymbol: 'OANDA:EURUSD', yahooSymbol: 'EURUSD=X' },
  'FX:EURUSD': { tvSymbol: 'OANDA:EURUSD', yahooSymbol: 'EURUSD=X' },
  'EURUSD': { tvSymbol: 'OANDA:EURUSD', yahooSymbol: 'EURUSD=X' },
  'EUR/USD': { tvSymbol: 'OANDA:EURUSD', yahooSymbol: 'EURUSD=X' },
  'BLACKBULL:EURUSD': { tvSymbol: 'BLACKBULL:EURUSD', yahooSymbol: 'EURUSD=X' },

  // Forex GBP/USD
  'OANDA:GBPUSD': { tvSymbol: 'OANDA:GBPUSD', yahooSymbol: 'GBPUSD=X' },
  'FX:GBPUSD': { tvSymbol: 'OANDA:GBPUSD', yahooSymbol: 'GBPUSD=X' },
  'GBPUSD': { tvSymbol: 'OANDA:GBPUSD', yahooSymbol: 'GBPUSD=X' },
  'GBP/USD': { tvSymbol: 'OANDA:GBPUSD', yahooSymbol: 'GBPUSD=X' },
  'BLACKBULL:GBPUSD': { tvSymbol: 'BLACKBULL:GBPUSD', yahooSymbol: 'GBPUSD=X' },

  // Crypto Bitcoin
  'BINANCE:BTCUSDT': { tvSymbol: 'BINANCE:BTCUSDT', binanceSymbol: 'BTCUSDT', yahooSymbol: 'BTC-USD' },
  'BTCUSD': { tvSymbol: 'BINANCE:BTCUSDT', binanceSymbol: 'BTCUSDT', yahooSymbol: 'BTC-USD' },
  'BTCUSDT': { tvSymbol: 'BINANCE:BTCUSDT', binanceSymbol: 'BTCUSDT', yahooSymbol: 'BTC-USD' },
  'BTC/USD': { tvSymbol: 'BINANCE:BTCUSDT', binanceSymbol: 'BTCUSDT', yahooSymbol: 'BTC-USD' },
  'BLACKBULL:BTCUSD': { tvSymbol: 'BLACKBULL:BTCUSD', binanceSymbol: 'BTCUSDT', yahooSymbol: 'BTC-USD' },

  // Futures: S&P 500 & Nasdaq
  'CME_MINI:ES1!': { tvSymbol: 'CME_MINI:ES1!', yahooSymbol: 'ES=F' },
  'ES1!': { tvSymbol: 'CME_MINI:ES1!', yahooSymbol: 'ES=F' },
  'ES': { tvSymbol: 'CME_MINI:ES1!', yahooSymbol: 'ES=F' },
  'CME_MINI:NQ1!': { tvSymbol: 'CME_MINI:NQ1!', yahooSymbol: 'NQ=F' },
  'NQ1!': { tvSymbol: 'CME_MINI:NQ1!', yahooSymbol: 'NQ=F' },

  // Equities: NVIDIA
  'NASDAQ:NVDA': { tvSymbol: 'NASDAQ:NVDA', yahooSymbol: 'NVDA' },
  'NVDA': { tvSymbol: 'NASDAQ:NVDA', yahooSymbol: 'NVDA' },

  // Macro: US Dollar Index
  'TVC:DXY': { tvSymbol: 'CAPITALCOM:DXY', yahooSymbol: 'DX-Y.NYB' },
  'DXY': { tvSymbol: 'CAPITALCOM:DXY', yahooSymbol: 'DX-Y.NYB' },
  'INDEX:DXY': { tvSymbol: 'CAPITALCOM:DXY', yahooSymbol: 'DX-Y.NYB' },
};

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

async function fetchCandlesFromTradingView(tvSymbol: string, tvTimeframe: string, count: number = 300): Promise<Candle[]> {
  const attemptFetch = async (client: ReturnType<typeof tv>) => {
    const sym = client.symbol(tvSymbol);
    const raw = await Promise.race([
      sym.candles({ timeframe: tvTimeframe as any, count }),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error(`TradingView fetch timeout for ${tvSymbol}`)), 7000)
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
      const formatP = (v: number) => (Math.abs(v) < 10 ? Number(v.toFixed(5)) : Number(v.toFixed(2)));
      candles.push({
        time: t,
        open: formatP(o),
        high: formatP(h),
        low: formatP(l),
        close: formatP(c),
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

  // Secondary: Try alternative broker feed if primary index symbol timed out
  if (!candles || candles.length === 0) {
    const upper = (rawSymbol || '').toUpperCase();
    let altTvSymbol: string | null = null;
    if (upper.includes('NAS100') || upper.includes('NQ') || upper.includes('NASDAQ')) {
      altTvSymbol = tvSymbol === 'BLACKBULL:NAS100' ? 'OANDA:NAS100USD' : 'BLACKBULL:NAS100';
    } else if (upper.includes('US30') || upper.includes('US3O') || upper.includes('DOW')) {
      altTvSymbol = tvSymbol === 'BLACKBULL:US30' ? 'OANDA:US30USD' : 'BLACKBULL:US30';
    } else if (upper.includes('GER40') || upper.includes('DAX') || upper.includes('DE30')) {
      altTvSymbol = tvSymbol === 'BLACKBULL:GER40' ? 'OANDA:DE30EUR' : 'BLACKBULL:GER40';
    } else if (upper.includes('XAU') || upper.includes('GOLD')) {
      altTvSymbol = tvSymbol === 'BLACKBULL:XAUUSD' ? 'OANDA:XAUUSD' : 'BLACKBULL:XAUUSD';
    }

    if (altTvSymbol) {
      try {
        candles = await fetchCandlesFromTradingView(altTvSymbol, tvTimeframe, 300);
      } catch (altErr: any) {
        console.warn(`[Market Feed] TradingView alt fetch failed for ${altTvSymbol}:`, altErr.message);
      }
    }
  }

  // Tertiary: Binance real market fallback (if crypto)
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
    const yahooSym = config?.yahooSymbol || (rawSymbol.includes(':') ? rawSymbol.split(':')[1] : rawSymbol);
    if (yahooSym) {
      try {
        const { yahooInterval, yahooRange } = parseYahooInterval(rawInterval);
        candles = await fetchFromYahoo(yahooSym, yahooInterval, yahooRange);
      } catch (yhErr: any) {
        console.warn(`[Market Feed] Yahoo fallback failed for ${yahooSym}:`, yhErr.message);
      }
    }
  }

  return candles;
}

/**
 * GET /api/market/stream or /api/market/live-stream
 * Persistent Server-Sent Events (SSE) stream for zero-latency, sub-millisecond price ticks
 * directly from TradingView / Binance persistent socket.
 */
router.get(['/stream', '/live-stream'], (req: Request, res: Response) => {
  marketStreamManager.handleSseConnection(req, res);
});

/**
 * GET /api/market/quote
 * Fast single-shot quote with current bid/ask and live price
 */
router.get('/quote', (req: Request, res: Response) => {
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
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
  try {
    const rawSymbol = String(req.query.symbol || 'OANDA:XAUUSD').trim();
    const rawInterval = String(req.query.interval || '15').trim();
    const force = req.query.force === 'true';
    const cacheKey = `${rawSymbol}_${rawInterval}`;

    // Ensure marketStreamManager has started a background stream for this symbol so ticks are ready immediately
    const tvSymbol = resolveRealtimeTvSymbol(rawSymbol);
    marketStreamManager.subscribeSymbol(tvSymbol, rawSymbol);

    const cached = candleCache.get(cacheKey);
    const now = Date.now();

    // Helper: Patch the latest candle in dataset with the live real-time tick if available
    const applyLiveTick = (candleList: Candle[]): Candle[] => {
      if (!candleList || candleList.length === 0) return candleList;
      const liveTick = marketStreamManager.getLastKnownTick(rawSymbol);
      if (!liveTick || typeof liveTick.price !== 'number' || liveTick.price <= 0) {
        return candleList;
      }
      const durationSec = getIntervalDurationSeconds(rawInterval);
      const tickTimeSec = liveTick.time || Math.floor(Date.now() / 1000);
      const currentBarTime = Math.floor(tickTimeSec / durationSec) * durationSec;
      const last = candleList[candleList.length - 1];

      if (currentBarTime > last.time) {
        // A new candle has started since the last completed bar!
        const newBar: Candle = {
          time: currentBarTime,
          open: liveTick.price,
          high: liveTick.price,
          low: liveTick.price,
          close: liveTick.price,
          volume: 1,
        };
        return [...candleList, newBar];
      } else {
        const updatedLast: Candle = {
          ...last,
          close: liveTick.price,
          high: Math.max(last.high, liveTick.price),
          low: Math.min(last.low, liveTick.price),
        };
        return [...candleList.slice(0, -1), updatedLast];
      }
    };

    // 1. Fresh cache (unless forced): return immediately (<1ms)
    if (!force && cached && now - cached.timestamp < FRESH_CACHE_TTL_MS) {
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

    // 2. Stale-While-Revalidate: If we have cached candles within 2 hours, return them immediately
    // and trigger background refresh so client never hangs!
    if (!force && cached && now - cached.timestamp < STALE_CACHE_MAX_AGE_MS) {
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
        const fetchPromise = fetchMarketCandlesDirect(rawSymbol, rawInterval)
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

    // 3. Cold fetch or forced refresh
    let fetchPromise = pendingFetches.get(cacheKey);
    if (!fetchPromise || force) {
      fetchPromise = fetchMarketCandlesDirect(rawSymbol, rawInterval)
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
