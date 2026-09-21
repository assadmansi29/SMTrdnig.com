import assert from 'node:assert/strict';
import {evaluateReactionZoneSignals as evaluate,resetReactionZoneSignalState,classifyReactionZone,reactionPointUnit,reactionPriceTick,type CandleData} from '../src/components/chart/reactionZoneSignalCalculator';
export function context(start:number,seconds:number,level:number,side:number,unit:number):CandleData[] {
  // A confirmed swing top/bottom with a directional rejection wick.
  return Array.from({length:7},(_,i)=>{
    const near=i===2?0:3;
    const prices=[level+side*(near+2)*unit,level+side*near*unit,level+side*(near+4)*unit,level+side*(near+3)*unit];
    return {time:start-(7-i)*seconds,open:prices[0],high:Math.max(...prices),low:Math.min(...prices),close:prices[3]};
  });
}
let passed=0;
for(const interval of ['1','5'])for(const side of [-1,1])for(const [symbol,level] of [['OANDA:XAUUSD',2345.2],['OANDA:EURUSD',1.1],['OANDA:USDJPY',150],['BINANCE:BTCUSDT',60000]] as const) {
  const seconds=Number(interval)*60,start=1800000000,unit=reactionPointUnit(symbol).size;
  for(const mode of ['valid','near-miss','test-break','confirmation-break','no-wick-close','late','missing','wrong-context','forming']) {
    resetReactionZoneSignalState();
    const bars=context(start,seconds,level,mode==='wrong-context'?-side:side,unit);
    assert.equal(classifyReactionZone(level,bars,symbol),(mode==='wrong-context'?-side:side)>0?'bullish':'bearish');
    const price=(n:number)=>Number((level+side*n*unit).toFixed(reactionPointUnit(symbol).decimals));
    let result:ReturnType<typeof evaluate>;
    for(let t=0;t<=seconds*2;t+=10) {
      if(mode==='missing'&&t>=seconds&&t<seconds*2)continue;
      let p=t===0?price(mode==='near-miss'?1:0):t<seconds?price(3):price(6);
      if(mode==='test-break'&&t===10||mode==='confirmation-break'&&t===seconds+10)p=price(-1);
      if(mode==='no-wick-close'&&t>=seconds)p=price(2);
      if(mode==='forming'&&t===seconds*2)break;
      const time=start+Math.floor(t/seconds)*seconds;
      if(Number(bars.at(-1)!.time)!==time)bars.push({time,open:p,high:p,low:p,close:p});
      else {const c=bars.at(-1)!;c.close=p;c.high=Math.max(c.high,p);c.low=Math.min(c.low,p);}
      result=evaluate(level,bars,'strong','test',interval,symbol,(start+t+(mode==='late'&&t===seconds*2?20:0))*1000);
      if(t<seconds*2)assert.ok(!result.activeSignal?.entryPrice,'no intrabar entry');
    }
    const entry=result!.signals.find(s=>s.entryPrice);
    if(mode==='valid') {
      assert.ok(entry,`${symbol} ${interval} ${side}`);
      assert.equal(entry.direction,side>0?'bullish':'bearish');
      assert.equal(entry.slPrice,Number((level-side*reactionPriceTick(symbol)).toFixed(reactionPointUnit(symbol).decimals)));
      const repeat=evaluate(level,bars,'strong','test',interval,symbol,(start+seconds*2)*1000+1);
      assert.equal(repeat.signals.filter(s=>s.entryPrice).length,1,'one entry per Test Candle');
    }else assert.ok(!entry,mode);
    passed++;
  }
}
resetReactionZoneSignalState();
const bars=context(1800000000,900,100,-1,1);bars.push({time:1800000000,open:100,high:100,low:100,close:100});
assert.equal(evaluate(100,bars,'strong','unsupported','15','BTCUSDT',1800000000000).signals.length,0);
console.log(`${passed} Test Candle cases passed plus unsupported timeframe guard`);
