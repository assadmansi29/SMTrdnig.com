import type {ReactionTrade} from './reactionTradeEngine';
import {achievedReactionPoints} from '../../src/utils/reactionTradePoints';

export interface CompletedReactionTrade {
  id:string; symbol:string; strategy:string; direction:'buy'|'sell';
  entry:number; exitPrice:number; openedAt:number; closedAt:number;
  reason:'stop_loss'|'break_even'; highestTp:'TP1'|'TP2'|'TP3'|null;
  points:number; outcome:'win'|'loss'|'breakeven'; unit:number; unitLabel:string; decimals:number;
}
export interface WeeklyStrategyResults {
  strategy:string; trades:number; wins:number; losses:number; breakeven:number; points:number;
  records:CompletedReactionTrade[];
}
export interface WeeklyReactionResults {
  weekStart:number; resetsAt:number; timezone:'UTC'; strategies:WeeklyStrategyResults[];
}
export function reactionWeekStart(now:number):number {
  const date=new Date(now);
  date.setUTCHours(0,0,0,0);
  date.setUTCDate(date.getUTCDate()-(date.getUTCDay()+6)%7);
  return date.getTime();
}
export function completedReactionTrade(trade:ReactionTrade,exitPrice:number,closedAt:number):CompletedReactionTrade {
  const protectedTrade=trade.tp1Hit||trade.tp2Hit||trade.tp3Hit;
  // A protected remainder exits at Entry with no additional loss, even on a gap.
  exitPrice=protectedTrade?trade.entry:trade.stop;
  const points=protectedTrade?achievedReactionPoints(trade):Number(((trade.direction==='buy'?exitPrice-trade.entry:trade.entry-exitPrice)/trade.unit).toFixed(8));
  return {id:trade.id,symbol:trade.symbol,strategy:trade.strategy,direction:trade.direction,
    entry:trade.entry,exitPrice,openedAt:trade.openedAt,closedAt,
    reason:protectedTrade?'break_even':'stop_loss',highestTp:trade.tp3Hit?'TP3':trade.tp2Hit?'TP2':trade.tp1Hit?'TP1':null,
    points,outcome:points>0?'win':points<0?'loss':'breakeven',unit:trade.unit,unitLabel:trade.unitLabel,decimals:trade.decimals};
}
export function summarizeReactionWeek(records:CompletedReactionTrade[],now:number):WeeklyReactionResults {
  const weekStart=reactionWeekStart(now),groups=new Map<string,WeeklyStrategyResults>();
  for(const record of records) {
    // Completion date owns the result, including positions carried into the week.
    // Saturday/Sunday completions are never assigned to Friday or next Monday.
    if(record.closedAt<weekStart||record.closedAt>=weekStart+5*86400000||record.closedAt>now)continue;
    let group=groups.get(record.strategy);
    if(!group){group={strategy:record.strategy,trades:0,wins:0,losses:0,breakeven:0,points:0,records:[]};groups.set(record.strategy,group);}
    group.trades++;group[record.outcome==='win'?'wins':record.outcome==='loss'?'losses':'breakeven']++;
    group.points+=record.points;group.records.push(record);
  }
  for(const group of groups.values()) {
    group.points=Number(group.points.toFixed(8));
    group.records.sort((a,b)=>b.closedAt-a.closedAt||a.id.localeCompare(b.id));
  }
  return {weekStart,resetsAt:weekStart+7*86400000,timezone:'UTC',strategies:[...groups.values()].sort((a,b)=>a.strategy.localeCompare(b.strategy))};
}
export function validCompletedReactionTrade(value:any):value is CompletedReactionTrade {
  return value&&typeof value.id==='string'&&typeof value.symbol==='string'&&typeof value.strategy==='string'
    &&['buy','sell'].includes(value.direction)&&['stop_loss','break_even'].includes(value.reason)
    &&['win','loss','breakeven'].includes(value.outcome)&&[null,'TP1','TP2','TP3'].includes(value.highestTp)
    &&[value.entry,value.exitPrice,value.openedAt,value.closedAt,value.points,value.unit,value.decimals].every(Number.isFinite)
    &&value.entry>0&&value.exitPrice>0&&value.unit>0&&value.closedAt>=value.openedAt;
}
