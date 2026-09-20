import assert from 'node:assert/strict';
import {mkdtempSync,readFileSync,writeFileSync,unlinkSync,rmdirSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {initializeReactionTradePersistence,getReactionTrades,updateReactionTradePrice,clearReactionTrade,openReactionTrade} from '../server/services/reactionTradeEngine';
import type {ReactionZoneSignal} from '../src/components/chart/reactionZoneSignalCalculator';
const directory=mkdtempSync(join(tmpdir(),'reaction-checkpoint-')),file=join(directory,'trades.json');
const now=Date.now()-10000;
const trade={id:'restored',zoneId:'zone',symbol:'OANDA:XAUUSD',strategy:'fib',direction:'buy',entry:2300,current:2301,stop:2297.5,tp1:2303.5,tp2:2307,tp1Hit:false,tp2Hit:false,openedAt:now,updatedAt:now,unit:.1,unitLabel:'Points',decimals:2};
writeFileSync(file,JSON.stringify({trades:[trade],consumed:['OANDA:XAUUSD:fib:completed']}));
try {
  initializeReactionTradePersistence(file);
  assert.equal(getReactionTrades()[0].entry,2300);
  updateReactionTradePrice(trade.symbol,2303.5,now+1000);
  const checkpoint=JSON.parse(readFileSync(file,'utf8'));
  assert.equal(checkpoint.trades[0].stop,2300);assert.equal(checkpoint.trades[0].tp1Hit,true);
  clearReactionTrade('restored');assert.deepEqual(JSON.parse(readFileSync(file,'utf8')).trades,[]);
  openReactionTrade({id:'completed',entryPrice:2300,entryAt:now,direction:'bullish'} as ReactionZoneSignal,trade.symbol,'fib','other');
  assert.equal(getReactionTrades().length,0,'completed events remain consumed after restore');
  console.log('PASS server checkpoint restores active trade, retains TP1 break-even and prevents completed event replay');
}finally{unlinkSync(file);rmdirSync(directory);}
