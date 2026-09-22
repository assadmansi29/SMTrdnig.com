import type {WeeklyReactionResults} from '../../../server/services/reactionWeeklyResults';
import type {ReactionTrade} from '../../../server/services/reactionTradeEngine';
import type {LineEvaluationResult} from './reactionZoneSignalCalculator';
import {observeServerTime,synchronizeServerClock} from '../../services/serverClock';
import {resolveRealtimeTvSymbol} from '../../../server/services/marketProviders';
export type {ReactionTrade};
let trades:ReactionTrade[]=[];
let weeklyResults:WeeklyReactionResults|null=null;
export const getWeeklyReactionResults=()=>weeklyResults;
let evaluations:Record<string,LineEvaluationResult|null>={};
let epoch='', sequence=-1;
const listeners=new Set<()=>void>();
export const subscribeReactionTrades=(fn:()=>void)=>{listeners.add(fn);return()=>{listeners.delete(fn);};};
export const getReactionTrades=()=>trades;
export function canonicalReactionSymbol(symbol:string) {
  try{return resolveRealtimeTvSymbol(symbol);}catch{return symbol;}
}
export function getReactionEvaluation(symbol:string,strategy:string,id:string,interval='5') {
  return evaluations[JSON.stringify(interval==='5'?[canonicalReactionSymbol(symbol),strategy,id]:[canonicalReactionSymbol(symbol),strategy,id,interval])]||null;
}
export function receiveReactionSnapshot(state:any) {
  if(!state||typeof state.epoch!=='string'||!Number.isInteger(state.sequence)||!Array.isArray(state.trades)||!state.evaluations)return;
  observeServerTime(state.serverTime);
  if(state.epoch===epoch&&state.sequence<=sequence)return;
  epoch=state.epoch;sequence=state.sequence;trades=state.trades;evaluations=state.evaluations;weeklyResults=state.weeklyResults??null;
  listeners.forEach(fn=>fn());
}
let subscribers=0, stream:EventSource|null=null, timer:ReturnType<typeof setInterval>|null=null;
const resync=()=>{void synchronizeServerClock();};
export function connectReactionAuthority(isAdmin=false) {
  if(++subscribers===1) {
    resync();timer=setInterval(resync,30000);
    document.addEventListener('visibilitychange',resync);
    const connection=new EventSource('/api/reactions/stream');
    stream=connection;
    connection.onmessage=e=>{if(stream!==connection)return;try{receiveReactionSnapshot(JSON.parse(e.data));}catch{}};
    connection.onopen=()=>{if(stream===connection)resync();};
  }
  return()=>{
    if(--subscribers===0) {
      stream?.close();stream=null;if(timer)clearInterval(timer);timer=null;
      document.removeEventListener('visibilitychange',resync);
      // Clear the shared view when its final subscriber disconnects.
      trades=[];weeklyResults=null;evaluations={};epoch='';sequence=-1;
      listeners.forEach(fn=>fn());
    }
  };
}
export async function clearReactionTrade(id:string) {
  const token=localStorage.getItem('smtrading_token');
  const response=await fetch('/api/reactions/clear',{method:'POST',credentials:'include',headers:{'Content-Type':'application/json',...(token?{Authorization:'Bearer '+token}:{})},body:JSON.stringify({id})});
  if(!response.ok)console.warn('[Reaction trade] Clear rejected by server:',response.status);
}
export {reactionTradePoints} from '../../utils/reactionTradePoints';
