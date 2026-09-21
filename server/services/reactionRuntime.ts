import {reactionWeekStart} from './reactionWeeklyResults';
import {getPool} from '../db';
import {marketStreamManager, resolveRealtimeTvSymbol} from './marketStreamService';
import {fetchMarketCandlesDirect} from '../routes/marketRoutes';
import {reactionAuthority, type PublishedReactionZone} from './reactionAuthority';
import {drawingEvents} from './drawingEvents';
import {initializeReactionTradePersistence,getReactionTrades} from './reactionTradeEngine';
import {resolve} from 'node:path';

let started=false;
let loading=false;
let reloadAgain=false;
const pinned=new Set<string>();
const seeded=new Set<string>();
const seeding=new Set<string>();
async function seed(symbol:string,interval:string) {
  const key=JSON.stringify([symbol,interval]);
  if(seeded.has(key)||seeding.has(key))return;
  seeding.add(key);
  try {
    const candles=await fetchMarketCandlesDirect(symbol,interval,500);
    if(candles.length<2)return;
    reactionAuthority.seed(symbol,candles,interval);
    marketStreamManager.updateLiveCandleInCache(symbol,interval,candles.at(-1)!);
    seeded.add(key);
  } catch {console.warn('[Reaction authority] Waiting for market history:',symbol);}
  finally {seeding.delete(key);}
}
async function reload() {
  if(loading){reloadAgain=true;return;}
  loading=true;
  try {
    const pool=getPool();if(!pool)return;
    // Read existing published drawings only. No table/schema/data changes.
    const result=await pool.query('SELECT id,symbol,strategy,type,data FROM chart_drawings ORDER BY created_at ASC');
    const zones:PublishedReactionZone[]=[];
    for(const row of result.rows) {
      try {
        const data=typeof row.data==='string'?JSON.parse(row.data):row.data;
        if(!String(row.type).startsWith('reaction-zone')&&!['strong','weak'].includes(data.options?.zoneType))continue;
        if(data.visible===false||data.options?.visible===false)continue;
        const price=Number(data.anchors?.[0]?.price);
        if(!Number.isFinite(price)||price<=0)continue;
        // Resolve legacy drawing aliases without rewriting their saved records.
        const raw=String(row.symbol).split(':').at(-1)!;
        const symbol=resolveRealtimeTvSymbol(String(row.symbol).startsWith('OANDA:')?row.symbol:raw);
        zones.push({id:row.id,symbol,strategy:row.strategy||'default',price,
          zoneType:row.type==='reaction-zone-weak'||data.options?.zoneType==='weak'?'weak':'strong'});
      }catch{/* An unsupported legacy symbol is not a new market subscription. */}
    }
    reactionAuthority.setZones(zones);
    for(const symbol of new Set([...zones.map(z=>z.symbol),...getReactionTrades().map(t=>t.symbol)])) {
      if(!pinned.has(symbol)) {pinned.add(symbol);marketStreamManager.subscribeSymbol(symbol,symbol);}
      for(const interval of ['1','5'])void seed(symbol,interval);
    }
  } catch {console.warn('[Reaction authority] Published zones unavailable; retaining current state.');}
  finally {loading=false;if(reloadAgain){reloadAgain=false;void reload();}}
}
export function startReactionRuntime() {
  if(started)return;
  initializeReactionTradePersistence(resolve(process.env.REACTION_STATE_FILE||'.runtime/reaction-trades.json'));
  started=true;
  const scheduleWeekReset=()=>{
    const now=Date.now(),nextMonday=reactionWeekStart(now)+7*86400000;
    setTimeout(()=>{reactionAuthority.refreshWeeklyResults();scheduleWeekReset();},Math.max(1,nextMonday-now)).unref();
  };
  scheduleWeekReset();
  marketStreamManager.onReactionBar((symbol,bar,time,interval)=>reactionAuthority.observe(symbol,bar,time,interval));
  drawingEvents.on('saved',()=>void reload());
  void reload();
  // Recovery/configuration refresh only; live events never wait on this timer.
  setInterval(()=>{void reload();for(const symbol of pinned)for(const interval of ['1','5'])void seed(symbol,interval);},30000).unref();
}
