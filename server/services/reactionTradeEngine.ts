import {reactionPointUnit, type ReactionZoneSignal} from '../../src/components/chart/reactionZoneSignalCalculator';
import {readFileSync,writeFileSync,renameSync,mkdirSync} from 'node:fs';
import {dirname} from 'node:path';

export interface ReactionTrade {
  id:string; zoneId:string; symbol:string; strategy:string; direction:'buy'|'sell';
  entry:number; current:number; stop:number; tp1:number; tp2:number;
  tp1Hit:boolean; tp2Hit:boolean; openedAt:number; updatedAt:number;
  unit:number; unitLabel:string; decimals:number;
}
let trades:ReactionTrade[]=[];
let consumed:string[]=[];
const listeners=new Set<()=>void>();
let stateFile:string|null=null;
export function initializeReactionTradePersistence(file:string) {
  if(stateFile)return;
  try {
    const saved=JSON.parse(readFileSync(file,'utf8'));
    trades=(Array.isArray(saved.trades)?saved.trades:[]).filter((t:any)=>typeof t.id==='string'&&typeof t.symbol==='string'&&typeof t.strategy==='string'&&['buy','sell'].includes(t.direction)&&[t.entry,t.current,t.stop,t.tp1,t.tp2,t.unit,t.openedAt,t.updatedAt].every(Number.isFinite)&&t.unit>0&&t.entry>0);
    consumed=Array.isArray(saved.consumed)?saved.consumed.filter((s:unknown)=>typeof s==='string').slice(-500):[];
  }catch(error:any){if(error.code!=='ENOENT')throw error;}
  mkdirSync(dirname(file),{recursive:true});
  stateFile=file;
}
const publish=(persist:boolean)=>{
  if(persist&&stateFile) {
    // Atomic server-owned checkpoint; never writes strategy/drawing database records.
    try {
      writeFileSync(stateFile+'.tmp',JSON.stringify({trades,consumed}));
      renameSync(stateFile+'.tmp',stateFile);
    }catch{console.error('[Reaction authority] Trade checkpoint unavailable; live shared state retained.');}
  }
  listeners.forEach(fn=>fn());
};
export const subscribeReactionTrades=(fn:()=>void)=>{listeners.add(fn);return()=>{listeners.delete(fn);};};
export const getReactionTrades=()=>trades;
export function openReactionTrade(signal:ReactionZoneSignal, symbol:string,strategy:string,zoneId:string) {
  if(!signal.entryPrice || signal.direction==='neutral' || !symbol) return;
  const id=`${symbol}:${strategy}:${signal.id}`;
  if(consumed.includes(id) || trades.some(t=>t.symbol===symbol&&t.strategy===strategy&&t.zoneId===zoneId))return;
  const unit=reactionPointUnit(symbol), side=signal.direction==='bullish'?1:-1;
  const entry=signal.entryPrice, openedAt=signal.entryAt||Date.now();
  trades=[...trades,{id,zoneId,symbol,strategy,direction:side===1?'buy':'sell',entry,current:entry,stop:entry-side*25*unit.size,tp1:entry+side*35*unit.size,tp2:entry+side*70*unit.size,tp1Hit:false,tp2Hit:false,openedAt,updatedAt:openedAt,unit:unit.size,unitLabel:unit.label,decimals:unit.decimals}];
  consumed=[...consumed,id].slice(-500);
  publish(true);
}
export function updateReactionTradePrice(symbol:string,price:number,timeMs:number) {
  if(!Number.isFinite(price)||price<=0||!Number.isFinite(timeMs)||timeMs>Date.now()+60000)return;
  let changed=false,persist=false;
  trades=trades.flatMap(t=>{
    if(t.symbol!==symbol || timeMs<t.openedAt || timeMs<t.updatedAt)return [t];
    const side=t.direction==='buy'?1:-1;
    const rounding=Number.EPSILON*Math.max(1,Math.abs(price),Math.abs(t.tp1),Math.abs(t.tp2))*4;
    if(side*(price-(t.tp1Hit?t.entry:t.stop))<=rounding){changed=true;persist=true;return [];}
    const tp1Hit=t.tp1Hit||side*(price-t.tp1)>=-rounding,tp2Hit=t.tp2Hit||side*(price-t.tp2)>=-rounding;
    const stop=tp1Hit?t.entry:t.stop;
    persist ||= tp1Hit!==t.tp1Hit||tp2Hit!==t.tp2Hit||stop!==t.stop;
    changed ||= price!==t.current||timeMs!==t.updatedAt;
    return [{...t,current:price,updatedAt:timeMs,tp1Hit,tp2Hit,stop}];
  });
  if(changed)publish(persist);
}
export function clearReactionTrade(id:string) {trades=trades.filter(t=>t.id!==id);publish(true);}
export function reactionTradePoints(t:ReactionTrade) {return (t.direction==='buy'?t.current-t.entry:t.entry-t.current)/t.unit;}
