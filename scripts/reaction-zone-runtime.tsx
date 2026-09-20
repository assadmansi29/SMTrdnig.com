/** Full TradingViewWidget integration fixture. Real data is fetched read-only;
 * all subsequent API calls and storage writes are isolated to this page.
 * ?mode=actual replays real BTC OHLC against unchanged saved drawings.
 * ?mode=sell|buy|break-buy|break-sell runs controlled boundary cases.
 */
import React from 'react';
import { createRoot } from 'react-dom/client';
import '../src/index.css';
import {calculateAverageCandleRange, computeZoneTolerances} from '../src/components/chart/reactionZoneSignalCalculator';
const mode = new URLSearchParams(location.search).get('mode') || 'actual';
const realFetch = window.fetch.bind(window);
const [market, saved] = await Promise.all([
  realFetch('/api/market/candles?symbol=BINANCE%3ABTCUSDT&interval=5').then(r => r.json()),
  realFetch('/api/chart-drawings?symbol=BINANCE%3ABTCUSDT&interval=5&strategy=default').then(r => r.json()),
]);
if (market.status !== 'ok' || saved.status !== 'ok') throw new Error('Real chart data unavailable');
const allBars = market.candles;
const drawings = saved.drawings;
const zones = drawings.filter((d:any) => d.options?.zoneType || d.type?.startsWith('reaction-zone'));
const last = allBars[allBars.length-1];
const target = [...zones].sort((a:any,b:any) => Math.abs(a.anchors[0].price-last.close)-Math.abs(b.anchors[0].price-last.close))[0];
if (!target) throw new Error('No saved Reaction Zone to test');
const level = target.anchors[0].price;
const side = mode.endsWith('buy') ? 1 : -1;
const breaking = mode.startsWith('break-');
const epsilon = .01;
const distance = computeZoneTolerances(level,calculateAverageCandleRange(allBars.slice(-21,-1))).touchTolerance * 2;
const start = last.time + 300;
const point = (time:number,price:number) => ({time,open:price,high:price,low:price,close:price});
const history = mode === 'actual' ? allBars.slice(0,-180) : [...allBars.slice(-80), point(start,level + (breaking ? -side * distance : 0))];
if (mode !== 'actual') history[history.length-2] = point(start-300,level + (breaking ? -side * distance : side * epsilon));
const replay = mode === 'actual' ? allBars.slice(-180) : [];
const memory = new Map<string,string>();
memory.set('reaction_zones_legend_collapsed','true');
Storage.prototype.getItem = function(key) { return memory.get(key) ?? null; };
Storage.prototype.setItem = function(key,value) { memory.set(key,String(value)); };
Storage.prototype.removeItem = function(key) { memory.delete(key); };
window.fetch = async (input,init) => {
  if (init?.method && init.method !== 'GET') throw new Error('Fixture blocks API writes');
  const url = String(input);
  return new Response(JSON.stringify(url.includes('/api/market/candles') ? {status:'ok',candles:history}
    : url.includes('/api/chart-drawings') ? {status:'ok',drawings} : {status:'ok',user:null}),{headers:{'Content-Type':'application/json'}});
};
const sockets = new Set<FixtureSocket>();
class FixtureSocket {
  static OPEN=1; readyState=1;
  onopen:(()=>void)|null=null; onmessage:((e:{data:string})=>void)|null=null; onerror=null; onclose=null;
  constructor(_url:string) { sockets.add(this); setTimeout(()=>this.onopen?.(),0); }
  send() {} close() { sockets.delete(this); }
}
window.WebSocket = FixtureSocket as any;
const {TradingViewWidget} = await import('../src/components/TradingViewWidget');
const {ReactionZoneDrawing} = await import('../src/components/chart/reactionZoneManager');
const {AuthProvider} = await import('../src/context/AuthContext');
const {LanguageProvider} = await import('../src/context/LanguageContext');
const seen = new Set<string>();
const events:string[]=[];
const violations:string[]=[];
const evaluations = new Map<string,any>();
const originalUpdate = ReactionZoneDrawing.prototype.updateSignals;
ReactionZoneDrawing.prototype.updateSignals = function() {
  originalUpdate.call(this);
  evaluations.set(this.id,this.signalEvaluation);
  const signal=this.signalEvaluation?.activeSignal;
  if (!signal || seen.has(signal.id)) return;
  seen.add(signal.id);
  events.push(`${this.id}: ${signal.type} @ ${signal.time}`);
  if (signal.direction !== 'neutral') {
    const bars=this.marketContext.candles;
    const index=bars.findIndex(b=>Number(b.time)===signal.time);
    const next=bars[index+1];
    const valid=next && Number(next.time)===signal.time+300 && (signal.direction==='bullish'
      ? signal.candle.close>signal.linePrice && next.open>signal.linePrice
      : signal.candle.close<signal.linePrice && next.open<signal.linePrice);
    if (!valid) violations.push(`Invalid close/open confirmation: ${signal.id}`);
  }
};
let painted = new Set<string>();
const fillText=CanvasRenderingContext2D.prototype.fillText;
CanvasRenderingContext2D.prototype.fillText=function(text,x,y,maxWidth?) {
  if (/TEST|BUY|SELL|BREAK|RETEST/.test(text)) painted.add(text);
  if(maxWidth===undefined) fillText.call(this,text,x,y); else fillText.call(this,text,x,y,maxWidth);
};
const normalSteps = [
  {label:'Continuous contact awaits a reaction',offset:300,price:level,expected:''},
  {label:'Tiny reaction, no return yet',offset:310,price:level+side*epsilon,expected:'TEST 1'},
  {label:'Further departure, old wick is not TEST 2',offset:320,price:level+side*epsilon*2,expected:'TEST 1'},
  {label:'Separate return becomes TEST 2',offset:330,price:level,expected:'TEST 2'},
  {label:'Forming close cannot confirm',offset:340,price:level+side*epsilon,expected:'TEST 2'},
  {label:'Opposite next open cannot confirm',offset:600,price:level-side*epsilon,expected:'TEST 2'},
  {label:'Next live close cannot replace its open',offset:610,price:level+side*epsilon,expected:'TEST 2'},
  {label:'Matching closed candle and next open confirm',offset:900,price:level+side*epsilon,expected:side===1?'BUY':'SELL'},
  {label:'Distant zone signals hidden',offset:910,price:level+side*distance*12,expected:''},
];
const breakSteps = [
  {label:'Forming cross is not confirmed',offset:0,price:level+side*distance,expected:'TEST 1'},
  {label:'Closed crossing becomes BREAK',offset:300,price:level+side*distance,expected:'BREAK'},
  {label:'Later touch becomes RETEST without new tests',offset:310,price:level,expected:'RETEST'},
  {label:'Retest forming cannot confirm',offset:320,price:level+side*epsilon,expected:'RETEST'},
  {label:'Retest close plus next open confirms breakout',offset:600,price:level+side*epsilon,expected:side===1?'BUY BREAK':'SELL BREAK'},
];
const steps=breaking?breakSteps:normalSteps;
function send(payload:any) {
  sockets.forEach(s=>s.onmessage?.({data:JSON.stringify({...payload,symbol:'BINANCE:BTCUSDT',interval:'5'})}));
  if ([...evaluations.values()].filter(e=>e?.activeSignal).length>1) violations.push('Multiple active zones');
}
let replayIndex=0;
function Fixture() {
  const [step,setStep]=React.useState(0);
  const [results,setResults]=React.useState<string[]>([]);
  const [busy,setBusy]=React.useState(false);
  const run=()=>{
    setBusy(true); painted=new Set();
    if (mode==='actual') {
      const before=events.length;
      do {
        const bar=replay[replayIndex++];
        if(!bar) break;
        history.push({...bar});
        send({type:'bar',bar});
      } while(replayIndex<replay.length && events.length===before);
    } else {
      const next=steps[step];
      const time=start+Math.floor(next.offset/300)*300;
      const last=history[history.length-1];
      if(time>last.time) history.push(point(time,next.price));
      else {last.high=Math.max(last.high,next.price);last.low=Math.min(last.low,next.price);last.close=next.price;}
      send({type:'tick',price:next.price,time:start+next.offset});
    }
    requestAnimationFrame(()=>requestAnimationFrame(()=>{
      const labels=[...painted];
      const next=steps[step];
      const pass=mode==='actual' ? violations.length===0 : next.expected ? labels.some(l=>l.includes(next.expected)) : labels.length===0;
      const early=mode!=='actual' && !/confirm.*breakout|Matching closed/.test(next.label) && /TEST|RETEST/.test(next.expected) && labels.some(l=>/BUY|SELL/.test(l));
      setResults(old=>[...old,`${pass&&!early?'PASS':'FAIL'} ${mode==='actual'?`Real candles ${replayIndex}/${replay.length}`:next.label}: ${labels.join(', ')||'(no signal)'}`]);
      setStep(s=>s+1);setBusy(false);
    }));
  };
  return <AuthProvider><LanguageProvider>
    <div style={{padding:12}}><strong>Actual chart integration: {mode} / saved BTC zones / writes blocked</strong>
    <p>{allBars.length} real candles loaded; {zones.length} saved zones; target {level}</p>
    <button style={{padding:10,background:'#334155'}} onClick={run} disabled={busy || (mode==='actual'?replayIndex>=replay.length:step>=steps.length)}>{busy?'Checking canvas':mode==='actual'?'Next actual-data signal':steps[step]?.label||'Replay complete'}</button>
    <pre style={{fontSize:11,maxHeight:200,overflow:'auto'}}>{results.join('\n')}{'\n'}{violations.join('\n')}</pre>
    <details><summary>Runtime events ({events.length})</summary><pre>{events.join('\n')}</pre></details></div>
    <TradingViewWidget symbol="BINANCE:BTCUSDT" interval="5" height="470px" enableDrawingTools={false}/>
  </LanguageProvider></AuthProvider>;
}
createRoot(document.getElementById('root')!).render(<Fixture/>);
