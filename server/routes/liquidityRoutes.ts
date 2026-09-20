import { Router } from 'express';
import { tv } from 'tradingview-api-adapter';
import { analyzeBook, analyzeCandles, LiquidityReport } from '../../src/utils/liquidityAnalysis';

const router = Router();
const instruments: Record<string,string> = {XAUUSD:'OANDA:XAUUSD',NASDAQ:'OANDA:NAS100USD',US30:'OANDA:US30USD',WTI:'OANDA:WTICOUSD',BTCUSDT:'BINANCE:BTCUSDT'};
// Reader-only client/cache: no interaction with chart subscriptions or storage.
const client=tv();
const cache=new Map<string,{data:LiquidityReport;expires:number}>();
const pending=new Map<string,Promise<LiquidityReport>>();
async function json(path:string) {
  const res=await fetch(`https://data-api.binance.vision/api/v3/${path}`,{signal:AbortSignal.timeout(8000)});
  if(!res.ok) throw new Error(`Binance market data unavailable (${res.status})`);
  return res.json();
}
async function read(symbol:string):Promise<LiquidityReport> {
  if(symbol==='BTCUSDT') {
    const [depth,trades]=await Promise.all([json('depth?symbol=BTCUSDT&limit=100'),json('aggTrades?symbol=BTCUSDT&limit=500')]);
    const data=analyzeBook(depth,trades);
    return {...data,symbol,source:'Binance spot · public depth + aggregate trades',kind:'book',observedAt:Date.now(),profile:[],
      pressure:data.buyVolume>data.sellVolume?'Buyer-initiated traded volume leads':'Seller-initiated traded volume leads',
      sweep:'Not inferred from depth snapshots',absorption:'Not confirmed — requires synchronized depth and trade history',
      notes:['Real displayed liquidity on Binance only; 100 levels per side, sampled every 5 seconds.','Sizes are aggregated BTC at each price, not individual or institutional orders. Orders can cancel.','Imbalance uses quote notional in the returned depth; trade pressure uses the latest 500 aggregate trades.']};
  }
  let timer:ReturnType<typeof setTimeout> | undefined;
  try {
    const rows=await Promise.race([client.symbol(instruments[symbol]).candles({timeframe:'5',count:288}),new Promise<never>((_,reject)=>{timer=setTimeout(()=>reject(new Error('OANDA candle request timed out')),12000);})]);
    const data=analyzeCandles(rows.map(c=>({time:Number(c.time),open:Number(c.open),high:Number(c.high),low:Number(c.low),close:Number(c.close),volume:Number(c.volume)})));
    return {...data,symbol,kind:'estimated',source:'OANDA candles via existing TradingView adapter',observedAt:Date.now(),imbalance:null,
      absorption:'Unavailable from OHLC candles',notes:['Estimated price-interaction levels, not real resting orders or institutional liquidity.','5-minute candles; prior 20 closed bars define nearby levels. A range sweep is a price-pattern candidate only.',data.hasVolume?'Activity profile allocates provider volume to each candle’s typical price; not exchange volume-at-price.':'No provider volume: profile shows candle counts at typical prices, not traded volume.','Snapshots refresh every 30 seconds; the candle timestamp shows whether the market/feed is current.']};
  } finally {if(timer)clearTimeout(timer);}
}
router.get('/',async(req,res)=>{
  const symbol=String(req.query.symbol||'BTCUSDT').toUpperCase();
  if(!instruments[symbol]){res.status(400).json({error:'Unsupported liquidity instrument'});return;}
  res.setHeader('Cache-Control','no-store');
  const old=cache.get(symbol);
  if(old && old.expires>Date.now()){res.json(old.data);return;}
  try {
    let work=pending.get(symbol);
    if(!work){work=read(symbol);pending.set(symbol,work);work.finally(()=>pending.delete(symbol)).catch(()=>{});}
    const data=await work;
    cache.set(symbol,{data,expires:Date.now()+(symbol==='BTCUSDT'?5000:30000)});
    res.json(data);
  }catch(error){res.status(503).json({error:error instanceof Error?error.message:'Liquidity data unavailable'});}
});
export default router;
