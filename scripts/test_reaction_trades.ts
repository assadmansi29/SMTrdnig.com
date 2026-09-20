import assert from 'node:assert/strict';
import {reactionPointUnit, type ReactionZoneSignal} from '../src/components/chart/reactionZoneSignalCalculator';
import {openReactionTrade,getReactionTrades,updateReactionTradePrice,reactionTradePoints,clearReactionTrade} from '../server/services/reactionTradeEngine';
const now=Date.now()-10000;
let count=0;
for(const [symbol,entry] of [['OANDA:XAUUSD',2345.2],['OANDA:EURUSD',1.1],['OANDA:USDJPY',150],['OANDA:WTICOUSD',70],['OANDA:NAS100USD',20000],['OANDA:US30USD',40000],['BINANCE:BTCUSDT',60000]] as const)for(const side of [-1,1]){
 const u=reactionPointUnit(symbol),signal={id:`${symbol}-${side}`,entryPrice:entry,entryAt:now,direction:side>0?'bullish':'bearish'} as ReactionZoneSignal;
 const quote=(points:number)=>Number((entry+side*points*u.size).toFixed(u.decimals));
 openReactionTrade(signal,symbol,'fib','zone');const original=getReactionTrades()[0];assert.ok(Math.abs(Math.abs(original.stop-entry)/u.size-25)<1e-6);
 updateReactionTradePrice(symbol,quote(-10),now+1000);assert.ok(Math.abs(reactionTradePoints(getReactionTrades()[0])+10)<1e-6);assert.equal(getReactionTrades()[0].stop,original.stop);
 updateReactionTradePrice(symbol,quote(34.9),now+2000);assert.equal(getReactionTrades()[0].tp1Hit,false);assert.equal(getReactionTrades()[0].stop,original.stop,'never protect early');
 updateReactionTradePrice(symbol,quote(35),now-1);assert.equal(getReactionTrades()[0].tp1Hit,false,'ignore pre-entry/stale quote');
 updateReactionTradePrice(symbol,quote(35),now+3000);assert.equal(getReactionTrades()[0].tp1Hit,true);assert.equal(getReactionTrades()[0].stop,entry,'exact entry only at TP1');
 updateReactionTradePrice(symbol,quote(70),now+4000);assert.ok(getReactionTrades()[0].tp2Hit);assert.equal(getReactionTrades().length,1,'TP3 stays open');assert.equal(getReactionTrades()[0].stop,entry);
 updateReactionTradePrice(symbol,quote(10),now+5000);assert.equal(getReactionTrades()[0].stop,entry,'no reverting the stop');
 openReactionTrade(signal,symbol,'fib','zone');assert.equal(getReactionTrades().length,1,'no duplicate');
 updateReactionTradePrice(symbol,entry,now+6000);assert.equal(getReactionTrades().length,0,'return to entry closes at break-even');
 openReactionTrade(signal,symbol,'fib','zone');assert.equal(getReactionTrades().length,0,'completed signal cannot reopen');
 openReactionTrade({...signal,id:signal.id+'manual'},symbol,'smc','zone');clearReactionTrade(getReactionTrades()[0].id);assert.equal(getReactionTrades().length,0,'manual clear remains');
 openReactionTrade({...signal,id:signal.id+'stop'},symbol,'smc','zone');updateReactionTradePrice(symbol,quote(-25),now+7000);assert.equal(getReactionTrades().length,0,'original stop before TP1');
 console.log(`PASS ${symbol} ${side}: initial SL, no early BE, exact TP1 -> entry, TP2/TP3, BE exit, manual clear`);count++;
}
console.log(`${count} trade-management cases passed`);
