import assert from 'node:assert/strict';
import {ReactionAuthority,reactionKey} from '../server/services/reactionAuthority';
import {resetReactionZoneSignalState,type CandleData} from '../src/components/chart/reactionZoneSignalCalculator';
import {getReactionTrades,clearReactionTrade} from '../server/services/reactionTradeEngine';
import {receiveReactionSnapshot,getReactionTrades as clientTrades} from '../src/components/chart/reactionZoneTrades';
import {serverNow,observeServerTime,synchronizeServerClock} from '../src/services/serverClock';

const realNow=Date.now;
const start=Math.floor((realNow()-1_200_000)/300000)*300;
for(const interval of ['1','5'])for(const side of [-1,1]) {
  resetReactionZoneSignalState();getReactionTrades().forEach(t=>clearReactionTrade(t.id));
  const seconds=Number(interval)*60;
  let now=start*1000;
  const server=new ReactionAuthority(()=>now),symbol='OANDA:XAUUSD',strategy='fib',id='zone'+side+interval;
  const key=reactionKey(symbol,strategy,id,interval),level=2345.2;
  const history:CandleData[]=Array.from({length:7},(_,i)=>{
    const n=i===2?0:3,prices=[level+side*(n+2)*.1,level+side*n*.1,level+side*(n+4)*.1,level+side*(n+3)*.1];
    return {time:start-(7-i)*seconds,open:prices[0],high:Math.max(...prices),low:Math.min(...prices),close:prices[3]};
  });
  history.push({time:start,open:level,high:level,low:level,close:level});
  server.setZones([{id,symbol,strategy,price:level,zoneType:'strong'},{id:'far',symbol,strategy,price:level+100,zoneType:'weak'}]);
  server.seed(symbol,history,interval);
  const clients:string[][]=[[],[]];
  const unsub=clients.map(client=>server.subscribe(state=>client.push(JSON.stringify(state))));
  function tick(t:number,price:number) {
    now=(start+t)*1000;
    const time=start+Math.floor(t/seconds)*seconds;
    let bar=history.at(-1)!;
    if(Number(bar.time)<time){bar={time,open:price,high:price,low:price,close:price};history.push(bar);}
    else{bar.close=price;bar.high=Math.max(bar.high,price);bar.low=Math.min(bar.low,price);}
    server.observe(symbol,bar,now,interval);
  }
  tick(0,level);
  assert.equal(server.snapshot().evaluations[key]?.activeSignal?.type,'test');
  for(let t=10;t<seconds*2;t+=10){tick(t,level+side*(t<seconds?.3:.6));assert.equal(getReactionTrades().length,0);}
  tick(seconds*2,level+side*.6);
  const trade=getReactionTrades()[0];assert.ok(trade);assert.equal(trade.openedAt,now);
  assert.equal(trade.stop,Number((level-side*.01).toFixed(2)),'actual trade honors Test Candle wick stop');
  assert.ok(!server.snapshot().evaluations[reactionKey(symbol,strategy,'far',interval)]);
  assert.equal(server.snapshot().events.filter(e=>e.signal.entryPrice).length,1);
  assert.deepEqual(clients[0],clients[1],'identical shared events');
  const snapshot=JSON.parse(JSON.stringify(server.snapshot()));
  Date.now=()=>realNow()+240000;receiveReactionSnapshot(snapshot);assert.equal(clientTrades()[0].openedAt,trade.openedAt);
  Date.now=()=>realNow()-240000;receiveReactionSnapshot(snapshot);assert.equal(clientTrades()[0].openedAt,trade.openedAt);
  receiveReactionSnapshot({...snapshot,sequence:snapshot.sequence-1,trades:[]});assert.equal(clientTrades().length,1);
  Date.now=realNow;
  server.observe(symbol,history.at(-1)!,now-1000,interval);assert.equal(server.snapshot().sequence,snapshot.sequence);
  server.observe(symbol,history.at(-1)!,now,interval);assert.equal(server.snapshot().sequence,snapshot.sequence);
  tick(seconds*2+1,trade.tp1);assert.equal(getReactionTrades()[0].stop,trade.entry);assert.ok(getReactionTrades()[0].tp1Hit);
  server.clear(trade.id);assert.equal(server.snapshot().trades.length,0);
  unsub.forEach(fn=>fn());
  console.log(`PASS ${interval}m ${side}: Test Candle -> server entry -> identical clients -> wick SL -> TP1`);
}
observeServerTime(realNow());
const before=serverNow();Date.now=()=>realNow()+86400000;assert.ok(Math.abs(serverNow()-before)<1000,'device wall clock never advances server time');Date.now=realNow;
const realFetch=globalThis.fetch;
globalThis.fetch=async()=>new Response(JSON.stringify({serverTime:realNow()}));
await synchronizeServerClock();assert.ok(Math.abs(serverNow()-realNow())<1000);
globalThis.fetch=realFetch;
console.log('PASS authoritative clock uses server UTC plus monotonic elapsed time');
