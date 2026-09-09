import { Server as HttpServer } from 'http';
import { Request, Response } from 'express';
import { WebSocketServer, WebSocket } from 'ws';
import { tv } from 'tradingview-api-adapter';

export interface PriceTick {
  symbol: string;
  price: number;
  bid?: number;
  ask?: number;
  time: number; // Unix timestamp in seconds
  source: string;
}

export interface BarUpdate {
  symbol: string;
  interval: string;
  bar: {
    time: number;
    open: number;
    high: number;
    low: number;
    close: number;
    volume?: number;
  };
}

// Calculate interval duration in seconds
export function getIntervalDurationSeconds(interval: string): number {
  const norm = (interval || '15').trim().toLowerCase();
  if (norm === '1' || norm === '1m') return 60;
  if (norm === '5' || norm === '5m') return 300;
  if (norm === '15' || norm === '15m') return 900;
  if (norm === '30' || norm === '30m') return 1800;
  if (norm === '60' || norm === '1h' || norm === 'h') return 3600;
  if (norm === '120' || norm === '2h') return 7200;
  if (norm === '240' || norm === '4h') return 14400;
  if (norm === 'd' || norm === '1d' || norm === 'day') return 86400;
  if (norm === 'w' || norm === '1w' || norm === 'week') return 604800;
  if (norm === 'm' || norm === '1m_month' || norm === '1mo' || norm === 'month') return 2592000;
  const parsed = parseInt(norm, 10);
  return isNaN(parsed) ? 900 : parsed * 60;
}

// Map user symbol to exact TradingView symbol (ensuring OANDA stays OANDA!)
export function resolveRealtimeTvSymbol(symbol: string): string {
  const trimmed = (symbol || 'OANDA:XAUUSD').trim();
  const upper = trimmed.toUpperCase();

  // 1. Explicit broker-prefixed symbols - preserve the user's exact requested broker!
  if (upper === 'BLACKBULL:XAUUSD') return 'BLACKBULL:XAUUSD';
  if (upper === 'OANDA:XAUUSD') return 'OANDA:XAUUSD';
  if (upper === 'FOREXCOM:XAUUSD') return 'FOREXCOM:XAUUSD';
  if (upper === 'SAXO:XAUUSD') return 'SAXO:XAUUSD';

  if (upper === 'BLACKBULL:NAS100') return 'BLACKBULL:NAS100';
  if (upper === 'OANDA:NAS100USD') return 'OANDA:NAS100USD';

  if (upper === 'BLACKBULL:US30' || upper === 'BLACKBULL:US3O') return 'BLACKBULL:US30';
  if (upper === 'OANDA:US30USD') return 'OANDA:US30USD';

  if (upper === 'BLACKBULL:GER40' || upper === 'BLACKBULL:DAX') return 'BLACKBULL:GER40';
  if (upper === 'OANDA:DE30EUR') return 'OANDA:DE30EUR';

  if (upper === 'BLACKBULL:EURUSD') return 'BLACKBULL:EURUSD';
  if (upper === 'OANDA:EURUSD' || upper === 'FX:EURUSD') return 'OANDA:EURUSD';

  if (upper === 'BLACKBULL:GBPUSD') return 'BLACKBULL:GBPUSD';
  if (upper === 'OANDA:GBPUSD' || upper === 'FX:GBPUSD') return 'OANDA:GBPUSD';

  if (upper === 'BINANCE:BTCUSDT') return 'BINANCE:BTCUSDT';
  if (upper === 'BLACKBULL:BTCUSD') return 'BLACKBULL:BTCUSD';

  // Futures
  if (upper.includes('ES1!')) return 'CME_MINI:ES1!';
  if (upper.includes('NQ1!')) return 'CME_MINI:NQ1!';

  // Equities & DXY
  if (upper === 'NVDA' || upper === 'NASDAQ:NVDA') return 'NASDAQ:NVDA';
  if (upper === 'DXY' || upper === 'TVC:DXY' || upper === 'CAPITALCOM:DXY') return 'CAPITALCOM:DXY';

  // 2. Generic un-prefixed symbol fallbacks (route cleanly to primary real-time broker feed)
  if (upper === 'XAUUSD' || upper === 'GOLD' || upper === 'XAU/USD') {
    return 'BLACKBULL:XAUUSD';
  }
  if (
    upper === 'NAS100' ||
    upper === 'NAS100USD' ||
    upper === 'NQ' ||
    upper === 'NQ (NASDAQ)' ||
    upper === 'NASDAQ' ||
    upper === 'NASDAQ 100' ||
    upper === 'NASDAQ100'
  ) {
    return 'BLACKBULL:NAS100';
  }
  if (
    upper === 'US30' ||
    upper === 'US30USD' ||
    upper === 'US3O' ||
    upper === 'US3OUSD' ||
    upper === 'US30 (DOW)' ||
    upper === 'DOW' ||
    upper === 'DOW JONES' ||
    upper === 'DJ30'
  ) {
    return 'BLACKBULL:US30';
  }
  if (
    upper === 'GER40' ||
    upper === 'DE30EUR' ||
    upper === 'DAX' ||
    upper === 'DAX40' ||
    upper === 'GER40 (DAX)' ||
    upper === 'DE40' ||
    upper === 'GERMANY40'
  ) {
    return 'BLACKBULL:GER40';
  }
  if (upper === 'EURUSD' || upper === 'EUR/USD') {
    return 'BLACKBULL:EURUSD';
  }
  if (upper === 'GBPUSD' || upper === 'GBP/USD') {
    return 'BLACKBULL:GBPUSD';
  }
  if (upper === 'BTCUSD' || upper === 'BTCUSDT' || upper === 'BTC/USD' || upper === 'BITCOIN') {
    return 'BINANCE:BTCUSDT';
  }

  if (trimmed.includes(':')) {
    return trimmed;
  }
  return `OANDA:${upper}`;
}

interface SymbolSubscription {
  tvSymbol: string;
  rawSymbol: string;
  clientCount: number;
  lastTick: PriceTick | null;
  activeBars: Map<string, BarUpdate['bar']>; // interval -> latest bar
  tvStream: any | null;
  reconnectTimer: NodeJS.Timeout | null;
  binanceWs: any | null;
}

class MarketStreamManager {
  private tvClient: ReturnType<typeof tv> | null = null;
  private subscriptions = new Map<string, SymbolSubscription>(); // tvSymbol -> SymbolSubscription
  private sseClients = new Set<{ res: Response; rawSymbol: string; tvSymbol: string; interval: string }>();
  private wsClients = new Set<{ ws: WebSocket; rawSymbol: string; tvSymbol: string; interval: string }>();
  private wss: WebSocketServer | null = null;

  constructor() {
    // Keep alive broadcast / heartbeat every 15s to keep connections alive through proxies
    setInterval(() => {
      this.sendHeartbeats();
    }, 15000);
  }

  public getTvClient() {
    if (!this.tvClient) {
      this.tvClient = tv();
    }
    return this.tvClient;
  }

  public initWebSocketServer(server: HttpServer) {
    if (this.wss) return;

    this.wss = new WebSocketServer({
      noServer: true,
    });

    server.on('upgrade', (request, socket, head) => {
      const url = new URL(request.url || '', `http://${request.headers.host || 'localhost'}`);
      if (url.pathname === '/api/market/ws' || url.pathname === '/ws/market') {
        this.wss?.handleUpgrade(request, socket, head, (ws) => {
          this.wss?.emit('connection', ws, request);
        });
      }
    });

    this.wss.on('connection', (ws: WebSocket, req) => {
      const url = new URL(req.url || '', `http://${req.headers.host || 'localhost'}`);
      const rawSymbol = url.searchParams.get('symbol') || 'OANDA:XAUUSD';
      const interval = url.searchParams.get('interval') || '15';
      const tvSymbol = resolveRealtimeTvSymbol(rawSymbol);

      const clientEntry = { ws, rawSymbol, tvSymbol, interval };
      this.wsClients.add(clientEntry);
      this.subscribeSymbol(tvSymbol, rawSymbol);

      // Send initial connected confirmation
      try {
        ws.send(JSON.stringify({ type: 'connected', symbol: rawSymbol, tvSymbol, time: Date.now() }));
      } catch {}

      // Send immediate last known state if available
      const sub = this.subscriptions.get(tvSymbol);
      if (sub?.lastTick) {
        try {
          ws.send(JSON.stringify({ type: 'tick', ...sub.lastTick }));
          const currentBar = sub.activeBars.get(interval);
          if (currentBar) {
            ws.send(JSON.stringify({ type: 'bar', symbol: rawSymbol, interval, bar: currentBar }));
          }
        } catch {}
      }

      ws.on('message', (message) => {
        try {
          const parsed = JSON.parse(message.toString());
          if (parsed.type === 'subscribe' && parsed.symbol) {
            const oldTv = clientEntry.tvSymbol;
            clientEntry.rawSymbol = parsed.symbol;
            clientEntry.tvSymbol = resolveRealtimeTvSymbol(parsed.symbol);
            if (parsed.interval) clientEntry.interval = parsed.interval;

            if (oldTv !== clientEntry.tvSymbol) {
              this.unsubscribeSymbol(oldTv);
              this.subscribeSymbol(clientEntry.tvSymbol, clientEntry.rawSymbol);
            }

            // Send fresh tick immediately
            const newSub = this.subscriptions.get(clientEntry.tvSymbol);
            if (newSub?.lastTick) {
              ws.send(JSON.stringify({ type: 'tick', ...newSub.lastTick }));
            }
          }
        } catch {}
      });

      ws.on('close', () => {
        this.wsClients.delete(clientEntry);
        this.unsubscribeSymbol(tvSymbol);
      });

      ws.on('error', () => {
        this.wsClients.delete(clientEntry);
        this.unsubscribeSymbol(tvSymbol);
      });
    });

    console.log('[MarketStream] WebSocket server mounted on /api/market/ws');
  }

  public handleSseConnection(req: Request, res: Response) {
    const rawSymbol = String(req.query.symbol || 'OANDA:XAUUSD').trim();
    const interval = String(req.query.interval || '15').trim();
    const tvSymbol = resolveRealtimeTvSymbol(rawSymbol);

    // Set standard SSE streaming headers with zero-buffering for immediate sub-millisecond dispatch
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      'Connection': 'keep-alive',
      'X-Accel-Buffering': 'no', // Disables proxy buffering in NGINX
      'Access-Control-Allow-Origin': '*',
    });
    res.flushHeaders?.();

    const clientEntry = { res, rawSymbol, tvSymbol, interval };
    this.sseClients.add(clientEntry);
    this.subscribeSymbol(tvSymbol, rawSymbol);

    // Send initial connected confirmation
    res.write(`data: ${JSON.stringify({ type: 'connected', symbol: rawSymbol, tvSymbol, time: Date.now() })}\n\n`);

    // Send latest available tick immediately
    const sub = this.subscriptions.get(tvSymbol);
    if (sub?.lastTick) {
      res.write(`data: ${JSON.stringify({ type: 'tick', ...sub.lastTick })}\n\n`);
      const currentBar = sub.activeBars.get(interval);
      if (currentBar) {
        res.write(`data: ${JSON.stringify({ type: 'bar', symbol: rawSymbol, interval, bar: currentBar })}\n\n`);
      }
    }

    req.on('close', () => {
      this.sseClients.delete(clientEntry);
      this.unsubscribeSymbol(tvSymbol);
    });
  }

  public subscribeSymbol(tvSymbol: string, rawSymbol: string) {
    let sub = this.subscriptions.get(tvSymbol);
    if (!sub) {
      sub = {
        tvSymbol,
        rawSymbol,
        clientCount: 1,
        lastTick: null,
        activeBars: new Map(),
        tvStream: null,
        reconnectTimer: null,
        binanceWs: null,
      };
      this.subscriptions.set(tvSymbol, sub);
      this.startUpstreamStream(sub);
    } else {
      sub.clientCount++;
    }
  }

  public unsubscribeSymbol(tvSymbol: string) {
    const sub = this.subscriptions.get(tvSymbol);
    if (!sub) return;
    sub.clientCount = Math.max(0, sub.clientCount - 1);

    if (sub.clientCount === 0) {
      // Grace period before closing upstream stream (prevents rapid disconnect/reconnect thrashing)
      setTimeout(() => {
        const current = this.subscriptions.get(tvSymbol);
        if (current && current.clientCount === 0) {
          this.closeUpstreamStream(current);
          this.subscriptions.delete(tvSymbol);
        }
      }, 30000);
    }
  }

  private startUpstreamStream(sub: SymbolSubscription) {
    // 1. If Crypto (e.g. BTCUSDT), we also attach direct Binance WebSocket for ultra-high-frequency millisecond ticks
    if (sub.tvSymbol.includes('BTCUSDT') || sub.rawSymbol.includes('BTC')) {
      this.startBinanceStream(sub);
    }

    // 2. Primary TradingView Stream for Forex, Gold (OANDA:XAUUSD), Indices, and Futures
    this.startTradingViewStream(sub);
  }

  private startBinanceStream(sub: SymbolSubscription) {
    try {
      const WebSocketClass = WebSocket || (global as any).WebSocket;
      if (!WebSocketClass) return;

      const ws = new WebSocketClass('wss://stream.binance.com:9443/ws/btcusdt@ticker');
      sub.binanceWs = ws;

      ws.on('message', (msg: any) => {
        try {
          const data = JSON.parse(msg.toString());
          const price = parseFloat(data.c);
          const bid = parseFloat(data.b);
          const ask = parseFloat(data.a);
          if (!isNaN(price) && price > 0) {
            this.handleIncomingTick(sub, {
              symbol: sub.rawSymbol,
              price,
              bid,
              ask,
              time: Math.floor(Date.now() / 1000),
              source: 'binance_live',
            });
          }
        } catch {}
      });

      ws.on('error', (err: any) => {
        console.warn(`[MarketStream] Binance direct stream error for ${sub.tvSymbol}:`, err.message);
      });

      ws.on('close', () => {
        sub.binanceWs = null;
      });
    } catch (err: any) {
      console.warn('[MarketStream] Failed to start Binance stream:', err.message);
    }
  }

  private startTradingViewStream(sub: SymbolSubscription) {
    try {
      const client = this.getTvClient();
      const sym = client.symbol(sub.tvSymbol);
      const stream = sym.stream();
      sub.tvStream = stream;

      console.log(`[MarketStream] Connected live stream to TradingView for ${sub.tvSymbol} (${sub.rawSymbol})`);

      // 1. Listen for instant price ticks
      stream.on('price', ({ price }: { price: number }) => {
        if (typeof price === 'number' && !isNaN(price) && price > 0) {
          this.handleIncomingTick(sub, {
            symbol: sub.rawSymbol,
            price,
            time: Math.floor(Date.now() / 1000),
            source: 'tradingview_live',
          });
        }
      });

      // 2. Listen for quote updates (bid/ask/lp)
      stream.on('update', ({ data }: { data: any }) => {
        const rawPrice = data.lp ?? (data.bid && data.ask ? (data.bid + data.ask) / 2 : (data.bid ?? data.ask));
        const price = typeof rawPrice === 'number' ? rawPrice : parseFloat(rawPrice);
        if (!isNaN(price) && price > 0) {
          this.handleIncomingTick(sub, {
            symbol: sub.rawSymbol,
            price,
            bid: typeof data.bid === 'number' ? data.bid : undefined,
            ask: typeof data.ask === 'number' ? data.ask : undefined,
            time: Math.floor(Date.now() / 1000),
            source: 'tradingview_live',
          });
        }
      });

      stream.on('error', (err: any) => {
        console.warn(`[MarketStream] TV stream error on ${sub.tvSymbol}:`, err.message);
        this.scheduleReconnect(sub);
      });
    } catch (err: any) {
      console.warn(`[MarketStream] Failed to start TV stream for ${sub.tvSymbol}:`, err.message);
      this.scheduleReconnect(sub);
    }
  }

  private scheduleReconnect(sub: SymbolSubscription) {
    if (sub.reconnectTimer) return;
    sub.reconnectTimer = setTimeout(() => {
      sub.reconnectTimer = null;
      if (sub.clientCount > 0) {
        console.log(`[MarketStream] Reconnecting live stream for ${sub.tvSymbol}...`);
        this.closeUpstreamStream(sub);
        this.startUpstreamStream(sub);
      }
    }, 3000);
  }

  private closeUpstreamStream(sub: SymbolSubscription) {
    if (sub.reconnectTimer) {
      clearTimeout(sub.reconnectTimer);
      sub.reconnectTimer = null;
    }
    if (sub.tvStream) {
      try {
        sub.tvStream.close();
      } catch {}
      sub.tvStream = null;
    }
    if (sub.binanceWs) {
      try {
        sub.binanceWs.close();
      } catch {}
      sub.binanceWs = null;
    }
  }

  private isMatchingSymbol(clientSym: string, subRawSym: string, subTvSym: string): boolean {
    if (clientSym === subRawSym || clientSym === subTvSym) return true;
    const norm = (s: string) => {
      const raw = s.includes(':') ? s.split(':')[1] : s;
      return raw.toUpperCase().replace(/USD|EUR|USDT|\.P|1!/g, '').replace(/US3O/g, 'US30');
    };
    const c = norm(clientSym);
    const r = norm(subRawSym);
    const t = norm(subTvSym);
    if (c === r || c === t) return true;
    if ((c === 'DE30' || c === 'GER40' || c === 'DAX') && (t === 'GER40' || t === 'DE30' || r === 'GER40' || r === 'DE30')) return true;
    if ((c === 'US30' || c === 'DOW' || c === 'DJ30') && (t === 'US30' || r === 'US30')) return true;
    if ((c === 'NAS100' || c === 'NQ' || c === 'NASDAQ') && (t === 'NAS100' || r === 'NAS100')) return true;
    return false;
  }

  private handleIncomingTick(sub: SymbolSubscription, tick: PriceTick) {
    sub.lastTick = tick;

    // 1. Dispatch to SSE clients
    for (const client of this.sseClients) {
      if (
        client.tvSymbol === sub.tvSymbol ||
        client.rawSymbol === sub.rawSymbol ||
        this.isMatchingSymbol(client.rawSymbol, sub.rawSymbol, sub.tvSymbol)
      ) {
        try {
          const clientTickMsg = JSON.stringify({
            type: 'tick',
            ...tick,
            symbol: client.rawSymbol,
            tvSymbol: sub.tvSymbol,
          });
          client.res.write(`data: ${clientTickMsg}\n\n`);
        } catch {
          this.sseClients.delete(client);
        }
      }
    }

    // 2. Dispatch to WebSocket clients
    for (const client of this.wsClients) {
      if (
        client.tvSymbol === sub.tvSymbol ||
        client.rawSymbol === sub.rawSymbol ||
        this.isMatchingSymbol(client.rawSymbol, sub.rawSymbol, sub.tvSymbol)
      ) {
        try {
          if (client.ws.readyState === WebSocket.OPEN) {
            const clientTickMsg = JSON.stringify({
              type: 'tick',
              ...tick,
              symbol: client.rawSymbol,
              tvSymbol: sub.tvSymbol,
            });
            client.ws.send(clientTickMsg);
          }
        } catch {
          this.wsClients.delete(client);
        }
      }
    }
  }

  public updateLiveCandleInCache(rawSymbol: string, interval: string, bar: BarUpdate['bar']) {
    const tvSymbol = resolveRealtimeTvSymbol(rawSymbol);
    const sub = this.subscriptions.get(tvSymbol);
    if (sub) {
      sub.activeBars.set(interval, bar);
    }

    // Broadcast bar update to all clients
    const barMsg = JSON.stringify({ type: 'bar', symbol: rawSymbol, interval, bar });

    for (const client of this.sseClients) {
      if ((client.tvSymbol === tvSymbol || client.rawSymbol === rawSymbol) && client.interval === interval) {
        try {
          client.res.write(`data: ${barMsg}\n\n`);
        } catch {
          this.sseClients.delete(client);
        }
      }
    }

    for (const client of this.wsClients) {
      if ((client.tvSymbol === tvSymbol || client.rawSymbol === rawSymbol) && client.interval === interval) {
        try {
          if (client.ws.readyState === WebSocket.OPEN) {
            client.ws.send(barMsg);
          }
        } catch {
          this.wsClients.delete(client);
        }
      }
    }
  }

  public getLastKnownTick(rawSymbol: string): PriceTick | null {
    const tvSymbol = resolveRealtimeTvSymbol(rawSymbol);
    return this.subscriptions.get(tvSymbol)?.lastTick || null;
  }

  private sendHeartbeats() {
    // Keep-alive comments for SSE
    for (const client of this.sseClients) {
      try {
        client.res.write(`: ping ${Date.now()}\n\n`);
      } catch {
        this.sseClients.delete(client);
      }
    }

    // Keep-alive ping for WebSockets
    for (const client of this.wsClients) {
      try {
        if (client.ws.readyState === WebSocket.OPEN) {
          client.ws.ping();
        }
      } catch {
        this.wsClients.delete(client);
      }
    }
  }
}

export const marketStreamManager = new MarketStreamManager();
