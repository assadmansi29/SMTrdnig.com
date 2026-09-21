import { Router } from 'express';
import {fetchMarketCandlesDirect} from './marketRoutes';
import {marketStreamManager} from '../services/marketStreamService';
import {createLiquidityCandleReader} from '../services/liquidityCandleReader';
import {liquiditySymbol,liquidityInterval} from '../../src/utils/liquiditySymbols';
import { analyzeBook, LiquidityReport } from '../../src/utils/liquidityAnalysis';

const router = Router();
const readCandles=createLiquidityCandleReader({history:fetchMarketCandlesDirect,
  liveBars:(symbol,interval,bars)=>marketStreamManager.mergeCurrentBars(symbol,interval,bars),
  quote:symbol=>marketStreamManager.getLastKnownTick(symbol)});
// One reader lease per OANDA instrument, released after the reader stops polling.
// Existing chart subscriptions keep their own independent reference counts.
const leases=new Map<string,ReturnType<typeof setTimeout>>();
function keepReaderFeed(symbol:string) {
  const old=leases.get(symbol);
  if(old)clearTimeout(old);else marketStreamManager.subscribeSymbol(symbol,symbol);
  const timer=setTimeout(()=>{leases.delete(symbol);marketStreamManager.unsubscribeSymbol(symbol);},60000);
  timer.unref();leases.set(symbol,timer);
}
const cache=new Map<string,{data:LiquidityReport;expires:number}>();
const pending=new Map<string,Promise<LiquidityReport>>();
async function json(path:string) {
  const res=await fetch(`https://data-api.binance.vision/api/v3/${path}`,{signal:AbortSignal.timeout(8000)});
  if(!res.ok) throw new Error(`Binance market data unavailable (${res.status})`);
  return res.json();
}
async function read(symbol:string,interval:string):Promise<LiquidityReport> {
  if(symbol==='BINANCE:BTCUSDT') {
    const [depth,trades]=await Promise.all([json('depth?symbol=BTCUSDT&limit=100'),json('aggTrades?symbol=BTCUSDT&limit=500')]);
    const data=analyzeBook(depth,trades);
    return {...data,symbol:'BTCUSDT',source:'Binance spot · public depth + aggregate trades',kind:'book',observedAt:Date.now(),profile:[],
      pressure:data.buyVolume>data.sellVolume?'Buyer-initiated traded volume leads':'Seller-initiated traded volume leads',
      sweep:'Not inferred from depth snapshots',absorption:'Not confirmed — requires synchronized depth and trade history',
      notes:['Real displayed liquidity on Binance only; 100 levels per side, sampled every 5 seconds.','Sizes are aggregated BTC at each price, not individual or institutional orders. Orders can cancel.','Imbalance uses quote notional in the returned depth; trade pressure uses the latest 500 aggregate trades.']};
  }
  keepReaderFeed(symbol);
  return readCandles(symbol,interval);
}
router.get('/',async(req,res)=>{
  let symbol:string,interval:string;
  try {symbol=liquiditySymbol(String(req.query.symbol||'BTCUSDT'));interval=liquidityInterval(String(req.query.interval||'5')).interval;}
  catch(error){res.status(400).json({error:error instanceof Error?error.message:'Unsupported liquidity instrument'});return;}
  const key=JSON.stringify([symbol,symbol==='BINANCE:BTCUSDT'?'book':interval]);
  res.setHeader('Cache-Control','no-store');
  const old=cache.get(key);
  if(old && old.expires>Date.now()){res.json(old.data);return;}
  try {
    let work=pending.get(key);
    if(!work){work=read(symbol,interval);pending.set(key,work);work.finally(()=>pending.delete(key)).catch(()=>{});}
    const data=await work;
    cache.set(key,{data,expires:Date.now()+5000});
    if(cache.size>64)cache.delete(cache.keys().next().value!);
    res.json(data);
  }catch(error){res.status(503).json({error:error instanceof Error?error.message:'Liquidity data unavailable'});}
});
export default router;
