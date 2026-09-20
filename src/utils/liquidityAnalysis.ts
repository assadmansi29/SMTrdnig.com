export interface LiquidityCandle { time: number; open: number; high: number; low: number; close: number; volume?: number }
export interface LiquidityLevel { price: number; size: number; side: string }
export interface LiquidityReport {
  symbol: string; source: string; kind: 'book' | 'estimated'; observedAt: number; marketTime: number;
  price: number; imbalance: number | null; pressure: string; levels: LiquidityLevel[];
  profile: LiquidityLevel[]; notes: string[]; sweep: string; absorption: string;
  spread?: number; buyVolume?: number; sellVolume?: number; tradeWindow?: number;
}

export function analyzeCandles(input: LiquidityCandle[], now = Date.now()) {
  const unique = new Map<number, LiquidityCandle>();
  for (const c of input) {
    if ([c.time,c.open,c.high,c.low,c.close].every(Number.isFinite) && c.low > 0 && c.high >= Math.max(c.open,c.close,c.low) && c.low <= Math.min(c.open,c.close)) unique.set(c.time,c);
  }
  const candles = [...unique.values()].sort((a,b)=>a.time-b.time).slice(-288);
  if (candles.length < 22) throw new Error('Insufficient valid candle history');
  const last = candles[candles.length-1];
  const closed = candles.filter(c=>(c.time+300)*1000 <= now);
  const recent = closed.slice(-21), trigger = recent[recent.length-1], prior = recent.slice(0,-1);
  if (!trigger || !prior.length) throw new Error('Insufficient closed candles');
  const high = Math.max(...prior.map(c=>c.high)), low = Math.min(...prior.map(c=>c.low));
  const sweep = trigger.high > high && trigger.close < high ? 'Upper range sweep candidate (closed 5m candle)' : trigger.low < low && trigger.close > low ? 'Lower range sweep candidate (closed 5m candle)' : 'No closed-candle range sweep detected';
  const min = Math.min(...closed.map(c=>c.low)), max = Math.max(...closed.map(c=>c.high));
  const step = (max-min)/24 || last.close*0.0001;
  const bins = Array.from({length:24},(_,i)=>({price:min+(i+0.5)*step,size:0,side:'Activity'}));
  const hasVolume = closed.some(c=>Number.isFinite(c.volume) && c.volume! > 0);
  for (const c of closed) {
    const index = Math.max(0,Math.min(23,Math.floor(((c.high+c.low+c.close)/3-min)/step)));
    bins[index].size += hasVolume ? Math.max(0,c.volume || 0) : 1;
  }
  const movement = recent.reduce((s,c)=>s+c.close-c.open,0);
  return {price:last.close,marketTime:last.time*1000, sweep,
    pressure: movement > 0 ? 'Upward candle pressure (estimated)' : movement < 0 ? 'Downward candle pressure (estimated)' : 'Balanced candle pressure',
    levels:[{price:high,size:0,side:'Prior 20-bar high'},{price:low,size:0,side:'Prior 20-bar low'}],
    profile:bins.filter(b=>b.size>0).sort((a,b)=>b.size-a.size).slice(0,6),hasVolume};
}

export function analyzeBook(depth: {bids: string[][]; asks: string[][]}, trades: {p:string;q:string;T:number;m:boolean}[]) {
  const parse = (rows:string[][], side:string) => rows.map(([p,q])=>({price:Number(p),size:Number(q),side})).filter(l=>Number.isFinite(l.price)&&l.price>0&&Number.isFinite(l.size)&&l.size>0);
  const bids=parse(depth.bids,'Bid'), asks=parse(depth.asks,'Ask');
  if (!bids.length || !asks.length || asks[0].price < bids[0].price) throw new Error('Invalid order book');
  const bid = bids.reduce((s,l)=>s+l.price*l.size,0), ask = asks.reduce((s,l)=>s+l.price*l.size,0);
  const valid=trades.filter(t=>Number(t.p)>0&&Number(t.q)>0&&Number.isFinite(t.T)&&typeof t.m==='boolean');
  const buyVolume=valid.filter(t=>!t.m).reduce((s,t)=>s+Number(t.q),0), sellVolume=valid.filter(t=>t.m).reduce((s,t)=>s+Number(t.q),0);
  const levels=[...bids.sort((a,b)=>b.size-a.size).slice(0,5),...asks.sort((a,b)=>b.size-a.size).slice(0,5)];
  return {price:(depth.bids[0] && Number(depth.bids[0][0])+Number(depth.asks[0][0]))/2,spread:Number(depth.asks[0][0])-Number(depth.bids[0][0]),imbalance:100*(bid-ask)/(bid+ask),levels,buyVolume,sellVolume,
    tradeWindow:valid.length? Math.max(...valid.map(t=>t.T))-Math.min(...valid.map(t=>t.T)):0,
    marketTime:valid.length?Math.max(...valid.map(t=>t.T)):0};
}
