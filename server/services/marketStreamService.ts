import {liveCandleTime} from '../../src/utils/liveCandleTime';
import { resolveRealtimeTvSymbol } from './marketProviders';
export { resolveRealtimeTvSymbol } from './marketProviders';
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
  serverTime?: number;
  authoritative?: boolean;
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
  private recentBars=new Map<string,BarUpdate['bar'][]>();
  private tickListeners=new Set<(symbol:string,bar:BarUpdate['bar'],time:number)=>void>();
  public onFiveMinuteBar(fn:(symbol:string,bar:BarUpdate['bar'],time:number)=>void) {
    this.tickListeners.add(fn);return()=>{this.tickListeners.delete(fn);};
  }
  public getCurrentBar(rawSymbol:string,interval:string) {
    return this.subscriptions.get(resolveRealtimeTvSymbol(rawSymbol))?.activeBars.get(interval);
  }
  public mergeCurrentBars(rawSymbol:string,interval:string,candles:BarUpdate['bar'][]) {
    const key=JSON.stringify([resolveRealtimeTvSymbol(rawSymbol),interval]);
    const byTime=new Map(candles.map(c=>[c.time,c]));
    for(const bar of this.recentBars.get(key)||[])byTime.set(bar.time,bar);
    return [...byTime.values()].sort((a,b)=>a.time-b.time);
  }
  private tvClient: ReturnType<typeof tv> | null = null;
  private subscriptions = new Map<string, SymbolSubscription>(); // tvSymbol -> SymbolSubscription
  private sseClients = new Set<{ res: Response; rawSymbol: string; tvSymbol: string; interval: string }>();
  private wsClients = new Set<{ ws: WebSocket; rawSymbol: string; tvSymbol: string; interval: string }>();
  private wss: WebSocketServer | null = null;

  constructor() {
    // Keep alive broadcast / heartbeat every 15s to keep connections alive through proxies
    setInterval(() => {
      this.sendHeartbeats();
    }, 15000).unref();
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
      let tvSymbol: string;
      try {
        tvSymbol = resolveRealtimeTvSymbol(rawSymbol);
      } catch {
        ws.close(1008, 'Only OANDA and Binance Bitcoin are supported.');
        return;
      }

      const clientEntry = { ws, rawSymbol, tvSymbol, interval };
      this.wsClients.add(clientEntry);
      this.subscribeSymbol(tvSymbol, rawSymbol);

      // Send initial connected confirmation
      try {
        ws.send(JSON.stringify({ type: 'connected', symbol: rawSymbol, tvSymbol, time: Date.now(), serverTime: Date.now() }));
      } catch {}

      // Send immediate last known state if available
      const sub = this.subscriptions.get(tvSymbol);
      if (sub?.lastTick) {
        try {
          ws.send(JSON.stringify({ type: 'tick', ...sub.lastTick }));
          const currentBar = sub.activeBars.get(interval);
          if (currentBar) {
            ws.send(JSON.stringify({ type: 'bar', symbol: rawSymbol, interval, bar: currentBar, authoritative:true, serverTime:Date.now() }));
          }
        } catch {}
      }

      ws.on('message', (message) => {
        try {
          const parsed = JSON.parse(message.toString());
          if (parsed.type === 'subscribe' && parsed.symbol) {
            const oldTv = clientEntry.tvSymbol;
            const nextTvSymbol = resolveRealtimeTvSymbol(parsed.symbol);
            clientEntry.rawSymbol = parsed.symbol;
            clientEntry.tvSymbol = nextTvSymbol;
            if (parsed.interval) clientEntry.interval = parsed.interval;

            if (oldTv !== clientEntry.tvSymbol) {
              this.unsubscribeSymbol(oldTv);
              this.subscribeSymbol(clientEntry.tvSymbol, clientEntry.rawSymbol);
            }

            // Send fresh tick immediately
            const newSub = this.subscriptions.get(clientEntry.tvSymbol);
            if (newSub?.lastTick) {
              ws.send(JSON.stringify({ type: 'tick', ...newSub.lastTick }));
              const bar=newSub.activeBars.get(clientEntry.interval);
              if(bar)ws.send(JSON.stringify({type:'bar',symbol:clientEntry.rawSymbol,interval:clientEntry.interval,bar,authoritative:true,serverTime:Date.now()}));
            }
          }
        } catch {
          ws.send(JSON.stringify({ type: 'error', error: 'Only OANDA and Binance Bitcoin are supported.' }));
        }
      });

      const release=()=>{
        if(this.wsClients.delete(clientEntry))this.unsubscribeSymbol(clientEntry.tvSymbol);
      };
      ws.on('close',release);
      ws.on('error',release);

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
    res.write(`data: ${JSON.stringify({ type: 'connected', symbol: rawSymbol, tvSymbol, time: Date.now(), serverTime: Date.now() })}\n\n`);

    // Send latest available tick immediately
    const sub = this.subscriptions.get(tvSymbol);
    if (sub?.lastTick) {
      res.write(`data: ${JSON.stringify({ type: 'tick', ...sub.lastTick })}\n\n`);
      const currentBar = sub.activeBars.get(interval);
      if (currentBar) {
        res.write(`data: ${JSON.stringify({ type: 'bar', symbol: rawSymbol, interval, bar: currentBar, authoritative:true, serverTime:Date.now() })}\n\n`);
      }
    }

    req.on('close', () => {
      this.sseClients.delete(clientEntry);
      this.unsubscribeSymbol(tvSymbol);
    });
  }

  public subscribeSymbol(tvSymbol: string, rawSymbol: string) {
    resolveRealtimeTvSymbol(tvSymbol);
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
    // Direct Binance ticks are only enabled for Bitcoin.
    if (sub.tvSymbol === 'BINANCE:BTCUSDT') {
      this.startBinanceStream(sub);
    }

    // TradingView transports the selected OANDA or Binance feed.
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
    if(this.subscriptions.get(sub.tvSymbol)!==sub)return;
    const now=Date.now();
    if(!Number.isFinite(tick.time)||tick.time>now/1000+60 || tick.time<(sub.lastTick?.time||0))return;
    if(sub.lastTick?.time===tick.time&&sub.lastTick.price===tick.price)return;
    tick={...tick,serverTime:now,authoritative:true};
    sub.lastTick = tick;
    // Aggregate once, preserving the provider's historical/session bucket alignment.
    for(const [interval,last] of sub.activeBars) {
      if(tick.time<last.time)continue;
      const time=liveCandleTime(tick.time,last.time,getIntervalDurationSeconds(interval));
      const bar=time===last.time
        ? {...last,high:Math.max(last.high,tick.price),low:Math.min(last.low,tick.price),close:tick.price}
        : {time,open:tick.price,high:tick.price,low:tick.price,close:tick.price,volume:0};
      sub.activeBars.set(interval,bar);
      this.broadcastBar(sub.tvSymbol,interval,bar,now);
      if(interval==='5')for(const fn of this.tickListeners)fn(sub.tvSymbol,bar,now);
    }

    // 1. Dispatch to SSE clients
    for (const client of this.sseClients) {
      if (
        client.tvSymbol === sub.tvSymbol ||
        client.rawSymbol === sub.rawSymbol ||
        this.isMatchingSymbol(client.rawSymbol, sub.rawSymbol, sub.tvSymbol)
      ) {
        try {
          if(client.res.writableLength>262144){client.res.destroy();continue;}
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
            if(client.ws.bufferedAmount>262144){client.ws.close(1013,'Reconnect for current state');continue;}
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
    if(!sub)return;
    const current=sub.activeBars.get(interval);
    // A background history response must never overwrite a live bucket.
    if(current && current.time>=bar.time)return;
    sub.activeBars.set(interval,{...bar});
    this.broadcastBar(tvSymbol,interval,bar,Date.now());
  }

  private broadcastBar(tvSymbol:string,interval:string,bar:BarUpdate['bar'],serverTime:number) {
    const rawSymbol=tvSymbol;
    const key=JSON.stringify([tvSymbol,interval]);
    const history=this.recentBars.get(key)||[];
    if(history.at(-1)?.time===bar.time)history[history.length-1]={...bar};
    else if(!history.length||history.at(-1)!.time<bar.time)history.push({...bar});
    this.recentBars.set(key,history.slice(-500));
    const barMsg=JSON.stringify({type:'bar',symbol:tvSymbol,tvSymbol,interval,bar,serverTime,authoritative:true});

    for (const client of this.sseClients) {
      if ((client.tvSymbol === tvSymbol || client.rawSymbol === rawSymbol) && client.interval === interval) {
        try {
          if(client.res.writableLength>262144){client.res.destroy();continue;}
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
            if(client.ws.bufferedAmount>262144){client.ws.close(1013,'Reconnect for current state');continue;}
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
        client.res.write(`data: ${JSON.stringify({type:'clock',serverTime:Date.now()})}\n\n`);
      } catch {
        this.sseClients.delete(client);
      }
    }

    // Keep-alive ping for WebSockets
    for (const client of this.wsClients) {
      try {
        if (client.ws.readyState === WebSocket.OPEN) {
          client.ws.send(JSON.stringify({type:'clock',serverTime:Date.now()}));
          client.ws.ping();
        }
      } catch {
        this.wsClients.delete(client);
      }
    }
  }
}

export const marketStreamManager = new MarketStreamManager();
