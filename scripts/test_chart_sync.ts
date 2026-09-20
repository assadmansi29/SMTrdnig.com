import assert from 'node:assert/strict';
import { liveCandleTime, timestampSeconds } from '../src/utils/liveCandleTime.ts';
import { MarketStreamClient } from '../src/services/marketStreamClient.ts';
import { getMarketScheduleStatus } from '../src/utils/marketSchedule.ts';

const open = Date.UTC(2026, 8, 18, 21) / 1000;
assert.equal(liveCandleTime(open + 299, open, 300), open);
assert.equal(liveCandleTime(open + 300, open, 300), open + 300);
assert.equal(liveCandleTime((open + 301) * 1000, open, 300), open + 300);
assert.equal(timestampSeconds(open * 1000), open);
assert.equal(liveCandleTime(open + 40000, open, 86400), open, 'OANDA daily bars retain provider session alignment');
assert.equal(liveCandleTime(open + 86400, open, 86400), open + 86400);
for (const date of ['2026-09-19T12:00:00Z', '2026-09-20T12:00:00Z', '2026-09-21T12:00:00Z']) {
  assert.equal(getMarketScheduleStatus('BINANCE:BTCUSDT', new Date(date)).status, 'MARKET OPEN');
}
assert.equal(getMarketScheduleStatus('OANDA:XAUUSD', new Date('2026-09-19T12:00:00Z')).status, 'MARKET CLOSED');

const callbacks: (()=>void)[] = [];
const realTimeout = globalThis.setTimeout, realClear = globalThis.clearTimeout;
(globalThis as any).setTimeout = (fn:()=>void) => { callbacks.push(fn);return callbacks.length; };
(globalThis as any).clearTimeout = () => {};
let sseCount=0;
class Socket {
  static OPEN=1;readyState=0;onopen:any;onmessage:any;onerror:any;onclose:any;
  constructor(_url:string){}close(){this.readyState=3;}
}
class SSE { constructor(_url:string){sseCount++;} }
(globalThis as any).window={location:{protocol:'http:',host:'localhost'}};
(globalThis as any).WebSocket=Socket;
(globalThis as any).EventSource=SSE;
try {
  const client=new MarketStreamClient(()=>{});
  client.subscribe('BINANCE:BTCUSDT','1');
  client.subscribe('BINANCE:BTCUSDT','5');
  callbacks[0]();
  assert.equal(sseCount,0,'old timeframe timeout cannot replace new connection');
  client.destroy();callbacks[1]();
  assert.equal(sseCount,0,'destroyed client timeout cannot resurrect SSE');
} finally {globalThis.setTimeout=realTimeout;globalThis.clearTimeout=realClear;}
console.log('PASS: candle boundaries, millisecond timestamps, OANDA session alignment, 24/7 BTC status, stale connection timeouts');
