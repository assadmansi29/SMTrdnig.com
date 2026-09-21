import assert from 'node:assert/strict';
import {evaluateReactionZoneSignals as evaluate,resetReactionZoneSignalState,suspendReactionZoneSignals,isWithinReactionEntryDistance,reactionPointUnit,calculateStopLossForReactionZone,type CandleData} from '../src/components/chart/reactionZoneSignalCalculator';
const start=1_800_000_000;
const bar=(time:number,open:number,high=open,low=open,close=open):CandleData=>({time,open,high,low,close});
let count=0;
function check(name:string,fn:()=>void){resetReactionZoneSignalState();fn();console.log('PASS '+name);count++;}
function fixture(side:number,symbol='OANDA:XAUUSD',level=2345.2,zone:'strong'|'weak'='strong',id='zone') {
 const unit=reactionPointUnit(symbol).size;
 const bars=Array.from({length:20},(_,i)=>bar(start-(20-i)*300,level+side*20*unit));
 bars.push(bar(start,level));let seconds=-1;
 const run=(now=(start+Math.max(0,seconds))*1000,live=true,interval='5')=>evaluate(level,bars,zone,id,interval,symbol,now,live,true);
 const raw=(t:number,points:number)=>{seconds=t;const time=start+Math.floor(t/300)*300,price=level+points*unit;let last=bars.at(-1)!;if(time>Number(last.time)){last=bar(time,price);bars.push(last);}else{last.close=price;last.high=Math.max(last.high,price);last.low=Math.min(last.low,price);}return run();};
 const tick=(t:number,points:number)=>{while(seconds>=0&&t-seconds>10)raw(seconds+10,(bars.at(-1)!.close-level)/unit);return raw(t,points);};
 const setup=()=>{tick(0,0);tick(1,side);tick(2,side*3);return tick(3,0);};
 return {bars,run,tick,raw,setup,unit,level,symbol,id};
}
const entries=(r:ReturnType<typeof evaluate>)=>r.signals.filter(s=>s.entryPrice!==undefined);
for(const [symbol,level] of [['OANDA:XAUUSD',2345.2],['OANDA:EURUSD',1.1],['OANDA:USDJPY',150],['OANDA:WTICOUSD',70],['OANDA:NAS100USD',20000],['OANDA:US30USD',40000],['BINANCE:BTCUSDT',60000]] as const)for(const side of [-1,1]) {
 check(`${symbol} ${side}: small reaction, separate retest, 60s validation, one entry`,()=>{
  const f=fixture(side,symbol,level);assert.equal(f.setup().activeSignal?.type,'test2');assert.equal(entries(f.tick(62,side*2)).length,0);
  const r=f.tick(63,side*2);assert.equal(r.activeSignal?.direction,side>0?'bullish':'bearish');assert.equal(r.activeSignal?.validation,'test2-60s');assert.equal(r.activeSignal?.entryAt,(start+63)*1000);
  assert.ok(Math.abs(Math.abs(r.activeSignal!.entryPrice!-r.activeSignal!.slPrice!)/f.unit-30)<1e-6);assert.equal(entries(f.tick(80,side*3)).length,1);
 });
 check(`${symbol} ${side}: ten-point boundary and existing SL units`,()=>{
  const u=reactionPointUnit(symbol).size;assert.ok(isWithinReactionEntryDistance(level+side*10*u,level,symbol));assert.ok(!isWithinReactionEntryDistance(level+side*10.01*u,level,symbol));
  for(const [input,expected] of [[20,30],[25,30],[30,30],[35,35],[40,35]])assert.equal(calculateStopLossForReactionZone(level,side>0?'buy':'sell',input,symbol).slPoints,expected);
  const f=fixture(side,symbol,level);f.setup();assert.ok(f.tick(63,side*10).activeSignal?.entryPrice);
 });
}
for(const side of [-1,1]) {
 check(`${side}: Test 1 alone never enters and continuous contact never counts twice`,()=>{const f=fixture(side);f.tick(0,0);f.tick(120,0);assert.equal(f.run().signals.length,0);f.tick(121,side);f.tick(240,side*2);assert.equal(f.run().activeSignal?.type,'test');assert.equal(entries(f.run()).length,0);});
 check(`${side}: near miss of four points is accepted after actual return`,()=>{const f=fixture(side);f.tick(0,0);f.tick(1,side);f.tick(2,side*5);assert.equal(f.tick(3,side*4).activeSignal?.type,'test2');assert.ok(f.tick(63,side*5).activeSignal?.entryPrice);});
 check(`${side}: greater than four points is not a retest`,()=>{const f=fixture(side);f.tick(0,0);f.tick(1,side);f.tick(2,side*6);assert.equal(f.tick(3,side*4.1).activeSignal?.type,'test');assert.equal(entries(f.tick(80,side*5)).length,0);});
 check(`${side}: ten-point excursion expires confirmation even on return`,()=>{const f=fixture(side);f.setup();f.tick(30,side*10.01);assert.equal(entries(f.tick(70,side*5)).length,0);assert.equal(entries(f.tick(80,side*3)).length,0);});
 check(`${side}: timer alone and wrong-side price never confirm`,()=>{const f=fixture(side);f.setup();assert.equal(entries(f.tick(70,0)).length,0);f.tick(71,-side);assert.equal(entries(f.tick(140,side*2)).length,0);});
 check(`${side}: closed break + next opening, role reversal, two breaker tests`,()=>{
  const f=fixture(-side);f.tick(0,0);f.tick(1,-side);f.tick(290,side*8);assert.equal(f.run().signals.filter(s=>s.type==='break').length,0);
  assert.equal(f.tick(300,side*8).activeSignal?.type,'break');f.tick(301,0);assert.equal(f.tick(302,side).activeSignal?.type,'retest');f.tick(303,side*3);assert.equal(f.tick(304,0).activeSignal?.type,'test2');
  assert.equal(entries(f.tick(590,side*2)).length,0);const r=f.tick(600,side*2);assert.equal(r.activeSignal?.type,side>0?'buy_breakout':'sell_breakdown');assert.equal(r.assessment?.breaks,1);
 });
 check(`${side}: wrong next opening cannot confirm a breakout`,()=>{const f=fixture(-side);f.tick(0,0);f.tick(1,-side);f.tick(290,side*8);const r=f.tick(300,-side*2);assert.equal(r.assessment?.breaks,0);assert.ok(!r.signals.some(s=>s.type==='break'));});
 check(`${side}: broken role survives deactivation and rejects old opposite entry`,()=>{
  const f=fixture(-side);f.tick(0,0);f.tick(1,-side);f.tick(290,side*8);f.tick(300,side*8);const before=f.run().assessment!;
  suspendReactionZoneSignals(f.id,f.bars);f.tick(301,0);f.tick(302,-side*2);const r=f.tick(360,-side*3);assert.equal(entries(r).length,0);assert.equal(r.assessment?.breaks,before.breaks);
 });
}
check('history and non-5M never create events; timestamp required',()=>{const f=fixture(1);assert.equal(f.run(start*1000,false).signals.length,0);assert.equal(f.run(start*1000,true,'15').signals.length,0);assert.equal(f.run(NaN).signals.length,0);});
check('outage never completes stale validation',()=>{const f=fixture(1);f.setup();assert.equal(entries(f.raw(70,2)).length,0);assert.equal(entries(f.tick(140,2)).length,0);});
check('duplicate and old observations do not advance state',()=>{const f=fixture(1);f.setup();const r=f.tick(10,2);assert.deepEqual(f.run((start+9)*1000),r);assert.deepEqual(f.run((start+10)*1000),r);});
check('only live price contacts count, never an old wick',()=>{const f=fixture(1);f.bars.at(-1)!.low=f.level;f.raw(0,12);assert.equal(f.run().signals.length,0);});
check('freshness, touches and strong/weak evidence are independent and survive suspension',()=>{
 const red=fixture(1,'OANDA:XAUUSD',2345.2,'strong','red'),green=fixture(1,'OANDA:XAUUSD',2345.2,'weak','green');
 red.tick(0,0);green.tick(0,0);const r=red.tick(1,1),g=green.tick(1,1);assert.equal(r.assessment?.confluence,'3–4+ intersections');assert.equal(g.assessment?.confluence,'two-line X');assert.ok(r.assessment!.holdStrength>g.assessment!.holdStrength);assert.equal(r.assessment?.fresh,true);
 red.tick(2,3);const retest=red.tick(3,0);assert.equal(retest.assessment?.touches,2);suspendReactionZoneSignals('red',red.bars);assert.equal(red.tick(4,0).assessment?.touches,3);assert.equal(green.tick(4,2).assessment?.touches,1);
});
check('real candle pressure changes assessment and requires observable small rejection',()=>{
 const f=fixture(1);for(let i=0;i<3;i++){const c=f.bars[f.bars.length-4+i];c.open=f.level+(12-i*3)*f.unit;c.close=c.open-3*f.unit;c.high=c.open;c.low=c.close;}
 f.tick(0,0);const r=f.tick(1,1);assert.equal(r.assessment?.approachPressure,'strong');assert.equal(r.assessment?.breakoutRisk,'elevated');assert.equal(r.signals.length,0);assert.equal(f.tick(2,2).activeSignal?.type,'test');
});
check('new OHLC excursion cancels a pending entry even when the latest close returned',()=>{
 const f=fixture(1);f.setup();f.tick(10,2);f.bars.at(-1)!.high=f.level+11*f.unit;assert.equal(entries(f.tick(20,2)).length,0);assert.equal(entries(f.tick(90,2)).length,0);
});
check('old wick from before contact cannot cancel a new valid setup',()=>{
 const f=fixture(1);f.bars.at(-1)!.high=f.level+30*f.unit;f.setup();assert.ok(f.tick(63,2).activeSignal?.entryPrice);
});
check('ten-point cap also applies to breaker confirmations',()=>{
 const f=fixture(-1);f.tick(0,0);f.tick(1,-1);f.tick(290,8);f.tick(300,8);f.tick(301,0);f.tick(302,1);f.tick(303,3);f.tick(304,0);f.tick(590,2);assert.equal(entries(f.tick(600,10.1)).length,0);assert.equal(entries(f.tick(610,2)).length,0);
});
check('inactive levels retain observed touches without publishing historical signals',()=>{
 const f=fixture(1);f.run(start*1000,false);f.bars.at(-1)!.close=f.level+2*f.unit;f.bars.at(-1)!.high=f.level+2*f.unit;
 f.bars.push(bar(start+300,f.level+2*f.unit));suspendReactionZoneSignals(f.id,f.bars,(start+300)*1000);
 const r=f.run((start+300)*1000,false);assert.equal(r.assessment?.touches,1);assert.equal(r.signals.length,0);
});
console.log(`${count} deterministic Reaction Zone cases passed`);
