import {randomUUID} from 'node:crypto';
import {EventEmitter} from 'node:events';
import {
  evaluateReactionZoneSignals, calculateAverageCandleRange, computeZoneTolerances,
  hasPendingReactionZoneSetup, suspendReactionZoneSignals, resetReactionZoneSignalState,
  type CandleData, type LineEvaluationResult,
} from '../../src/components/chart/reactionZoneSignalCalculator';
import {openReactionTrade, updateReactionTradePrice, getReactionTrades, clearReactionTrade} from './reactionTradeEngine';

export interface PublishedReactionZone {
  id:string; symbol:string; strategy:string; price:number; zoneType:'strong'|'weak';
}
export const reactionKey=(symbol:string,strategy:string,id:string)=>JSON.stringify([symbol,strategy,id]);

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
        resetReactionZoneSignalState(key); delete this.evaluations[key];
      }
    }
    this.zones=zones;
    this.publish();
  }
  seed(symbol:string,candles:CandleData[]) {
    if(this.candles.has(symbol)||candles.length<2)return;
    const ordered=[...new Map(candles.map(c=>[Number(c.time),c])).values()]
      .filter(c=>Number.isFinite(Number(c.time))&&Number(c.time)*1000<=this.now())
      .sort((a,b)=>Number(a.time)-Number(b.time));
    this.candles.set(symbol,ordered.slice(-500));
    // Initialize from history without emitting historical trades.
    for(const z of this.zones.filter(z=>z.symbol===symbol))
      evaluateReactionZoneSignals(z.price,ordered,z.zoneType,reactionKey(z.symbol,z.strategy,z.id),'5',symbol,this.now(),false,false);
  }
  observe(symbol:string,bar:CandleData,observedAt:number) {
    if(!Number.isFinite(observedAt)||observedAt>this.now()+1000||observedAt<(this.lastObservation.get(symbol)||0))return;
    const candles=this.candles.get(symbol);
    if(!candles?.length||Number(bar.time)<Number(candles.at(-1)!.time))return;
    this.lastObservation.set(symbol,observedAt);
    if(Number(bar.time)===Number(candles.at(-1)!.time))candles[candles.length-1]={...bar};
    else candles.push({...bar});
    if(candles.length>500)candles.shift();
    updateReactionTradePrice(symbol,bar.close,observedAt);
    const groups=new Map<string,PublishedReactionZone[]>();
    for(const z of this.zones.filter(z=>z.symbol===symbol)) {
      const group=groups.get(z.strategy)||[];group.push(z);groups.set(z.strategy,group);
    }
    const range=calculateAverageCandleRange(candles,20);
    for(const [strategy,zones] of groups) {
      const groupKey=JSON.stringify([symbol,strategy]);
      const closest=[...zones].sort((a,b)=>Math.abs(a.price-bar.close)-Math.abs(b.price-bar.close))[0];
      const threshold=Math.max(computeZoneTolerances(closest.price,range).touchTolerance*3,range);
      const selected=Math.abs(closest.price-bar.close)<=threshold*(this.active.get(groupKey)===closest.id?1.2:1)?closest.id:'';
      this.active.set(groupKey,selected);
      for(const z of zones) {
        const key=reactionKey(symbol,strategy,z.id), active=z.id===selected;
        if(!active&&!hasPendingReactionZoneSetup(key)) {
          suspendReactionZoneSignals(key,candles);delete this.evaluations[key];continue;
        }
        const result=evaluateReactionZoneSignals(z.price,candles,z.zoneType,key,'5',symbol,observedAt,true,active);
        for(const signal of result.signals)if(!this.signalEvents.has(signal.id)) {
          this.signalEvents.set(signal.id,{id:signal.id,createdAt:observedAt,symbol,strategy,zoneId:z.id,signal});
        }
        if(result.activeSignal)openReactionTrade(result.activeSignal,symbol,strategy,z.id);
        const signal=result.activeSignal;
        if(active)this.evaluations[key]={...result,activeSignal:signal?.entryPrice&&!getReactionTrades().some(t=>t.symbol===symbol&&t.strategy===strategy&&t.zoneId===z.id)?null:signal};
        else delete this.evaluations[key];
      }
    }
    this.publish();
  }
  snapshot() {
    return {epoch:this.epoch,sequence:this.sequence,serverTime:this.now(),evaluations:this.evaluations,trades:getReactionTrades(),events:[...this.signalEvents.values()].slice(-100)};
  }
  subscribe(listener:(snapshot:ReturnType<ReactionAuthority['snapshot']>)=>void) {
    this.events.on('state',listener);return()=>{this.events.off('state',listener);};
  }
  clear(id:string) {clearReactionTrade(id);this.publish();}
  private publish() {
    const snapshot=this.snapshot();
    const content=JSON.stringify([snapshot.evaluations,snapshot.trades,snapshot.events]);
    if(content===this.lastPublished)return;
    this.lastPublished=content;this.sequence++;
    this.events.emit('state',{...snapshot,sequence:this.sequence});
  }
}
export const reactionAuthority=new ReactionAuthority();
