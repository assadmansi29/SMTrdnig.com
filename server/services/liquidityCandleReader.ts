import {analyzeCandles,type LiquidityCandle,type LiquidityReport} from '../../src/utils/liquidityAnalysis';
import {liquidityInterval} from '../../src/utils/liquiditySymbols';
import {liveCandleTime,timestampSeconds} from '../../src/utils/liveCandleTime';
interface Dependencies {
  history:(symbol:string,interval:string,count:number)=>Promise<LiquidityCandle[]>;
  liveBars:(symbol:string,interval:string,bars:LiquidityCandle[])=>LiquidityCandle[];
  quote:(symbol:string)=>{price:number;time:number}|null;
  now?:()=>number;
}
export function createLiquidityCandleReader(deps:Dependencies) {
  const history=new Map<string,{bars:LiquidityCandle[];expires:number}>();
  const pending=new Map<string,Promise<LiquidityCandle[]>>();
  const now=deps.now??Date.now;
  return async(symbol:string,rawInterval:string):Promise<LiquidityReport>=>{
    const {interval,seconds}=liquidityInterval(rawInterval),key=JSON.stringify([symbol,interval]);
    let cached=history.get(key);
    if(!cached||cached.expires<=now()) {
      let work=pending.get(key);
      if(!work) {
        work=deps.history(symbol,interval,288).then(rows=>rows.map(c=>({...c,time:timestampSeconds(Number(c.time))})).sort((a,b)=>a.time-b.time));
        pending.set(key,work);work.finally(()=>pending.delete(key)).catch(()=>{});
      }
      try {
        const bars=await work;
        if(bars.length>=3){cached={bars,expires:now()+30000};history.delete(key);history.set(key,cached);}
      }catch{/* Existing live bars or the last genuine history can still be analyzed. */}
      if(history.size>64)history.delete(history.keys().next().value!);
    }
    if(!cached) {
      const bars=deps.liveBars(symbol,interval,[]);
      if(bars.length<3)throw new Error('Insufficient valid candle history');
      cached={bars,expires:now()};
    }
    const bars=deps.liveBars(symbol,interval,cached.bars).map(c=>({...c})).sort((a,b)=>a.time-b.time);
    const tick=deps.quote(symbol),last=bars.at(-1);
    let quoteTime:number|undefined;
    // Quote overlay is reader-owned. It never changes shared candle caches.
    if(last&&tick&&Number.isFinite(tick.price)&&tick.price>0&&Number.isFinite(tick.time)
      &&tick.time*1000<=now()+1000&&now()-tick.time*1000<=15000&&tick.time>=last.time) {
      const time=liveCandleTime(tick.time,last.time,seconds);
      if(time===last.time){last.close=tick.price;last.high=Math.max(last.high,tick.price);last.low=Math.min(last.low,tick.price);}
      else bars.push({time,open:tick.price,high:tick.price,low:tick.price,close:tick.price});
      quoteTime=tick.time*1000;
    }
    const data=analyzeCandles(bars,now(),seconds),ticker=symbol.split(':')[1];
    const priceDecimals=/^(XAU)/.test(ticker)?2:/^(XAG|WTI|BCO)/.test(ticker)?3:/^[A-Z]{6}$/.test(ticker)?ticker.endsWith('JPY')?3:5:2;
    return {...data,symbol:ticker,interval,intervalSeconds:seconds,priceDecimals,kind:'estimated',
      source:'OANDA candles via existing TradingView adapter',observedAt:now(),marketTime:quoteTime??data.marketTime,imbalance:null,
      absorption:'Unavailable from OHLC candles',notes:[
        'Estimated price-interaction levels, not real resting orders or institutional liquidity.',
        'Selected chart timeframe; closed candles define range sweeps and repeated swing-level clusters.',
        data.hasVolume?'Activity profile allocates provider volume to each candle’s typical price; not exchange volume-at-price.':'No provider volume: profile shows candle counts at typical prices, not traded volume.',
        'Live quotes refresh every 5 seconds; historical candles refresh every 30 seconds. Missing tick volume is not estimated.'
      ]};
  };
}
