import assert from 'node:assert/strict';
import {evaluateReactionZoneSignals as evaluate, resetReactionZoneSignalState, isWithinReactionEntryDistance, reactionPointUnit, calculateStopLossForReactionZone, type CandleData} from '../src/components/chart/reactionZoneSignalCalculator';
const start=1_800_000_000;
const bar=(time:number,open:number,high=open,low=open,close=open):CandleData=>({time,open,high,low,close});
let count=0;
function check(name:string,fn:()=>void){resetReactionZoneSignalState();fn();console.log('PASS '+name);count++;}
function fixture(side:number,symbol='OANDA:XAUUSD',level=2345.2,zone:'strong'|'weak'='strong'){
 const unit=reactionPointUnit(symbol).size;
 const bars=Array.from({length:20},(_,i)=>bar(start-(20-i)*300,level+side*2*unit,level+3*unit,level-3*unit,level+side*2*unit));
 bars.push(bar(start,level));let now=start*1000;
 const run=(active=true,live=true,interval='5')=>evaluate(level,bars,zone,'zone',interval,symbol,now,live,active);
 const tick=(seconds:number,points:number,active=true)=>{now=(start+seconds)*1000;const time=Math.floor(now/300000)*300;const price=level+points*unit;let last=bars.at(-1)!;if(time>Number(last.time)){last=bar(time,price);bars.push(last);}else{last.close=price;last.high=Math.max(last.high,price);last.low=Math.min(last.low,price);}return run(active);};
 return {bars,run,tick,unit,level,symbol,setNow:(ms:number)=>{now=ms;}};
}
for(const [symbol,level] of [['OANDA:XAUUSD',2345.2],['OANDA:EURUSD',1.1],['OANDA:USDJPY',150],['OANDA:WTICOUSD',70],['OANDA:NAS100USD',20000],['OANDA:US30USD',40000],['BINANCE:BTCUSDT',60000]] as const)for(const side of [-1,1]){
 check(`${symbol} ${side}: Test 1 -> new candle -> 60s entry at 20 points outside proximity`,()=>{
  const f=fixture(side,symbol,level);assert.equal(f.run().activeSignal,null);assert.equal(f.tick(1,side).activeSignal?.type,'test');
  assert.ok(!f.tick(300,side*12,false).activeSignal?.entryPrice);
  for(let t=310;t<360;t+=10)assert.ok(!f.tick(t,side*20,false).activeSignal?.entryPrice);
  const result=f.tick(360,side*20,false);assert.equal(result.activeSignal?.direction,side>0?'bullish':'bearish');assert.equal(result.activeSignal?.validation,'next-candle-60s');
  assert.ok(Math.abs(Math.abs(result.activeSignal!.entryPrice!-result.activeSignal!.slPrice!)/f.unit-25)<1e-6);
  assert.equal(result.signals.filter(s=>s.entryPrice).length,1);assert.equal(f.tick(370,side*20,false).signals.filter(s=>s.entryPrice).length,1);
 });
 check(`${symbol} ${side}: 25-point boundary and symbol-aware 25–35 point SL`,()=>{
  const u=reactionPointUnit(symbol).size;assert.ok(isWithinReactionEntryDistance(level+side*25*u,level,symbol));assert.ok(!isWithinReactionEntryDistance(level+side*25.01*u,level,symbol));
  for(const [input,expected] of [[20,25],[30,30],[40,35]]){const sl=calculateStopLossForReactionZone(level,side>0?'buy':'sell',input,symbol);assert.equal(sl.slPoints,expected);assert.ok(Math.abs(sl.slDistance/u-expected)<1e-6);}
 });
}
for(const side of [-1,1])for(const zone of ['strong','weak'] as const)check(`${zone} ${side}: Test 2 stays, direction uses approach not color`,()=>{
 const f=fixture(side,'OANDA:XAUUSD',2345.2,zone);f.run();f.tick(1,side);f.tick(300,side);assert.equal(f.tick(305,0).activeSignal?.type,'test2');for(let t=310;t<360;t+=10)assert.equal(f.tick(t,side*3).activeSignal?.type,'test2');assert.equal(f.tick(360,side*3).activeSignal?.direction,side>0?'bullish':'bearish');
});
check('continuous contact and old wick do not fabricate a second touch',()=>{
 const f=fixture(-1);f.run();assert.equal(f.tick(300,0).signals.length,0);f.tick(301,-1);assert.equal(f.tick(302,-2).signals.length,1);assert.equal(f.tick(303,0).activeSignal?.type,'test2');
});
for(const opening of [0,-1])check(`wrong/level opening (${opening}) cannot enter despite later rejection`,()=>{
 const f=fixture(1);f.run();f.tick(1,1);f.tick(300,opening);for(let t=310;t<=420;t+=10)assert.ok(!f.tick(t,10).activeSignal?.entryPrice);
});
check('no entry from touched candle, history, or non-5-minute views',()=>{
 const f=fixture(1);assert.equal(f.run(true,false).signals.length,0);f.run();f.tick(1,1);for(let t=10;t<=120;t+=10)assert.ok(!f.tick(t,5).activeSignal?.entryPrice);resetReactionZoneSignalState();assert.equal(f.run(true,true,'15').signals.length,0);
});
check('distant never-tested zone cannot start setup',()=>{const f=fixture(1);assert.equal(f.run(false).signals.length,0);for(let t=10;t<=420;t+=10)assert.equal(f.tick(t,20,false).signals.length,0);});
check('missing adjacent candle cannot start validation',()=>{const f=fixture(1);f.run();f.tick(1,1);f.tick(600,10);for(let t=610;t<=720;t+=10)assert.ok(!f.tick(t,10).activeSignal?.entryPrice);});
check('feed outage requires a fresh observed minute',()=>{const f=fixture(1);f.run();f.tick(1,1);f.tick(300,10);assert.ok(!f.tick(360,10).activeSignal?.entryPrice);for(let t=370;t<420;t+=10)assert.ok(!f.tick(t,10).activeSignal?.entryPrice);assert.ok(f.tick(420,10).activeSignal?.entryPrice);});
check('25-point excursion cancels late entry even on return',()=>{const f=fixture(1);f.run();f.tick(1,1);f.tick(300,10);f.tick(310,26);for(let t=320;t<=420;t+=10)assert.ok(!f.tick(t,10).activeSignal?.entryPrice);});
check('genuine intrabar violation cancels rejection observation',()=>{const f=fixture(1);f.run();f.tick(1,1);f.tick(300,10);f.tick(310,-10);for(let t=320;t<=420;t+=10)assert.ok(!f.tick(t,10).activeSignal?.entryPrice);});
for(const side of [-1,1])check(`${side}: confirmed BREAK -> RETEST/Test 1 -> separate Test 2 -> closed confirmation`,()=>{
 const f=fixture(-side);f.run();f.tick(1,-side);f.tick(290,side*10);assert.notEqual(f.run().activeSignal?.type,'break');assert.equal(f.tick(300,side*10).state,'BREAK');assert.equal(f.tick(305,0).state,'RETEST');f.tick(310,side*2);
 assert.equal(f.tick(600,side*2).state,'RETEST','single retest cannot enter');assert.equal(f.tick(610,0).activeSignal?.type,'test2');f.tick(620,side*3);
 assert.ok(!f.tick(680,side*3).activeSignal?.entryPrice,'forming Test 2 cannot confirm breakout');const result=f.tick(900,side*3);assert.equal(result.activeSignal?.type,side>0?'buy_breakout':'sell_breakdown');assert.deepEqual(result.signals.filter(s=>s.type!=='test').map(s=>s.type),['break','retest','test2',side>0?'buy_breakout':'sell_breakdown']);
});
check('failed breakout cannot emit the original rejection trade',()=>{const f=fixture(-1);f.run();f.tick(1,-1);f.tick(290,10);f.tick(300,10);f.tick(305,0);f.tick(310,2);f.tick(600,2);f.tick(610,0);f.tick(620,-1);assert.ok(!f.tick(900,-1).signals.some(s=>s.entryPrice));});
check('live approach controls breakout even if preceding historical close was on the other side',()=>{
 const f=fixture(-1);f.bars[f.bars.length-2].close=f.level+1;f.bars[f.bars.length-1]=bar(start,f.level-1);f.run();f.tick(5,0);f.tick(10,-1);f.tick(290,10);assert.equal(f.tick(300,10).state,'BREAK');
});
check('excessive rejection before next candle cancels old setup',()=>{const f=fixture(1);f.run();f.tick(1,1);f.tick(30,26);f.tick(290,20);f.tick(300,20);for(let t=310;t<=420;t+=10)assert.ok(!f.tick(t,20).activeSignal?.entryPrice);});
check('failed retest never revives the original opposite rejection timer',()=>{
 const f=fixture(-1);f.run();f.tick(1,-1);f.tick(290,10);f.tick(300,10);f.tick(305,0);f.tick(310,2);f.tick(600,2);f.tick(610,0);f.tick(620,-1);f.tick(900,-1);f.tick(910,-2);f.tick(1200,-2);for(let t=1210;t<=1320;t+=10)assert.ok(!f.tick(t,-2).activeSignal?.entryPrice);
});
console.log(`${count} reaction timing / breakout / point-unit regression cases passed`);
