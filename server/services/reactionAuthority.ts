import {randomUUID} from 'node:crypto';
import {EventEmitter} from 'node:events';
import {
  evaluateReactionZoneSignals, reactionPointUnit, parseCandleTimestamp,
  hasPendingReactionZoneSetup, suspendReactionZoneSignals, resetReactionZoneSignalState,
  type CandleData, type LineEvaluationResult,
} from '../../src/components/chart/reactionZoneSignalCalculator';
import {openReactionTrade, updateReactionTradePrice, getReactionTrades, getWeeklyReactionResults, clearReactionTrade} from './reactionTradeEngine';

export interface PublishedReactionZone {
  id:string; symbol:string; strategy:string; price:number; zoneType:'strong'|'weak';
}
export const reactionKey=(symbol:string,strategy:string,id:string,interval='5')=>JSON.stringify(interval==='5'?[symbol,strategy,id]:[symbol,strategy,id,interval]);

/** One instance per market server, independent of browser/chart lifetimes. */
export class ReactionAuthority {
  readonly epoch=randomUUID();
  private sequence=0;
  private zones:PublishedReactionZone[]=[];
  private candles=new Map<string,CandleData[]>();
  private active=new Map<string,string>();
  private evaluations:Record<string,LineEvaluationResult|null>={};
  private events=new EventEmitter();
  private lastPublished='';
  private lastObservation=new Map<string,number>();
  private signalEvents=new Map<string,{id:string;createdAt:number;symbol:string;strategy:string;zoneId:string;signal:NonNullable<LineEvaluationResult['activeSignal']>}>();
  constructor(private now:()=>number=Date.now) {}

  setZones(zones:PublishedReactionZone[]) {
    const next=new Map(zones.map(z=>[reactionKey(z.symbol,z.strategy,z.id),z]));
    for(const old of this.zones) {
      const key=reactionKey(old.symbol,old.strategy,old.id), replacement=next.get(key);
      if(!replacement || replacement.price!==old.price) {
        for(const interval of ['1','5']) {const scoped=reactionKey(old.symbol,old.strategy,old.id,interval);resetReactionZoneSignalState(scoped);delete this.evaluations[scoped];}
      }
    }
    this.zones=zones;
    this.publish();
  }
  seed(symbol:string,candles:CandleData[],interval='5') {
    if(!['1','5'].includes(interval))return;
    const feed=JSON.stringify([symbol,interval]),seconds=Number(interval)*60;
    if(this.candles.has(feed)||candles.length<2)return;
    const ordered=[...new Map(candles.map(c=>[parseCandleTimestamp(c.time),{...c,time:parseCandleTimestamp(c.time)}])).values()]
      .filter(c=>c.time>0&&c.time%seconds===0&&c.time*1000<=this.now())
      .sort((a,b)=>Number(a.time)-Number(b.time));
    this.candles.set(feed,ordered.slice(-500));
    // Initialize from history without emitting historical trades.
    for(const z of this.zones.filter(z=>z.symbol===symbol))
      evaluateReactionZoneSignals(z.price,ordered,z.zoneType,reactionKey(z.symbol,z.strategy,z.id,interval),interval,symbol,this.now(),false,false);
  }
  observe(symbol:string,bar:CandleData,observedAt:number,interval='5') {
    if(!['1','5'].includes(interval))return;
    const feed=JSON.stringify([symbol,interval]),seconds=Number(interval)*60;
    const now=this.now(),time=parseCandleTimestamp(bar.time),last=this.lastObservation.get(feed);
    if(!Number.isFinite(observedAt)||observedAt>now+1000||now-observedAt>15000||(last!==undefined&&observedAt<=last)
      ||time%seconds!==0||observedAt<time*1000||observedAt>=(time+seconds)*1000
      ||![bar.open,bar.high,bar.low,bar.close].every(p=>Number.isFinite(p)&&p>0)
      ||bar.high<Math.max(bar.open,bar.close)||bar.low>Math.min(bar.open,bar.close))return;
    const candles=this.candles.get(feed);
    if(!candles?.length||time<parseCandleTimestamp(candles.at(-1)!.time))return;
    const previous=candles.at(-1)!;
    if(time===parseCandleTimestamp(previous.time)&&(bar.open!==previous.open||bar.high<previous.high||bar.low>previous.low))return;
    this.lastObservation.set(feed,observedAt);
    if(time===parseCandleTimestamp(candles.at(-1)!.time))candles[candles.length-1]={...bar,time};
    else candles.push({...bar,time});
    if(candles.length>500)candles.shift();
    updateReactionTradePrice(symbol,bar.close,observedAt);
    const zones=this.zones.filter(z=>z.symbol===symbol),unit=reactionPointUnit(symbol).size;
    const distance=(z:PublishedReactionZone)=>Math.abs(z.price-bar.close)/unit;
    const keyOf=(z:PublishedReactionZone)=>reactionKey(symbol,z.strategy,z.id,interval);
    // Keep the touched level through its following candle; a valid wick break
    // naturally moves away. The evaluator cancels any penetration or late close.
    const current=zones.find(z=>keyOf(z)===this.active.get(feed));
    const closest=[...zones].filter(z=>bar.low<=z.price&&bar.high>=z.price)
      .sort((a,b)=>distance(a)-distance(b)||Number(b.zoneType==='strong')-Number(a.zoneType==='strong')||keyOf(a).localeCompare(keyOf(b)))[0];
    const selected=current&&hasPendingReactionZoneSetup(keyOf(current))?current:closest;
    this.active.set(feed,selected?keyOf(selected):'');
    for(const z of zones) {
      const key=keyOf(z),strategy=z.strategy;
      // Initialize newly published levels without replaying history as signals.
      evaluateReactionZoneSignals(z.price,candles,z.zoneType,key,interval,symbol,observedAt,false,false);
      if(z!==selected) {
        suspendReactionZoneSignals(key,candles,observedAt);delete this.evaluations[key];continue;
      }
      const result=evaluateReactionZoneSignals(z.price,candles,z.zoneType,key,interval,symbol,observedAt,true,true);
      for(const signal of result.signals)if(!this.signalEvents.has(signal.id)) {
        this.signalEvents.set(signal.id,{id:signal.id,createdAt:observedAt,symbol,strategy,zoneId:z.id,signal});
      }
      if(result.activeSignal)openReactionTrade(result.activeSignal,symbol,strategy,z.id);
      const signal=result.activeSignal;
      this.evaluations[key]={...result,activeSignal:signal?.entryPrice&&!getReactionTrades().some(t=>t.symbol===symbol&&t.strategy===strategy&&t.zoneId===z.id)?null:signal};
    }
    this.publish();
  }
  refreshWeeklyResults() {this.publish();}
  snapshot() {
    return {epoch:this.epoch,sequence:this.sequence,serverTime:this.now(),evaluations:this.evaluations,trades:getReactionTrades(),weeklyResults:getWeeklyReactionResults(this.now()),events:[...this.signalEvents.values()].slice(-100)};
  }
  subscribe(listener:(snapshot:ReturnType<ReactionAuthority['snapshot']>)=>void) {
    this.events.on('state',listener);return()=>{this.events.off('state',listener);};
  }
  clear(id:string) {clearReactionTrade(id);this.publish();}
  private publish() {
    const snapshot=this.snapshot();
    const content=JSON.stringify([snapshot.evaluations,snapshot.trades,snapshot.events,snapshot.weeklyResults]);
    if(content===this.lastPublished)return;
    this.lastPublished=content;this.sequence++;
    this.events.emit('state',{...snapshot,sequence:this.sequence});
  }
}
export const reactionAuthority=new ReactionAuthority();
