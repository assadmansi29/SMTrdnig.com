import assert from 'node:assert/strict';
import {mkdtempSync,writeFileSync,readFileSync,unlinkSync,rmdirSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {initializeReactionTradePersistence,getReactionTrades,updateReactionTradePrice,getWeeklyReactionResults,type ReactionTrade} from '../server/services/reactionTradeEngine';
import {reactionTradePoints} from '../src/utils/reactionTradePoints';

const start=Date.parse('2026-09-07T00:00:00Z');
const dir=mkdtempSync(join(tmpdir(),'progressive-points-')),file=join(dir,'trades.json');
const trades:ReactionTrade[]=[];
for(const side of [1,-1])for(const level of [0,1,2,3]) {
  const id=`${side}:${level}`;
  trades.push({id,zoneId:id,symbol:id,strategy:'fib',direction:side===1?'buy':'sell',entry:1000,current:1000,
    stop:1000-side*30,tp1:1000+side*40,tp2:1000+side*60,tp3:1000+side*90,
    tp1Hit:false,tp2Hit:false,openedAt:start,updatedAt:start,unit:1,unitLabel:'Points',decimals:2});
}
writeFileSync(file,JSON.stringify({trades,consumed:[]}));
try {
  initializeReactionTradePersistence(file);
  for(const original of trades) {
    const side=original.direction==='buy'?1:-1,level=Number(original.id.split(':')[1]);
    const active=()=>getReactionTrades().find(t=>t.id===original.id)!;
    if(level) {
      updateReactionTradePrice(original.symbol,original.tp1,start+1000);
      assert.equal(reactionTradePoints(active()),40,'TP1 immediately banks 40');
      updateReactionTradePrice(original.symbol,1000+side*5,start+2000);
      assert.equal(reactionTradePoints(active()),40,'retracement cannot remove TP1 points');
      if(level>=2) {
        updateReactionTradePrice(original.symbol,original.tp2,start+3000);
        assert.equal(reactionTradePoints(active()),60,'TP2 adds only 20');
        updateReactionTradePrice(original.symbol,original.tp2,start+4000);
        assert.equal(reactionTradePoints(active()),60,'repeated quote cannot double count');
      }
      if(level===3) {
        updateReactionTradePrice(original.symbol,original.tp3!,start+5000);
        assert.equal(reactionTradePoints(active()),90,'TP3 adds only its incremental distance');
      }
      const saved=JSON.parse(readFileSync(file,'utf8')).trades.find((t:ReactionTrade)=>t.id===original.id);
      assert.equal(reactionTradePoints(saved),[0,40,60,90][level],'checkpoint preserves achieved points');
    }
    updateReactionTradePrice(original.symbol,1000-side*50,start+6000);
    assert.equal(active(),undefined);
    const record=getWeeklyReactionResults(start+6000).strategies[0].records.find(t=>t.id===original.id)!;
    assert.equal(record.points,[-30,40,60,90][level]);
    assert.equal(record.reason,level?'break_even':'stop_loss');
    assert.equal(record.outcome,level?'win':'loss');
    assert.equal(record.exitPrice,level?1000:original.stop);
  }
  const group=getWeeklyReactionResults(start+6000).strategies[0];
  assert.equal(group.trades,8);assert.equal(group.wins,6);assert.equal(group.losses,2);assert.equal(group.points,320);
  console.log('PASS progressive TP1/TP2/TP3, buy/sell, retracement, repeated ticks, checkpoints, BE gaps, original SL and aggregate results');
} finally {unlinkSync(file);rmdirSync(dir);}
