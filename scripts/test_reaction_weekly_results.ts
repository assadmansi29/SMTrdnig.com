import assert from 'node:assert/strict';
import {mkdtempSync,readFileSync,unlinkSync,rmdirSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {fileURLToPath} from 'node:url';
import {spawnSync} from 'node:child_process';
import {initializeReactionTradePersistence,openReactionTrade,updateReactionTradePrice,getReactionTrades,clearReactionTrade,getWeeklyReactionResults} from '../server/services/reactionTradeEngine';
import {reactionWeekStart,summarizeReactionWeek,type CompletedReactionTrade} from '../server/services/reactionWeeklyResults';
import {ReactionAuthority} from '../server/services/reactionAuthority';
import type {ReactionZoneSignal} from '../src/components/chart/reactionZoneSignalCalculator';
const monday=Date.parse('2026-09-07T00:00:00Z'),day=86400000,nextMonday=monday+7*day;
const signal=(id:string,entry:number,time:number,direction='bullish')=>({id,entryPrice:entry,entryAt:time,direction} as ReactionZoneSignal);
if(process.argv[2]==='--restore') {
 initializeReactionTradePersistence(process.argv[3]);
 const ledger=JSON.parse(readFileSync(process.argv[3],'utf8')).completedTrades;
 assert.equal(ledger.length,4);assert.equal(new Set(ledger.map((r:any)=>r.id)).size,4);
 assert.equal(getWeeklyReactionResults(monday+6*day).strategies.find(g=>g.strategy==='fib')!.trades,2);
 assert.equal(getWeeklyReactionResults(nextMonday+1000).strategies.find(g=>g.strategy==='fib')!.trades,1);
 openReactionTrade(signal('be',2300,monday+1), 'OANDA:XAUUSD','fib','replay');assert.equal(getReactionTrades().length,0,'durable dedupe blocks completed ID');
 console.log('PASS checkpoint restore retains immutable completed results and deduplication');
} else {
 const directory=mkdtempSync(join(tmpdir(),'weekly-signals-')),file=join(directory,'trades.json');
 try {
  initializeReactionTradePersistence(file);
  openReactionTrade(signal('be',2300,monday+1),'OANDA:XAUUSD','fib','gold');
  assert.equal(getWeeklyReactionResults(monday+2).strategies.length,0,'open trade excluded');
  updateReactionTradePrice('OANDA:XAUUSD',2303.5,monday+1000);
  updateReactionTradePrice('OANDA:XAUUSD',2307,monday+2000);
  assert.equal(getWeeklyReactionResults(monday+2000).strategies.length,0,'TP1/TP2 do not close a trade');
  updateReactionTradePrice('OANDA:XAUUSD',2300,monday+3000);
  let group=getWeeklyReactionResults(monday+3000).strategies[0];assert.equal(group.trades,1);assert.equal(group.breakeven,1);assert.equal(group.records[0].highestTp,'TP2');assert.equal(group.points,0);
  updateReactionTradePrice('OANDA:XAUUSD',2290,monday+4000);assert.equal(getWeeklyReactionResults(monday+4000).strategies[0].trades,1);
  openReactionTrade(signal('clear',2300,monday+5000),'OANDA:XAUUSD','fib','clear');clearReactionTrade(getReactionTrades()[0].id);assert.equal(getWeeklyReactionResults(monday+6000).strategies[0].trades,1,'admin dismissal is not a completed trade');
  const friday=monday+4*day+1000;
  openReactionTrade(signal('loss',1.1,friday,'bearish'),'OANDA:EURUSD','fib','forex');
  updateReactionTradePrice('OANDA:EURUSD',1.1032,friday+1000);
  group=getWeeklyReactionResults(friday+1000).strategies[0];assert.equal(group.trades,2);assert.equal(group.losses,1);assert.equal(group.points,-32);assert.equal(group.records[0].unitLabel,'Pips');assert.equal(group.records[0].exitPrice,1.1032,'first official closing quote, not invented fill');
  const saturday=monday+5*day;
  openReactionTrade(signal('weekend',60000,saturday),'BINANCE:BTCUSDT','fib','btc');updateReactionTradePrice('BINANCE:BTCUSDT',59970,saturday+1000);
  assert.equal(getWeeklyReactionResults(saturday+2000).strategies[0].trades,2,'weekend completion excluded');
  assert.equal(getWeeklyReactionResults(nextMonday-1).strategies[0].trades,2,'Friday results remain through Sunday');
  openReactionTrade(signal('carry',2300,friday+3000),'OANDA:XAUUSD','fib','carry');
  assert.equal(getWeeklyReactionResults(nextMonday).strategies.length,0,'Monday resets even with a carried open trade');
  updateReactionTradePrice('OANDA:XAUUSD',2297,nextMonday+1000);
  group=getWeeklyReactionResults(nextMonday+1000).strategies[0];assert.equal(group.trades,1);assert.equal(group.points,-30);assert.equal(group.records[0].openedAt,friday+3000);
  const record=group.records[0];const summary=summarizeReactionWeek([{...record,id:'win',strategy:'smc',points:35,outcome:'win'} as CompletedReactionTrade,record],nextMonday+1000);
  assert.equal(summary.strategies.find(g=>g.strategy==='smc')!.wins,1);assert.equal(summary.strategies.find(g=>g.strategy==='fib')!.losses,1,'strategy isolation');
  assert.equal(reactionWeekStart(Date.parse('2026-09-13T23:59:59.999Z')),monday);assert.equal(reactionWeekStart(nextMonday),nextMonday);
  let now=nextMonday-1;const authority=new ReactionAuthority(()=>now),clients:any[][]=[[],[]];const unsubscribe=clients.map(c=>authority.subscribe(s=>c.push(s)));
  authority.refreshWeeklyResults();now=nextMonday;authority.refreshWeeklyResults();assert.deepEqual(clients[0],clients[1]);assert.equal(clients[0].at(-1).weeklyResults.strategies.length,0,'all users reset without a market tick');unsubscribe.forEach(fn=>fn());
  const restored=spawnSync(process.execPath,['--import','tsx',fileURLToPath(import.meta.url),'--restore',file],{encoding:'utf8'});assert.equal(restored.status,0,restored.stderr);console.log(restored.stdout.trim());
  console.log('PASS official closure only; TP milestones/open trades excluded; actual point/pip P&L; no duplicate; manual dismissals excluded; weekday scope/weekend retention; Monday UTC rollover; strategy separation; identical shared snapshots');
 } finally {unlinkSync(file);rmdirSync(directory);}
}
