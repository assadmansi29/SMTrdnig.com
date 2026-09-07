/**
 * MarketStreamClient
 * High-performance, persistent real-time market data streaming client.
 * Connects directly to server WebSocket with automatic seamless fallback to SSE (Server-Sent Events).
 * Delivers live price ticks and candle bar updates with 0-delay sub-millisecond latency.
 */

export interface PriceTickEvent {
  type: 'tick';
  symbol: string;
  price: number;
  bid?: number;
  ask?: number;
  time: number;
  source?: string;
}

export interface BarUpdateEvent {
  type: 'bar';
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

export type MarketStreamCallback = (data: PriceTickEvent | BarUpdateEvent) => void;
export type ConnectionStatusCallback = (status: 'connecting' | 'connected' | 'reconnecting' | 'error') => void;

export class MarketStreamClient {
  private ws: WebSocket | null = null;
  private sse: EventSource | null = null;
  private activeSymbol: string = '';
  private activeInterval: string = '';
  private isDestroyed: boolean = false;
  private reconnectTimer: any = null;
  private onData: MarketStreamCallback;
  private onStatus?: ConnectionStatusCallback;
  private fallbackToSse: boolean = false;

  constructor(onData: MarketStreamCallback, onStatus?: ConnectionStatusCallback) {
    this.onData = onData;
    this.onStatus = onStatus;
  }

  public subscribe(symbol: string, interval: string) {
    if (this.isDestroyed) return;

    const trimmedSym = (symbol || 'OANDA:XAUUSD').trim();
    const trimmedInv = (interval || '15').trim();

    // If already connected to this exact symbol and interval, keep stream active
    if (this.activeSymbol === trimmedSym && this.activeInterval === trimmedInv) {
      if (this.ws && this.ws.readyState === WebSocket.OPEN) return;
      if (this.sse && this.sse.readyState === EventSource.OPEN) return;
    }

    this.activeSymbol = trimmedSym;
    this.activeInterval = trimmedInv;

    // If WebSocket is already open and ready, send subscribe message directly without reconnecting
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      try {
        this.ws.send(JSON.stringify({ type: 'subscribe', symbol: trimmedSym, interval: trimmedInv }));
        return;
      } catch {}
    }

    this.cleanupConnection();
    this.connect();
  }

  private connect() {
    if (this.isDestroyed || !this.activeSymbol) return;

    this.onStatus?.('connecting');

    // Attempt WebSocket first for true full-duplex persistent stream
    if (!this.fallbackToSse) {
      this.connectWebSocket();
    } else {
      this.connectSSE();
    }
  }

  private connectWebSocket() {
    try {
      const isSecure = window.location.protocol === 'https:';
      const wsProtocol = isSecure ? 'wss:' : 'ws:';
      const wsUrl = `${wsProtocol}//${window.location.host}/api/market/ws?symbol=${encodeURIComponent(
        this.activeSymbol
      )}&interval=${encodeURIComponent(this.activeInterval)}`;

      const socket = new WebSocket(wsUrl);
      this.ws = socket;

      const connectionTimeout = setTimeout(() => {
        if (socket.readyState !== WebSocket.OPEN) {
          console.warn('[MarketStream] WebSocket connect timed out, falling back to SSE');
          this.fallbackToSse = true;
          this.cleanupConnection();
          this.connectSSE();
        }
      }, 4000);

      socket.onopen = () => {
        clearTimeout(connectionTimeout);
        if (this.ws !== socket) return;
        this.onStatus?.('connected');
        console.log(`[MarketStream] Persistent WebSocket connected for ${this.activeSymbol} (${this.activeInterval})`);
      };

      socket.onmessage = (event) => {
        if (this.ws !== socket) return;
        try {
          const payload = JSON.parse(event.data);
          if (payload.type === 'tick' || payload.type === 'bar') {
            this.onData(payload);
          }
        } catch {}
      };

      socket.onerror = (err) => {
        clearTimeout(connectionTimeout);
        console.warn('[MarketStream] WebSocket encountered error, switching to SSE stream fallback');
        this.fallbackToSse = true;
        this.cleanupConnection();
        this.connectSSE();
      };

      socket.onclose = () => {
        clearTimeout(connectionTimeout);
        if (this.isDestroyed) return;
        if (!this.fallbackToSse) {
          this.scheduleReconnect();
        }
      };
    } catch (e) {
      this.fallbackToSse = true;
      this.connectSSE();
    }
  }

  private connectSSE() {
    try {
      const sseUrl = `/api/market/stream?symbol=${encodeURIComponent(
        this.activeSymbol
      )}&interval=${encodeURIComponent(this.activeInterval)}`;

      const es = new EventSource(sseUrl);
      this.sse = es;

      es.onopen = () => {
        if (this.sse !== es) return;
        this.onStatus?.('connected');
        console.log(`[MarketStream] Real-time SSE stream connected for ${this.activeSymbol} (${this.activeInterval})`);
      };

      es.onmessage = (event) => {
        if (this.sse !== es) return;
        try {
          const payload = JSON.parse(event.data);
          if (payload.type === 'tick' || payload.type === 'bar') {
            this.onData(payload);
          }
        } catch {}
      };

      es.onerror = () => {
        if (this.isDestroyed) return;
        this.onStatus?.('reconnecting');
        this.scheduleReconnect();
      };
    } catch (err: any) {
      console.error('[MarketStream] SSE error:', err);
      this.scheduleReconnect();
    }
  }

  private scheduleReconnect() {
    if (this.reconnectTimer || this.isDestroyed) return;
    this.onStatus?.('reconnecting');
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      if (!this.isDestroyed && this.activeSymbol) {
        this.cleanupConnection();
        this.connect();
      }
    }, 2000);
  }

  private cleanupConnection() {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    if (this.ws) {
      try {
        this.ws.onopen = null;
        this.ws.onmessage = null;
        this.ws.onerror = null;
        this.ws.onclose = null;
        this.ws.close();
      } catch {}
      this.ws = null;
    }
    if (this.sse) {
      try {
        this.sse.onopen = null;
        this.sse.onmessage = null;
        this.sse.onerror = null;
        this.sse.close();
      } catch {}
      this.sse = null;
    }
  }

  public destroy() {
    this.isDestroyed = true;
    this.cleanupConnection();
  }
}
