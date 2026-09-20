import assert from 'node:assert/strict';
import {ReactionAuthority,reactionKey} from '../server/services/reactionAuthority';
import {resetReactionZoneSignalState,type CandleData} from '../src/components/chart/reactionZoneSignalCalculator';
import {getReactionTrades,clearReactionTrade} from '../server/services/reactionTradeEngine';
import {receiveReactionSnapshot,getReactionTrades as clientTrades} from '../src/components/chart/reactionZoneTrades';
import {serverNow,observeServerTime,synchronizeServerClock} from '../src/services/serverClock';

const realNow=Date.now;
const start=Math.floor((realNow()-1_200_000)/300000)*300;
for(const side of [-1,1]) {
  resetReactionZoneSignalState();getReactionTrades().forEach(t=>clearReactionTrade(t.id));
  let now=start*1000;
  const server=new ReactionAuthority(()=>now),symbol='OANDA:XAUUSD',strategy='fib',id='zone'+side;
  const key=reactionKey(symbol,strategy,id),level=2345.2;
  const history:CandleData[]=Array.from({length:20},(_,i)=>({time:start-(20-i)*300,open:level+side*.2,high:level+.3,low:level-.3,close:level+side*.2}));
  history.push({time:start,open:level,high:level,low:level,close:level});
  server.setZones([{id,symbol,strategy,price:level,zoneType:'strong'},{id:'far',symbol,strategy,price:level+100,zoneType:'weak'}]);
  server.seed(symbol,history);
  const clients:string[][]=[[],[]];
  const unsub=clients.map(client=>server.subscribe(state=>client.push(JSON.stringify(state))));
  function tick(seconds:number,price:number) {
    now=(start+seconds)*1000;
    const time=Math.floor(now/300000)*300;
    let bar=history.at(-1)!;
    if(Number(bar.time)<time){bar={time,open:price,high:price,low:price,close:price};history.push(bar);}
    else{bar.close=price;bar.high=Math.max(bar.high,price);bar.low=Math.min(bar.low,price);}
    server.observe(symbol,bar,now);
  }
  tick(0,level);tick(1,level+side*.1);
  assert.equal(server.snapshot().evaluations[key]?.activeSignal?.type,'test');
  tick(300,level+side*1.2);
  for(let t=310;t<360;t+=10){tick(t,level+side*2);assert.equal(getReactionTrades().length,0);}
  tick(360,level+side*2);
  const trade=getReactionTrades()[0];assert.ok(trade);assert.equal(trade.openedAt,now);
  assert.ok(!server.snapshot().evaluations[reactionKey(symbol,strategy,'far')]);
  const entryEvent=server.snapshot().events.find(e=>e.signal.entryPrice)!;
  assert.ok(entryEvent);assert.equal(entryEvent.createdAt,now);
  tick(361,level+side*2);
  assert.equal(server.snapshot().events.filter(e=>e.signal.entryPrice).length,1);
  assert.equal(server.snapshot().events.find(e=>e.id===entryEvent.id)?.createdAt,entryEvent.createdAt);
  assert.deepEqual(clients[0],clients[1],'both users receive identical serialized events');
  const snapshot=JSON.parse(JSON.stringify(server.snapshot()));
  Date.now=()=>realNow()+240000;receiveReactionSnapshot(snapshot);assert.equal(clientTrades()[0].openedAt,trade.openedAt);
  Date.now=()=>realNow()-240000;receiveReactionSnapshot(snapshot);assert.equal(clientTrades()[0].openedAt,trade.openedAt);
  receiveReactionSnapshot({...snapshot,sequence:snapshot.sequence-1,trades:[]});assert.equal(clientTrades().length,1,'ignore replay/out-of-order snapshot');
  Date.now=realNow;
  server.observe(symbol,history.at(-1)!,now-1000);assert.equal(server.snapshot().sequence,snapshot.sequence,'ignore stale observation');
  tick(370,trade.tp1);assert.equal(getReactionTrades()[0].stop,trade.entry);assert.ok(getReactionTrades()[0].tp1Hit);
  server.clear(trade.id);assert.equal(server.snapshot().trades.length,0);
  unsub.forEach(fn=>fn());
  console.log(`PASS ${side}: identical clients, stable event ID/time, clock skew, reconnect/replay, TP1 and shared clear`);
}
observeServerTime(realNow());
const before=serverNow();Date.now=()=>realNow()+86400000;assert.ok(Math.abs(serverNow()-before)<1000,'device wall clock never advances server time');Date.now=realNow;
const realFetch=globalThis.fetch;
globalThis.fetch=async()=>new Response(JSON.stringify({serverTime:realNow()}));
await synchronizeServerClock();assert.ok(Math.abs(serverNow()-realNow())<1000);
globalThis.fetch=realFetch;
console.log('PASS authoritative clock uses server UTC plus monotonic elapsed time');
